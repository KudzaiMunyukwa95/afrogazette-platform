const { query } = require('../config/database');

class Sale {
  // Create new sale with automatic commission calculation
  static async create(saleData) {
    const {
      client_id,
      journalist_id,
      amount,
      payment_method,
      payment_date,
      ad_type,
      description,
      proof_of_payment_url,
      commission_rate = 10.00
    } = saleData;

    // Calculate commission amount
    const commission_amount = (parseFloat(amount) * parseFloat(commission_rate)) / 100;

    const result = await query(
      `INSERT INTO sales (
        client_id, journalist_id, amount, payment_method, payment_date,
        ad_type, description, proof_of_payment_url, commission_rate, commission_amount, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        client_id,
        journalist_id,
        amount,
        payment_method,
        payment_date,
        ad_type,
        description,
        proof_of_payment_url,
        commission_rate,
        commission_amount
      ]
    );

    return result.rows[0];
  }

  // Find sale by ID with related data
  static async findById(id) {
    const result = await query(
      `SELECT s.*,
        c.client_name, c.phone_number as client_phone,
        u.first_name || ' ' || u.last_name as journalist_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
       FROM sales s
       LEFT JOIN clients c ON s.client_id = c.id
       LEFT JOIN users u ON s.journalist_id = u.id
       LEFT JOIN users approver ON s.approved_by = approver.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get all sales with filters
  static async findAll(filters = {}) {
    const { journalist_id, status, start_date, end_date, search } = filters;
    
    let queryText = `
      SELECT s.*,
        c.client_name, c.phone_number as client_phone,
        u.first_name || ' ' || u.last_name as journalist_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.journalist_id = u.id
      LEFT JOIN users approver ON s.approved_by = approver.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (journalist_id) {
      queryText += ` AND s.journalist_id = $${paramCount}`;
      params.push(journalist_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (start_date) {
      queryText += ` AND s.payment_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      queryText += ` AND s.payment_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (search) {
      queryText += ` AND (c.client_name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryText += ' ORDER BY s.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Approve sale
  static async approve(id, approver_id) {
    const result = await query(
      `UPDATE sales
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [approver_id, id]
    );
    return result.rows[0];
  }

  // Reject sale
  static async reject(id, approver_id, rejection_reason) {
    const result = await query(
      `UPDATE sales
       SET status = 'rejected',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [approver_id, rejection_reason, id]
    );
    return result.rows[0];
  }

  // Update sale
  static async update(id, saleData) {
    const {
      client_id,
      amount,
      payment_method,
      payment_date,
      ad_type,
      description,
      commission_rate
    } = saleData;

    // Recalculate commission
    const commission_amount = (parseFloat(amount) * parseFloat(commission_rate || 10)) / 100;

    const result = await query(
      `UPDATE sales
       SET client_id = $1, amount = $2, payment_method = $3,
           payment_date = $4, ad_type = $5, description = $6,
           commission_rate = $7, commission_amount = $8
       WHERE id = $9 AND status = 'pending'
       RETURNING *`,
      [client_id, amount, payment_method, payment_date, ad_type, description, commission_rate, commission_amount, id]
    );

    return result.rows[0];
  }

  // Delete sale (only if pending)
  static async delete(id) {
    const result = await query(
      "DELETE FROM sales WHERE id = $1 AND status = 'pending' RETURNING id",
      [id]
    );
    return result.rowCount > 0;
  }

  // Get sales statistics
  static async getStats(journalist_id = null) {
    let queryText = `
      SELECT 
        COUNT(*) as total_sales,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_sales,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_sales,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_sales,
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_revenue,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved'), 0) as total_commissions,
        COALESCE(AVG(amount) FILTER (WHERE status = 'approved'), 0) as avg_sale_amount
      FROM sales
    `;

    const params = [];
    if (journalist_id) {
      queryText += ' WHERE journalist_id = $1';
      params.push(journalist_id);
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }

  // Get revenue by period
  static async getRevenueByPeriod(period = 'month', journalist_id = null) {
    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
      default:
        dateFormat = 'YYYY-MM';
    }

    let queryText = `
      SELECT 
        TO_CHAR(payment_date, '${dateFormat}') as period,
        COUNT(*) as sales_count,
        SUM(amount) as total_amount,
        SUM(commission_amount) as total_commission
      FROM sales
      WHERE status = 'approved'
    `;

    const params = [];
    if (journalist_id) {
      queryText += ' AND journalist_id = $1';
      params.push(journalist_id);
    }

    queryText += ' GROUP BY period ORDER BY period DESC LIMIT 12';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Get sales by ad type
  static async getSalesByAdType(journalist_id = null) {
    let queryText = `
      SELECT 
        ad_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM sales
      WHERE status = 'approved'
    `;

    const params = [];
    if (journalist_id) {
      queryText += ' AND journalist_id = $1';
      params.push(journalist_id);
    }

    queryText += ' GROUP BY ad_type ORDER BY total_amount DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Get top journalists leaderboard
  static async getLeaderboard(limit = 10) {
    const result = await query(
      `SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        COUNT(s.id) as total_sales,
        SUM(s.amount) as total_revenue,
        SUM(s.commission_amount) as total_commission
       FROM users u
       INNER JOIN sales s ON u.id = s.journalist_id
       WHERE s.status = 'approved' AND u.role = 'journalist'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY total_revenue DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = Sale;
