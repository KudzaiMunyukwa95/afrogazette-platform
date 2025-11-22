const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Sale = require('../models/Sale');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/proof-of-payment');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Get all sales with filters
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, start_date, end_date, search } = req.query;

    const filters = { status, start_date, end_date, search };

    // Journalists can only see their own sales
    if (req.user.role === 'journalist') {
      filters.journalist_id = req.user.userId;
    }

    const sales = await Sale.findAll(filters);
    res.json({ sales });
  } catch (error) {
    next(error);
  }
});

// Get sale by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Journalists can only view their own sales
    if (req.user.role === 'journalist' && sale.journalist_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ sale });
  } catch (error) {
    next(error);
  }
});

// Create new sale with file upload
router.post('/', authMiddleware, upload.single('proof_of_payment'), async (req, res, next) => {
  try {
    const {
      client_id,
      amount,
      payment_method,
      payment_date,
      ad_type,
      description
    } = req.body;

    // Validate required fields
    if (!client_id || !amount || !payment_method || !payment_date || !ad_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['client_id', 'amount', 'payment_method', 'payment_date', 'ad_type']
      });
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Validate payment method
    const validPaymentMethods = ['Cash', 'Ecocash', 'InnBucks', 'Omari', 'Bank Transfer'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ 
        error: 'Invalid payment method',
        validOptions: validPaymentMethods
      });
    }

    // Validate ad type
    const validAdTypes = ['WhatsApp Channel', 'WhatsApp Group', 'Print', 'Radio', 'TV', 'Digital Banner'];
    if (!validAdTypes.includes(ad_type)) {
      return res.status(400).json({ 
        error: 'Invalid ad type',
        validOptions: validAdTypes
      });
    }

    // Get proof of payment URL if file was uploaded
    let proof_of_payment_url = null;
    if (req.file) {
      proof_of_payment_url = `/uploads/proof-of-payment/${req.file.filename}`;
    }

    // Create sale
    const sale = await Sale.create({
      client_id,
      journalist_id: req.user.userId,
      amount,
      payment_method,
      payment_date,
      ad_type,
      description,
      proof_of_payment_url
    });

    res.status(201).json({
      message: 'Sale created successfully and pending approval',
      sale
    });
  } catch (error) {
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    next(error);
  }
});

// Update sale (only if pending)
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_id, amount, payment_method, payment_date, ad_type, description } = req.body;

    // Check if sale exists
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check permissions
    if (req.user.role === 'journalist' && existingSale.journalist_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if sale can be updated
    if (existingSale.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending sales can be updated' });
    }

    // Validate required fields
    if (!client_id || !amount || !payment_method || !payment_date || !ad_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['client_id', 'amount', 'payment_method', 'payment_date', 'ad_type']
      });
    }

    // Update sale
    const sale = await Sale.update(id, {
      client_id,
      amount,
      payment_method,
      payment_date,
      ad_type,
      description
    });

    res.json({
      message: 'Sale updated successfully',
      sale
    });
  } catch (error) {
    next(error);
  }
});

// Approve sale (Admin only)
router.post('/:id/approve', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if sale exists
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check if sale is pending
    if (existingSale.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Sale is not pending',
        current_status: existingSale.status
      });
    }

    // Approve sale
    const sale = await Sale.approve(id, req.user.userId);

    res.json({
      message: 'Sale approved successfully',
      sale
    });
  } catch (error) {
    next(error);
  }
});

// Reject sale (Admin only)
router.post('/:id/reject', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Check if sale exists
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check if sale is pending
    if (existingSale.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Sale is not pending',
        current_status: existingSale.status
      });
    }

    // Reject sale
    const sale = await Sale.reject(id, req.user.userId, rejection_reason);

    res.json({
      message: 'Sale rejected',
      sale
    });
  } catch (error) {
    next(error);
  }
});

// Delete sale (only if pending)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if sale exists
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check permissions
    if (req.user.role === 'journalist' && existingSale.journalist_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Admin can delete any pending sale, journalist only their own
    if (existingSale.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending sales can be deleted' });
    }

    // Delete sale
    const deleted = await Sale.delete(id);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete sale' });
    }

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get sales statistics
router.get('/stats/overview', authMiddleware, async (req, res, next) => {
  try {
    const journalist_id = req.user.role === 'journalist' ? req.user.userId : null;
    const stats = await Sale.getStats(journalist_id);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

// Get revenue by period
router.get('/stats/revenue-trend', authMiddleware, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const journalist_id = req.user.role === 'journalist' ? req.user.userId : null;
    const data = await Sale.getRevenueByPeriod(period, journalist_id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Get sales by ad type
router.get('/stats/by-ad-type', authMiddleware, async (req, res, next) => {
  try {
    const journalist_id = req.user.role === 'journalist' ? req.user.userId : null;
    const data = await Sale.getSalesByAdType(journalist_id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Get leaderboard (Admin only)
router.get('/stats/leaderboard', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await Sale.getLeaderboard(parseInt(limit));
    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
