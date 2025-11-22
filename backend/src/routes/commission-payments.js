const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Get all commission payments
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const isJournalist = req.user.role === 'journalist';

    let queryText = `
      SELECT cp.*,
        u.first_name || ' ' || u.last_name as journalist_name,
        paidby.first_name || ' ' || paidby.last_name as paid_by_name
      FROM commission_payments cp
      LEFT JOIN users u ON cp.journalist_id = u.id
      LEFT JOIN users paidby ON cp.paid_by = paidby.id
      WHERE 1=1
    `;

    const params = [];
    if (isJournalist) {
      queryText += ' AND cp.journalist_id = $1';
      params.push(req.user.userId);
    }

    queryText += ' ORDER BY cp.payment_date DESC, cp.created_at DESC';

    const result = await query(queryText, params);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get commission payment by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT cp.*,
        u.first_name || ' ' || u.last_name as journalist_name,
        paidby.first_name || ' ' || paidby.last_name as paid_by_name
       FROM commission_payments cp
       LEFT JOIN users u ON cp.journalist_id = u.id
       LEFT JOIN users paidby ON cp.paid_by = paidby.id
       WHERE cp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commission payment not found' });
    }

    const payment = result.rows[0];

    // Check permissions
    if (req.user.role === 'journalist' && payment.journalist_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

// Record new commission payment (Admin only)
router.post('/', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const {
      journalist_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes
    } = req.body;

    // Validate required fields
    if (!journalist_id || !amount || !payment_date) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['journalist_id', 'amount', 'payment_date']
      });
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if journalist exists
    const journalistCheck = await query(
      "SELECT id FROM users WHERE id = $1 AND role = 'journalist'",
      [journalist_id]
    );

    if (journalistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Journalist not found' });
    }

    // Create commission payment
    const result = await query(
      `INSERT INTO commission_payments (
        journalist_id, amount, payment_date, payment_method,
        reference_number, notes, paid_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        journalist_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        req.user.userId
      ]
    );

    res.status(201).json({
      message: 'Commission payment recorded successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update commission payment (Admin only)
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes
    } = req.body;

    // Validate required fields
    if (!amount || !payment_date) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'payment_date']
      });
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if payment exists
    const existingPayment = await query(
      'SELECT id FROM commission_payments WHERE id = $1',
      [id]
    );

    if (existingPayment.rows.length === 0) {
      return res.status(404).json({ error: 'Commission payment not found' });
    }

    // Update payment
    const result = await query(
      `UPDATE commission_payments
       SET amount = $1, payment_date = $2, payment_method = $3,
           reference_number = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [amount, payment_date, payment_method, reference_number, notes, id]
    );

    res.json({
      message: 'Commission payment updated successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete commission payment (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM commission_payments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commission payment not found' });
    }

    res.json({ message: 'Commission payment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get commission summary for a journalist
router.get('/journalist/:journalistId/summary', authMiddleware, async (req, res, next) => {
  try {
    const { journalistId } = req.params;

    // Check permissions
    if (req.user.role === 'journalist' && parseInt(journalistId) !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get total commissions earned
    const earnedResult = await query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total_earned
       FROM sales
       WHERE journalist_id = $1 AND status = 'approved'`,
      [journalistId]
    );

    // Get total commissions paid
    const paidResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM commission_payments
       WHERE journalist_id = $1`,
      [journalistId]
    );

    // Get recent payments
    const recentPayments = await query(
      `SELECT *
       FROM commission_payments
       WHERE journalist_id = $1
       ORDER BY payment_date DESC, created_at DESC
       LIMIT 10`,
      [journalistId]
    );

    const totalEarned = parseFloat(earnedResult.rows[0].total_earned);
    const totalPaid = parseFloat(paidResult.rows[0].total_paid);
    const balance = totalEarned - totalPaid;

    res.json({
      summary: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        balance: balance
      },
      recent_payments: recentPayments.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get commission statistics for all journalists (Admin only)
router.get('/stats/all-journalists', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as journalist_name,
        COALESCE(SUM(s.commission_amount), 0) as total_earned,
        COALESCE(SUM(cp.amount), 0) as total_paid,
        COALESCE(SUM(s.commission_amount), 0) - COALESCE(SUM(cp.amount), 0) as balance
      FROM users u
      LEFT JOIN sales s ON u.id = s.journalist_id AND s.status = 'approved'
      LEFT JOIN commission_payments cp ON u.id = cp.journalist_id
      WHERE u.role = 'journalist'
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COALESCE(SUM(s.commission_amount), 0) > 0
      ORDER BY balance DESC
    `);

    res.json({ statistics: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
