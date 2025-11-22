const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const salesRoutes = require('./routes/sales');
const invoiceRoutes = require('./routes/invoices');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const commissionPaymentRoutes = require('./routes/commission-payments');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 10000;

// Debug environment variables
console.log('🔧 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('PORT:', PORT);

// Define allowed origins
const allowedOrigins = [
  'https://afrogazette-frontend.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🌐 Allowed Origins:', allowedOrigins);

// SIMPLIFIED CORS Configuration - Use only cors middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.error('❌ CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization'
  ],
  optionsSuccessStatus: 200 // For legacy browser support
};

// Apply CORS middleware BEFORE other middleware
app.use(cors(corsOptions));

// Additional middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test CORS endpoint
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/commission-payments', commissionPaymentRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AfroGazette Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 CORS test: http://localhost:${PORT}/test-cors`);
});

module.exports = app;
