const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Create initial admin user (only works if no users exist)
router.post('/setup-admin', async (req, res, next) => {
  try {
    console.log('🔧 Setup admin endpoint hit');
    console.log('Body received:', req.body);

    const { first_name, last_name, email, password, phone_number } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['first_name', 'last_name', 'email', 'password'],
        received: { first_name, last_name, email, password: password ? '[PROVIDED]' : '[MISSING]' }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters',
        current_length: password.length
      });
    }

    // Check if any users already exist (security measure)
    const existingUsers = await User.findAll();
    if (existingUsers.length > 0) {
      return res.status(403).json({ 
        error: 'Setup not allowed - users already exist',
        message: 'This endpoint only works when no users exist in the system',
        existing_user_count: existingUsers.length
      });
    }

    // Check if this specific email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already registered',
        email: email
      });
    }

    // Create admin user
    console.log('✅ Creating admin user...');
    const adminUser = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone_number: phone_number || null,
      role: 'admin'
    });

    // Generate JWT token
    const token = generateToken(adminUser);

    // Update last login
    await User.updateLastLogin(adminUser.id);

    console.log('✅ Admin user created successfully:', adminUser.email);

    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: adminUser.id,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
        email: adminUser.email,
        role: adminUser.role,
        created_at: adminUser.created_at
      },
      token,
      instructions: {
        next_steps: [
          'Save this token for API authentication',
          'Use this token in Authorization header: Bearer <token>',
          'You can now create other users via POST /api/users',
          'This setup endpoint will be disabled now that users exist'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Setup admin error:', error);
    next(error);
  }
});

// Get current user info (requires authentication)
router.get('/me', async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token (simplified version)
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Get me error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    next(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    console.log('🔐 Login attempt received');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        received: { email: email || '[missing]', password: password ? '[provided]' : '[missing]' }
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email not found'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been deactivated'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Update last login
    await User.updateLastLogin(user.id);

    console.log('✅ Login successful for:', user.email);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
});

module.exports = router;
