const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting AfroGazette Server with Inline Routes...');
console.log('📊 Port:', PORT);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// CORS configuration
app.use(cors({
  origin: [
    'https://afrogazette-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Test database connection
const testDatabaseConnection = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No DATABASE_URL found');
      return false;
    }
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Root endpoint
app.get('/', (req, res) => {
  console.log('✅ Root endpoint hit');
  res.json({ 
    message: 'AfroGazette Backend with Inline Auth!',
    status: 'success',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /health',
      'GET /test-cors',
      'POST /api/auth/setup-admin (INLINE)',
      'POST /api/auth/login (INLINE)'
    ]
  });
});

// Health endpoint
app.get('/health', async (req, res) => {
  console.log('✅ Health endpoint hit');
  
  let dbStatus = 'not_configured';
  try {
    if (process.env.DATABASE_URL) {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error';
  }
  
  res.json({ 
    status: 'OK',
    message: 'Server healthy with inline routes',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    version: '2.0.0-inline-routes'
  });
});

// INLINE SETUP-ADMIN ROUTE
app.post('/api/auth/setup-admin', async (req, res) => {
  try {
    console.log('🔧 INLINE Setup admin endpoint hit');
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

    // Database operations
    const { Pool } = require('pg');
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Check if any users exist
    const existingUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(existingUsersResult.rows[0].count);
    
    if (userCount > 0) {
      return res.status(403).json({ 
        error: 'Setup not allowed - users already exist',
        message: 'This endpoint only works when no users exist',
        existing_user_count: userCount
      });
    }

    // Check if email already exists (extra safety)
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email already registered',
        email: email
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const createUserResult = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone_number, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, phone_number, role, is_active, created_at`,
      [first_name, last_name, email.toLowerCase(), password_hash, phone_number || null, 'admin', true]
    );

    const newUser = createUserResult.rows[0];

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'afrogazette-secret-key';
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [newUser.id]);

    console.log('✅ INLINE Admin user created successfully:', newUser.email);

    res.status(201).json({
      message: 'Admin user created successfully (INLINE)',
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at
      },
      token,
      instructions: {
        method: 'inline_route',
        next_steps: [
          'Save this token for authentication',
          'Use: Authorization: Bearer <token>',
          'Setup endpoint now disabled',
          'Use /api/auth/login for future logins'
        ]
      }
    });

  } catch (error) {
    console.error('❌ INLINE Setup admin error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      type: 'inline_route_error'
    });
  }
});

// INLINE LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 INLINE Login attempt');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required',
        received: { email: email || '[missing]', password: password ? '[provided]' : '[missing]' }
      });
    }

    // Database operations
    const { Pool } = require('pg');
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Find user
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email not found'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account disabled'
      });
    }

    // Generate token
    const JWT_SECRET = process.env.JWT_SECRET || 'afrogazette-secret-key';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    console.log('✅ INLINE Login successful:', user.email);

    res.json({
      message: 'Login successful (INLINE)',
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
    console.error('❌ INLINE Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// CORS test endpoint
app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit');
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Catch-all
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/setup-admin (INLINE)',
      'POST /api/auth/login (INLINE)'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('💥 Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Start server and test database
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🟢 SERVER STARTED WITH INLINE ROUTES!');
  console.log(`🌍 Running on port ${PORT}`);
  console.log('🧪 Testing database connection...');
  
  const dbWorking = await testDatabaseConnection();
  
  if (dbWorking) {
    console.log('🎉 Database ready - setup-admin endpoint available!');
  } else {
    console.log('⚠️ Database not connected - auth endpoints disabled');
  }
  
  console.log('🚀 Server ready for requests!');
});

server.on('error', (error) => {
  console.error('🔥 Server failed:', error);
  process.exit(1);
});

module.exports = app;
