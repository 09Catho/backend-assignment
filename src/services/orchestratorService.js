const axios = require('axios');
const config = require('../config/index');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Proxy service for orchestrator API
 * Handles message history and delivery
 */

/**
 * Get conversation message history from orchestrator
 */
const getConversationHistory = async (conversationId, page = 1, limit = 50) => {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL;
  const orchestratorApiKey = process.env.ORCHESTRATOR_API_KEY;

  // Check if orchestrator is configured
  if (!orchestratorUrl) {
    logger.warn('Orchestrator URL not configured', { conversationId });
    throw new AppError(
      'Message history service is not configured. Please set ORCHESTRATOR_URL environment variable.',
      503
    );
  }

  try {
    logger.info('Fetching conversation history from orchestrator', {
      conversationId,
      page,
      limit,
      orchestratorUrl,
    });

    const response = await axios.get(
      `${orchestratorUrl}/conversations/${conversationId}/messages`,
      {
        params: { page, limit },
        headers: {
          'Authorization': orchestratorApiKey ? `Bearer ${orchestratorApiKey}` : undefined,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    logger.info('Successfully fetched conversation history', {
      conversationId,
      messageCount: response.data?.messages?.length || 0,
    });

    return {
      messages: response.data.messages || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: response.data.total || 0,
        has_more: response.data.has_more || false,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch conversation history from orchestrator', {
      conversationId,
      error: error.message,
      status: error.response?.status,
    });

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      throw new AppError(
        'Unable to connect to message history service. The orchestrator service may be unavailable.',
        503
      );
    }

    if (error.response?.status === 404) {
      throw new AppError('Conversation not found in message history', 404);
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new AppError('Authentication failed with message history service', 502);
    }

    // Generic error
    throw new AppError(
      `Failed to fetch message history: ${error.message}`,
      error.response?.status || 500
    );
  }
};

/**
 * Send event to orchestrator (e.g., conversation resolved)
 */
const sendConversationEvent = async (eventType, conversationId, data = {}) => {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL;
  const orchestratorApiKey = process.env.ORCHESTRATOR_API_KEY;

  // If orchestrator not configured, just log and continue
  if (!orchestratorUrl) {
    logger.info('Orchestrator not configured, skipping event', {
      eventType,
      conversationId,
    });
    return { sent: false, reason: 'not_configured' };
  }

  try {
    logger.info('Sending event to orchestrator', {
      eventType,
      conversationId,
      data,
    });

    await axios.post(
      `${orchestratorUrl}/events`,
      {
        event_type: eventType,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        data,
      },
      {
        headers: {
          'Authorization': orchestratorApiKey ? `Bearer ${orchestratorApiKey}` : undefined,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout for events
      }
    );

    logger.info('Successfully sent event to orchestrator', {
      eventType,
      conversationId,
    });

    return { sent: true };
  } catch (error) {
    // Log error but don't fail the operation
    logger.error('Failed to send event to orchestrator', {
      eventType,
      conversationId,
      error: error.message,
    });

    return { sent: false, error: error.message };
  }
};

module.exports = {
  getConversationHistory,
  sendConversationEvent,
};
