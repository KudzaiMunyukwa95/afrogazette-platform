const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting AfroGazette Minimal Server...');
console.log('📊 Port:', PORT);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');

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

// Root endpoint
app.get('/', (req, res) => {
  console.log('✅ Root endpoint hit');
  res.json({ 
    message: 'AfroGazette Backend is running!',
    status: 'success',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /health',
      'GET /test-cors',
      'POST /api/auth/login'
    ]
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint hit');
  res.json({ 
    status: 'OK',
    message: 'Server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0-minimal'
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

// Basic auth test endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login endpoint hit');
  console.log('Body:', req.body);
  
  // Return test response for now
  if (!req.body.email) {
    return res.status(400).json({
      error: 'Email required',
      message: 'Backend is working but email missing'
    });
  }
  
  // Simulate auth failure for testing
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Backend working - auth endpoint reachable'
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
      'POST /api/auth/login'
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🟢 SERVER STARTED SUCCESSFULLY!');
  console.log(`🌍 Server running on port ${PORT}`);
  console.log(`🔗 Access at: https://afrogazette-backend.onrender.com`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /health');
  console.log('  GET  /test-cors');
  console.log('  POST /api/auth/login');
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
