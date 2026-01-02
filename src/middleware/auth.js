const { AppError } = require('./errorHandler');
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Figure out who's making this request and make sure they're allowed to
 * In a real app we'd check JWT tokens, but for demo we just use a header
 */
const authenticate = async (req, res, next) => {
  try {
    // Look for the operator ID in the request headers
    // (In production this would come from a decoded JWT token)
    const whoIsThis = req.headers['x-operator-id'];

    if (!whoIsThis) {
      throw new AppError('Authentication required', 401);
    }

    // Go look up this person in our database
    const operatorLookup = await db.query(
      `SELECT o.*, os.status 
       FROM operators o
       LEFT JOIN operator_status os ON o.id = os.operator_id
       WHERE o.id = $1`,
      [whoIsThis]
    );

    if (operatorLookup.rows.length === 0) {
      throw new AppError('Operator not found', 404);
    }

    // Great! We know who this is - attach their info to the request
    req.operator = operatorLookup.rows[0];
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Make sure this person has the right permissions for what they're trying to do
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // This shouldn't happen if authenticate ran first, but just in case
    if (!req.operator) {
      return next(new AppError('Authentication required', 401));
    }

    // Check if their role is in the list of roles that can do this action
    if (!allowedRoles.includes(req.operator.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    // All good! Let them through
    next();
  };
};

/**
 * Check if operator has access to the inbox
 */
const checkInboxAccess = async (req, res, next) => {
  try {
    const operatorId = req.operator.id;
    const inboxId = req.query.inbox_id || req.body.inbox_id || req.params.inbox_id;

    // Admins and managers have access to all inboxes
    if (['ADMIN', 'MANAGER'].includes(req.operator.role)) {
      return next();
    }

    if (!inboxId) {
      return next();
    }

    // Check if operator is subscribed to the inbox
    const result = await db.query(
      `SELECT 1 FROM operator_inbox_subscriptions 
       WHERE operator_id = $1 AND inbox_id = $2`,
      [operatorId, inboxId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Access denied to this inbox', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if operator can manage the conversation
 */
const checkConversationAccess = async (req, res, next) => {
  try {
    const operatorId = req.operator.id;
    const conversationId = req.body.conversation_id || req.params.conversation_id;

    if (!conversationId) {
      throw new AppError('Conversation ID required', 400);
    }

    const result = await db.query(
      `SELECT assigned_operator_id, state 
       FROM conversations 
       WHERE id = $1`,
      [conversationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    const conversation = result.rows[0];

    // Admins and managers can access any conversation
    if (['ADMIN', 'MANAGER'].includes(req.operator.role)) {
      return next();
    }

    // Operators can only access their own allocated conversations
    if (conversation.assigned_operator_id !== operatorId) {
      throw new AppError('Access denied to this conversation', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  checkInboxAccess,
  checkConversationAccess,
};
