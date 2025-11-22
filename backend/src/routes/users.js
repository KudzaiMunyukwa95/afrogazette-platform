const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Get all users (Admin only)
router.get('/', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (Admin only)
router.get('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Create new user (Admin only)
router.post('/', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone_number, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['first_name', 'last_name', 'email', 'password', 'role']
      });
    }

    // Validate role
    if (!['admin', 'journalist'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either admin or journalist' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone_number,
      role
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user (Admin only)
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone_number, role, is_active } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['first_name', 'last_name', 'email', 'role']
      });
    }

    // Validate role
    if (!['admin', 'journalist'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either admin or journalist' });
    }

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and already exists
    if (email !== existingUser.email) {
      const emailExists = await User.findByEmail(email);
      if (emailExists) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // Update user
    const user = await User.update(id, {
      first_name,
      last_name,
      email,
      phone_number,
      role,
      is_active: is_active !== undefined ? is_active : true
    });

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// HARD DELETE user (Admin only) - Permanently removes from database
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ 
        error: 'Cannot delete your own account',
        details: 'You cannot delete the account you are currently logged in with'
      });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // HARD DELETE - permanently removes user from database
    const deleted = await User.delete(id);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    res.json({ 
      message: 'User permanently deleted',
      details: 'User has been completely removed from the system'
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const stats = await User.getStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
