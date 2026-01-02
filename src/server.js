const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const db = require('./config/database');
const GracePeriodJob = require('./jobs/gracePeriodJob');

// Initialize grace period job
const gracePeriodJob = new GracePeriodJob(1); // Run every minute

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server started in ${config.env} mode on port ${config.port}`);
  logger.info(`API endpoint: http://localhost:${config.port}/api/${config.apiVersion}`);
  
  // Start background jobs
  gracePeriodJob.start();
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop background jobs
  gracePeriodJob.stop();

  // Close database connections
  try {
    await db.pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', { error: error.message });
  }

  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise,
  });
  process.exit(1);
});

module.exports = server;
