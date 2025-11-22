const { query } = require('../config/database');

class Client {
  // Create new client
  static async create(clientData) {
    const { client_name, contact_person, phone_number, email, address, added_by } = clientData;

    const result = await query(
      `INSERT INTO clients (client_name, contact_person, phone_number, email, address, added_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_name, contact_person, phone_number, email, address, added_by]
    );

    return result.rows[0];
  }

  // Find client by ID
  static async findById(id) {
    const result = await query(
      `SELECT c.*, 
        u.first_name || ' ' || u.last_name as added_by_name
       FROM clients c
       LEFT JOIN users u ON c.added_by = u.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get all clients with search
  static async findAll(search = '') {
    let queryText = `
      SELECT c.*,
        u.first_name || ' ' || u.last_name as added_by_name,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.amount), 0) as total_revenue
      FROM clients c
      LEFT JOIN users u ON c.added_by = u.id
      LEFT JOIN sales s ON c.id = s.client_id AND s.status = 'approved'
    `;

    const params = [];

    if (search) {
      queryText += ` WHERE 
        c.client_name ILIKE $1 OR 
        c.contact_person ILIKE $1 OR 
        c.phone_number ILIKE $1 OR
        c.email ILIKE $1`;
      params.push(`%${search}%`);
    }

    queryText += `
      GROUP BY c.id, u.first_name, u.last_name
      ORDER BY c.created_at DESC
    `;

    const result = await query(queryText, params);
    return result.rows;
  }

  // Update client
  static async update(id, clientData) {
    const { client_name, contact_person, phone_number, email, address } = clientData;

    const result = await query(
      `UPDATE clients
       SET client_name = $1, contact_person = $2, phone_number = $3, email = $4, address = $5
       WHERE id = $6
       RETURNING *`,
      [client_name, contact_person, phone_number, email, address, id]
    );

    return result.rows[0];
  }

  // Delete client
  static async delete(id) {
    const result = await query(
      'DELETE FROM clients WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  // Get client statistics
  static async getStats() {
    const result = await query(
      `SELECT 
        COUNT(*) as total_clients,
        COUNT(DISTINCT s.client_id) as clients_with_sales,
        AVG(client_sales.total_amount) as avg_revenue_per_client
       FROM clients c
       LEFT JOIN sales s ON c.id = s.client_id AND s.status = 'approved'
       LEFT JOIN (
         SELECT client_id, SUM(amount) as total_amount
         FROM sales
         WHERE status = 'approved'
         GROUP BY client_id
       ) client_sales ON c.id = client_sales.client_id`
    );
    return result.rows[0];
  }

  // Get top clients by revenue
  static async getTopClients(limit = 10) {
    const result = await query(
      `SELECT c.id, c.client_name, c.phone_number,
        COUNT(s.id) as total_sales,
        SUM(s.amount) as total_revenue
       FROM clients c
       INNER JOIN sales s ON c.id = s.client_id
       WHERE s.status = 'approved'
       GROUP BY c.id, c.client_name, c.phone_number
       ORDER BY total_revenue DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Check if client has any sales
  static async hasSales(id) {
    const result = await query(
      'SELECT COUNT(*) as count FROM sales WHERE client_id = $1',
      [id]
    );
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = Client;
