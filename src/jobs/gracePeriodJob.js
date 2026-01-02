const gracePeriodService = require('../services/gracePeriodService');
const conversationService = require('../services/conversationService');
const logger = require('../config/logger');

/**
 * Background job to process expired grace periods
 * This should be run periodically (e.g., every minute)
 */
class GracePeriodJob {
  constructor(intervalMinutes = 1) {
    this.intervalMinutes = intervalMinutes;
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.timer = null;
    this.isRunning = false;
  }

  async run() {
    if (this.isRunning) {
      logger.warn('Grace period job already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting grace period job');

      // Process expired grace periods
      const result = await gracePeriodService.processExpiredGracePeriods();

      // Update priority scores for released conversations
      if (result.released > 0) {
        await conversationService.updateAllPriorityScores();
      }

      const duration = Date.now() - startTime;
      logger.info('Grace period job completed', {
        duration: `${duration}ms`,
        processed: result.processed,
        released: result.released,
      });
    } catch (error) {
      logger.error('Grace period job failed', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    if (this.timer) {
      logger.warn('Grace period job already started');
      return;
    }

    logger.info('Starting grace period job scheduler', {
      intervalMinutes: this.intervalMinutes,
    });

    // Run immediately on start
    this.run();

    // Then schedule regular runs
    this.timer = setInterval(() => {
      this.run();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Grace period job scheduler stopped');
    }
  }
}

module.exports = GracePeriodJob;
