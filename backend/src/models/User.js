const bcrypt = require('bcrypt');
const { query } = require('../config/database');

const SALT_ROUNDS = 10;

class User {
  // Create new user with hashed password
  static async create(userData) {
    const { first_name, last_name, email, password, phone_number, role } = userData;

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, phone_number, role, is_active, created_at`,
      [first_name, last_name, email.toLowerCase(), password_hash, phone_number, role]
    );

    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      `SELECT id, first_name, last_name, email, phone_number, role, is_active, created_at, last_login
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get all users
  static async findAll() {
    const result = await query(
      `SELECT id, first_name, last_name, email, phone_number, role, is_active, created_at, last_login
       FROM users
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Update user
  static async update(id, userData) {
    const { first_name, last_name, email, phone_number, role, is_active } = userData;

    const result = await query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, phone_number = $4, role = $5, is_active = $6
       WHERE id = $7
       RETURNING id, first_name, last_name, email, phone_number, role, is_active, created_at`,
      [first_name, last_name, email.toLowerCase(), phone_number, role, is_active, id]
    );

    return result.rows[0];
  }

  // HARD DELETE user - permanently removes from database
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  // Update last login timestamp
  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Change password
  static async changePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [password_hash, id]
    );

    return result.rowCount > 0;
  }

  // Get user statistics
  static async getStats() {
    const result = await query(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE role = 'journalist') as journalist_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_users
       FROM users`
    );
    return result.rows[0];
  }
}

module.exports = User;
