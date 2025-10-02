const { validationResult } = require('express-validator');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let error = {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    status: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: err.details || err.message
    };
  } else if (err.name === 'CastError') {
    error = {
      message: 'Invalid ID format',
      code: 'INVALID_ID',
      status: 400
    };
  } else if (err.code === '23505') { // PostgreSQL unique violation
    error = {
      message: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
      status: 409
    };
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    error = {
      message: 'Referenced resource not found',
      code: 'FOREIGN_KEY_ERROR',
      status: 400
    };
  } else if (err.code === '23502') { // PostgreSQL not null violation
    error = {
      message: 'Required field missing',
      code: 'REQUIRED_FIELD_MISSING',
      status: 400
    };
  } else if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      status: 401
    };
  } else if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      status: 401
    };
  } else if (err.status) {
    // Custom error with status
    error = {
      message: err.message,
      code: err.code || 'CUSTOM_ERROR',
      status: err.status
    };
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found handler
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

module.exports = {
  errorHandler,
  handleValidationErrors,
  asyncHandler,
  AppError,
  notFound
};