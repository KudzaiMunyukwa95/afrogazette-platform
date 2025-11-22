// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });

  // Handle specific error types
  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'A record with this information already exists'
    });
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  }

  if (err.code === '23502') {
    // PostgreSQL not null violation
    return res.status(400).json({
      error: 'Missing required field',
      details: 'All required fields must be provided'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: 'Authentication token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: 'Please log in again'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
