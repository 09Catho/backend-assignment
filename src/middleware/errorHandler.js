const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error('Error occurred', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // PostgreSQL specific errors
  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      status: 'fail',
      message: 'Resource already exists',
      error: err.detail || err.message,
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid reference to related resource',
      error: err.detail || err.message,
    });
  }

  if (err.code === '23502') {
    // Not null violation
    return res.status(400).json({
      status: 'fail',
      message: 'Required field missing',
      error: err.detail || err.message,
    });
  }

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Unknown errors - don't leak details
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
