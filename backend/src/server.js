const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting AfroGazette Server with Database...');
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

// Test database connection on startup
const testDatabaseConnection = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ No DATABASE_URL found - database features will be disabled');
      return false;
    }
    
    const { pool } = require('./config/database');
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
    message: 'AfroGazette Backend with Database!',
    status: 'success',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /health',
      'GET /test-cors',
      'POST /api/auth/setup-admin',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/users (requires auth)',
      'POST /api/users (requires admin)'
    ]
  });
});

// Health endpoint
app.get('/health', async (req, res) => {
  console.log('✅ Health endpoint hit');
  
  // Check database status
  let dbStatus = 'not_configured';
  try {
    if (process.env.DATABASE_URL) {
      const { pool } = require('./config/database');
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error';
  }
  
  res.json({ 
    status: 'OK',
    message: 'Server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    version: '2.0.0-with-database'
  });
});

// CORS test endpoint
app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit');
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    cors_working: true
  });
});

// Initialize database and routes
const initializeApp = async () => {
  const dbConnected = await testDatabaseConnection();
  
  if (dbConnected) {
    console.log('🔌 Loading database routes...');
    
    try {
      // Load auth routes
      const authRoutes = require('./routes/auth');
      app.use('/api/auth', authRoutes);
      console.log('✅ Auth routes loaded');
      
      // Load user routes
      const userRoutes = require('./routes/users');
      app.use('/api/users', userRoutes);
      console.log('✅ User routes loaded');
      
      console.log('🎯 Database endpoints available!');
    } catch (error) {
      console.error('❌ Failed to load database routes:', error.message);
      console.log('📝 Make sure your route files exist in the correct locations');
    }
  } else {
    console.log('⚠️ Running in minimal mode without database features');
  }
};

// Basic auth test endpoint (fallback if routes don't load)
app.post('/api/auth/test-login', (req, res) => {
  console.log('🔐 Test login endpoint hit (fallback)');
  console.log('Body:', req.body);
  
  if (!req.body.email) {
    return res.status(400).json({
      error: 'Email required',
      message: 'Backend is working but email missing'
    });
  }
  
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Test endpoint working - database routes not loaded'
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      'GET /',
      'GET /health', 
      'GET /test-cors',
      'POST /api/auth/setup-admin',
      'POST /api/auth/login',
      'GET /api/auth/me'
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

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🟢 SERVER STARTED SUCCESSFULLY!');
  console.log(`🌍 Server running on port ${PORT}`);
  console.log(`🔗 Access at: https://afrogazette-platform.onrender.com`);
  console.log('📋 Initializing database features...');
  
  // Initialize database features after server starts
  await initializeApp();
  
  console.log('🎉 Server ready for requests!');
});

server.on('error', (error) => {
  console.error('🔥 Server failed to start:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
