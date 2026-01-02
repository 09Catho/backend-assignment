const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('express-async-errors');

const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.env === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// Request ID middleware
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Conversation Allocation System API',
    version: '1.0.0',
    documentation: '/api/v1',
  });
});

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
