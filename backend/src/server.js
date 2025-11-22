const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting AfroGazette Server...');
console.log('📊 Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', PORT);
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Simple CORS setup that definitely works
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

// Log all requests
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`📍 Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Essential test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'AfroGazette Backend is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: 'enabled'
  });
});

app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS test requested from origin:', req.headers.origin);
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

// Simple auth test endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt received');
  console.log('📧 Email:', req.body?.email || 'not provided');
  
  // For now, just return a test response
  if (!req.body?.email) {
    return res.status(400).json({
      error: 'Email is required',
      message: 'Backend is working but email missing'
    });
  }
  
  // Return auth failure for testing
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Backend auth endpoint is working - this is expected for test'
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /test-cors',
      'POST /api/auth/login'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('💥 Server Error:', error.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🟢 SERVER STARTED SUCCESSFULLY!');
  console.log(`🌍 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 CORS test: http://localhost:${PORT}/test-cors`);
  console.log('📋 Available routes:');
  console.log('  GET  /');
  console.log('  GET  /health');
  console.log('  GET  /test-cors');
  console.log('  POST /api/auth/login');
});

server.on('error', (error) => {
  console.error('🔥 Server failed to start:', error.message);
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

module.exports = app;
