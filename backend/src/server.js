const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting AfroGazette Complete Server...');
console.log('📊 Port:', PORT);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Database connection helper
const createDatabasePool = () => {
  const { Pool } = require('pg');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
};

// Test database connection
const testDatabaseConnection = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No DATABASE_URL found');
      return false;
    }
    
    const pool = createDatabasePool();
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    await pool.end();
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
    message: 'AfroGazette Complete Backend with Authentication & Debug!',
    status: 'success',
    timestamp: new Date().toISOString(),
    version: '2.1.0-complete',
    features: [
      'CORS configured',
      'Database connection',
      'Inline authentication',
      'Debug endpoints',
      'Password reset',
      'User management'
    ],
    endpoints: [
      'GET /',
      'GET /health',
      'GET /test-cors',
      'POST /api/auth/setup-admin',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/debug/list-users',
      'POST /api/debug/reset-password'
    ]
  });
});

// Health endpoint with comprehensive checks
app.get('/health', async (req, res) => {
  console.log('✅ Health endpoint hit');
  
  let dbStatus = 'not_configured';
  let dbDetails = {};
  
  try {
    if (process.env.DATABASE_URL) {
      const pool = createDatabasePool();
      const startTime = Date.now();
      await pool.query('SELECT 1');
      const queryTime = Date.now() - startTime;
      await pool.end();
      
      dbStatus = 'connected';
      dbDetails = {
        response_time_ms: queryTime,
        ssl_enabled: process.env.NODE_ENV === 'production'
      };
    }
  } catch (error) {
    dbStatus = 'error';
    dbDetails = { error: error.message };
  }
  
  res.json({ 
    status: 'OK',
    message: 'Server healthy with complete authentication system',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    database: {
      status: dbStatus,
      ...dbDetails
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      has_jwt_secret: !!process.env.JWT_SECRET,
      has_database_url: !!process.env.DATABASE_URL
    },
    version: '2.1.0-complete'
  });
});

// CORS test endpoint
app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit');
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    cors_headers: {
      'access-control-allow-origin': res.get('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.get('Access-Control-Allow-Credentials')
    }
  });
});

// ===== AUTHENTICATION ENDPOINTS =====

// Setup initial admin user (only works when no users exist)
app.post('/api/auth/setup-admin', async (req, res) => {
  try {
    console.log('🔧 Setup admin endpoint hit');
    const { first_name, last_name, email, password, phone_number } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['first_name', 'last_name', 'email', 'password'],
        received: { 
          first_name: first_name || '[missing]', 
          last_name: last_name || '[missing]', 
          email: email || '[missing]', 
          password: password ? '[provided]' : '[missing]' 
        }
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
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const pool = createDatabasePool();

    try {
      // Check if any users exist
      const existingUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(existingUsersResult.rows[0].count);
      
      if (userCount > 0) {
        return res.status(403).json({ 
          error: 'Setup not allowed - users already exist',
          message: 'This endpoint only works when no users exist in the system',
          existing_user_count: userCount,
          suggestion: 'Use /api/auth/login instead or reset existing user password'
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
      const JWT_SECRET = process.env.JWT_SECRET || 'afrogazette-secret-key-change-in-production';
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

      console.log('✅ Admin user created successfully:', newUser.email);

      res.status(201).json({
        message: 'Admin user created successfully',
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
          next_steps: [
            'Save this token for authentication',
            'Use: Authorization: Bearer <token>',
            'Setup endpoint now disabled',
            'Use /api/auth/login for future access'
          ]
        }
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Setup admin error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      type: 'setup_admin_error'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt received');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        received: { 
          email: email || '[missing]', 
          password: password ? '[provided]' : '[missing]' 
        }
      });
    }

    // Database operations
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const pool = createDatabasePool();

    try {
      // Find user by email
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

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({ 
          error: 'Account disabled',
          message: 'Your account has been deactivated'
        });
      }

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'afrogazette-secret-key-change-in-production';
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

      console.log('✅ Login successful for:', user.email);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          last_login: new Date().toISOString()
        },
        token
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user info (requires authentication)
app.get('/api/auth/me', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'afrogazette-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const pool = createDatabasePool();
    
    try {
      const userResult = await pool.query(
        'SELECT id, first_name, last_name, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

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
        },
        token_info: {
          expires_in: '7 days',
          issued_for: decoded.email
        }
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Get me error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ===== DEBUG ENDPOINTS (Remove in production) =====

// List existing users
app.get('/api/debug/list-users', async (req, res) => {
  try {
    console.log('🔍 Debug: List users requested');
    
    const pool = createDatabasePool();
    
    try {
      const result = await pool.query(
        'SELECT id, first_name, last_name, email, role, is_active, created_at, last_login FROM users ORDER BY id'
      );
      
      res.json({
        message: 'Existing users (DEBUG ENDPOINT)',
        warning: 'This is a debug endpoint - remove in production',
        user_count: result.rows.length,
        users: result.rows,
        available_actions: [
          'POST /api/debug/reset-password - Reset user password',
          'POST /api/auth/login - Login with user credentials'
        ]
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('❌ List users error:', error);
    res.status(500).json({ 
      error: 'Failed to list users',
      message: error.message 
    });
  }
});

// Reset user password
app.post('/api/debug/reset-password', async (req, res) => {
  try {
    console.log('🔑 Debug: Password reset requested');
    const { email, new_password } = req.body;
    
    if (!email || !new_password) {
      return res.status(400).json({
        error: 'Email and new_password are required',
        example: {
          email: 'admin@afrogazette.com',
          new_password: 'NewSecurePassword123!'
        },
        requirements: 'Password must be at least 8 characters'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        current_length: new_password.length
      });
    }

    const bcrypt = require('bcrypt');
    const pool = createDatabasePool();

    try {
      // Check if user exists
      const userCheck = await pool.query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1', 
        [email.toLowerCase()]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          email: email,
          suggestion: 'Use /api/debug/list-users to see available users'
        });
      }

      const user = userCheck.rows[0];

      // Hash new password
      const password_hash = await bcrypt.hash(new_password, 10);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2', 
        [password_hash, email.toLowerCase()]
      );

      console.log(`🔑 Password reset successful for: ${email}`);

      res.json({
        message: 'Password reset successfully',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        new_password: new_password,
        next_steps: [
          'Password has been updated in database',
          'Use POST /api/auth/login with new credentials',
          'Save the JWT token for authenticated requests'
        ]
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: error.message
    });
  }
});

// ===== ERROR HANDLING =====

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      'GET / - Server info',
      'GET /health - Health check',
      'GET /test-cors - CORS test',
      'POST /api/auth/setup-admin - Create initial admin',
      'POST /api/auth/login - User login',
      'GET /api/auth/me - Current user info',
      'GET /api/debug/list-users - List all users (DEBUG)',
      'POST /api/debug/reset-password - Reset password (DEBUG)'
    ],
    documentation: 'See server root (GET /) for complete API documentation'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Unhandled Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString(),
    url: req.originalUrl
  });
});

// ===== SERVER STARTUP =====

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🟢 AFROGAZETTE COMPLETE SERVER STARTED SUCCESSFULLY!');
  console.log(`🌍 Server running on port ${PORT}`);
  console.log(`🔗 Access at: https://afrogazette-platform.onrender.com`);
  console.log('📋 Testing database connection...');
  
  const dbWorking = await testDatabaseConnection();
  
  if (dbWorking) {
    console.log('🎉 Database connected - All authentication features available!');
    console.log('📚 Available endpoints:');
    console.log('  🔧 POST /api/auth/setup-admin - Create initial admin user');
    console.log('  🔐 POST /api/auth/login - Login with credentials');
    console.log('  👤 GET /api/auth/me - Get current user info');
    console.log('  🐛 GET /api/debug/list-users - Debug: List users');
    console.log('  🔑 POST /api/debug/reset-password - Debug: Reset password');
  } else {
    console.log('⚠️ Database not connected - Authentication features disabled');
  }
  
  console.log('🚀 Server ready for requests!');
  console.log('📖 Visit GET / for complete API documentation');
});

// Server error handling
server.on('error', (error) => {
  console.error('🔥 Server failed to start:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
