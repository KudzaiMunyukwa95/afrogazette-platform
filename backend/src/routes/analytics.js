const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Client = require('../models/Client');

// Get dashboard overview stats
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    // Build queries based on role
    let salesQuery, revenueQuery, commissionQuery, clientsQuery;

    if (isAdmin) {
      // Admin sees all data
      salesQuery = query(`
        SELECT 
          COUNT(*) as total_sales,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_sales,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_sales,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_sales
        FROM sales
      `);

      revenueQuery = query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COALESCE(AVG(amount), 0) as avg_sale_amount
        FROM sales
        WHERE status = 'approved'
      `);

      commissionQuery = query(`
        SELECT 
          COALESCE(SUM(commission_amount), 0) as total_commissions_earned,
          COALESCE(SUM(cp.amount), 0) as total_commissions_paid
        FROM sales s
        LEFT JOIN commission_payments cp ON s.journalist_id = cp.journalist_id
        WHERE s.status = 'approved'
      `);

      clientsQuery = query(`
        SELECT COUNT(*) as total_clients FROM clients
      `);
    } else {
      // Journalist sees only their data
      salesQuery = query(`
        SELECT 
          COUNT(*) as total_sales,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_sales,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_sales,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_sales
        FROM sales
        WHERE journalist_id = $1
      `, [userId]);

      revenueQuery = query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COALESCE(AVG(amount), 0) as avg_sale_amount
        FROM sales
        WHERE journalist_id = $1 AND status = 'approved'
      `, [userId]);

      commissionQuery = query(`
        SELECT 
          COALESCE(SUM(s.commission_amount), 0) as total_commissions_earned,
          COALESCE(SUM(cp.amount), 0) as total_commissions_paid
        FROM sales s
        LEFT JOIN commission_payments cp ON s.journalist_id = cp.journalist_id
        WHERE s.journalist_id = $1 AND s.status = 'approved'
      `, [userId]);

      clientsQuery = query(`
        SELECT COUNT(*) as total_clients FROM clients WHERE added_by = $1
      `, [userId]);
    }

    // Execute all queries in parallel
    const [salesResult, revenueResult, commissionResult, clientsResult] = await Promise.all([
      salesQuery,
      revenueQuery,
      commissionQuery,
      clientsQuery
    ]);

    const stats = {
      sales: {
        total: parseInt(salesResult.rows[0].total_sales),
        pending: parseInt(salesResult.rows[0].pending_sales),
        approved: parseInt(salesResult.rows[0].approved_sales),
        rejected: parseInt(salesResult.rows[0].rejected_sales)
      },
      revenue: {
        total: parseFloat(revenueResult.rows[0].total_revenue),
        average: parseFloat(revenueResult.rows[0].avg_sale_amount)
      },
      commissions: {
        earned: parseFloat(commissionResult.rows[0].total_commissions_earned),
        paid: parseFloat(commissionResult.rows[0].total_commissions_paid),
        unpaid: parseFloat(commissionResult.rows[0].total_commissions_earned) - 
                parseFloat(commissionResult.rows[0].total_commissions_paid)
      },
      clients: {
        total: parseInt(clientsResult.rows[0].total_clients)
      }
    };

    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

// Get revenue trend data for charts
router.get('/revenue-trend', authMiddleware, async (req, res, next) => {
  try {
    const { period = 'month', months = 12 } = req.query;
    const isJournalist = req.user.role === 'journalist';

    let dateFormat, dateTrunc;
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        dateTrunc = 'day';
        break;
      case 'week':
        dateFormat = 'YYYY-IW';
        dateTrunc = 'week';
        break;
      case 'month':
      default:
        dateFormat = 'YYYY-MM';
        dateTrunc = 'month';
    }

    let queryText = `
      SELECT 
        TO_CHAR(DATE_TRUNC('${dateTrunc}', payment_date), '${dateFormat}') as period,
        DATE_TRUNC('${dateTrunc}', payment_date) as period_date,
        COUNT(*) as sales_count,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(commission_amount), 0) as commission
      FROM sales
      WHERE status = 'approved'
        AND payment_date >= CURRENT_DATE - INTERVAL '${months} months'
    `;

    const params = [];
    if (isJournalist) {
      queryText += ' AND journalist_id = $1';
      params.push(req.user.userId);
    }

    queryText += ' GROUP BY period, period_date ORDER BY period_date DESC';

    const result = await query(queryText, params);

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get sales by ad type (for pie chart)
router.get('/sales-by-ad-type', authMiddleware, async (req, res, next) => {
  try {
    const isJournalist = req.user.role === 'journalist';

    let queryText = `
      SELECT 
        ad_type as name,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as value
      FROM sales
      WHERE status = 'approved'
    `;

    const params = [];
    if (isJournalist) {
      queryText += ' AND journalist_id = $1';
      params.push(req.user.userId);
    }

    queryText += ' GROUP BY ad_type ORDER BY value DESC';

    const result = await query(queryText, params);

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get sales by payment method
router.get('/sales-by-payment-method', authMiddleware, async (req, res, next) => {
  try {
    const isJournalist = req.user.role === 'journalist';

    let queryText = `
      SELECT 
        payment_method as name,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as value
      FROM sales
      WHERE status = 'approved'
    `;

    const params = [];
    if (isJournalist) {
      queryText += ' AND journalist_id = $1';
      params.push(req.user.userId);
    }

    queryText += ' GROUP BY payment_method ORDER BY value DESC';

    const result = await query(queryText, params);

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get top performing journalists leaderboard (Admin only)
router.get('/leaderboard', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    let dateFilter = '';
    if (period !== 'all') {
      const months = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
      dateFilter = `AND s.payment_date >= CURRENT_DATE - INTERVAL '${months} months'`;
    }

    const result = await query(`
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.amount), 0) as total_revenue,
        COALESCE(SUM(s.commission_amount), 0) as total_commission,
        COALESCE(AVG(s.amount), 0) as avg_sale_amount,
        COUNT(DISTINCT s.client_id) as unique_clients
      FROM users u
      LEFT JOIN sales s ON u.id = s.journalist_id AND s.status = 'approved' ${dateFilter}
      WHERE u.role = 'journalist'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY total_revenue DESC
      LIMIT $1
    `, [limit]);

    res.json({ leaderboard: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get top clients by revenue (Admin only)
router.get('/top-clients', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(`
      SELECT 
        c.id,
        c.client_name,
        c.phone_number,
        c.email,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.amount), 0) as total_revenue,
        MAX(s.payment_date) as last_sale_date
      FROM clients c
      INNER JOIN sales s ON c.id = s.client_id
      WHERE s.status = 'approved'
      GROUP BY c.id, c.client_name, c.phone_number, c.email
      ORDER BY total_revenue DESC
      LIMIT $1
    `, [limit]);

    res.json({ topClients: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get recent sales activity
router.get('/recent-sales', authMiddleware, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const isJournalist = req.user.role === 'journalist';

    let queryText = `
      SELECT 
        s.id,
        s.amount,
        s.payment_date,
        s.ad_type,
        s.status,
        s.created_at,
        c.client_name,
        u.first_name || ' ' || u.last_name as journalist_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.journalist_id = u.id
      WHERE 1=1
    `;

    const params = [];
    if (isJournalist) {
      queryText += ' AND s.journalist_id = $1';
      params.push(req.user.userId);
    }

    queryText += ' ORDER BY s.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(queryText, params);

    res.json({ recentSales: result.rows });
  } catch (error) {
    next(error);
  }
});

// Export data to CSV (Admin only)
router.get('/export/sales', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { start_date, end_date, status } = req.query;

    let queryText = `
      SELECT 
        s.id,
        s.created_at,
        s.payment_date,
        c.client_name,
        c.phone_number as client_phone,
        u.first_name || ' ' || u.last_name as journalist,
        s.amount,
        s.commission_amount,
        s.payment_method,
        s.ad_type,
        s.status,
        s.description
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.journalist_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

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

    if (status) {
      queryText += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ' ORDER BY s.created_at DESC';

    const result = await query(queryText, params);

    // Convert to CSV
    const headers = ['ID', 'Created At', 'Payment Date', 'Client', 'Phone', 'Journalist', 
                     'Amount', 'Commission', 'Payment Method', 'Ad Type', 'Status', 'Description'];
    
    let csv = headers.join(',') + '\n';
    
    result.rows.forEach(row => {
      const values = [
        row.id,
        new Date(row.created_at).toISOString(),
        new Date(row.payment_date).toISOString(),
        `"${row.client_name || ''}"`,
        row.client_phone || '',
        `"${row.journalist || ''}"`,
        row.amount,
        row.commission_amount,
        row.payment_method,
        row.ad_type,
        row.status,
        `"${(row.description || '').replace(/"/g, '""')}"`
      ];
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-export.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
