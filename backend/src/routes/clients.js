const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Get all clients with optional search
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search } = req.query;
    const clients = await Client.findAll(search);
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

// Get client by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    next(error);
  }
});

// Create new client
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { client_name, contact_person, phone_number, email, address } = req.body;

    // Validate required fields
    if (!client_name || !phone_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['client_name', 'phone_number']
      });
    }

    // Validate phone number format
    if (!/^\+?[\d\s-()]+$/.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create client
    const client = await Client.create({
      client_name,
      contact_person,
      phone_number,
      email,
      address,
      added_by: req.user.userId
    });

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_name, contact_person, phone_number, email, address } = req.body;

    // Validate required fields
    if (!client_name || !phone_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['client_name', 'phone_number']
      });
    }

    // Validate phone number format
    if (!/^\+?[\d\s-()]+$/.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if client exists
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Update client
    const client = await Client.update(id, {
      client_name,
      contact_person,
      phone_number,
      email,
      address
    });

    res.json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    next(error);
  }
});

// Delete client (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if client has sales
    const hasSales = await Client.hasSales(id);
    if (hasSales) {
      return res.status(400).json({ 
        error: 'Cannot delete client with existing sales',
        details: 'This client has associated sales records. Please remove or reassign sales first.'
      });
    }

    // Delete client
    const deleted = await Client.delete(id);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete client' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get client statistics (Admin only)
router.get('/stats/overview', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const stats = await Client.getStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

// Get top clients by revenue (Admin only)
router.get('/stats/top-clients', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const topClients = await Client.getTopClients(parseInt(limit));
    res.json({ topClients });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
