const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { validate, conversationSchemas, searchSchema } = require('../utils/validators');
const { authenticate, authorize, checkInboxAccess } = require('../middleware/auth');

// List conversations with pagination and filters
router.get(
  '/',
  authenticate,
  validate(conversationSchemas.list, 'query'),
  checkInboxAccess,
  conversationController.listConversations
);

// Auto-allocate next conversation
router.post(
  '/allocate',
  authenticate,
  validate(conversationSchemas.allocate),
  conversationController.allocate
);

// Manager/Admin allocate conversation to specific operator
router.post(
  '/manager-allocate',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  validate(conversationSchemas.claim), // Same validation as claim
  conversationController.managerAllocate
);

// Manually claim a specific conversation
router.post(
  '/claim',
  authenticate,
  validate(conversationSchemas.claim),
  conversationController.claim
);

// Resolve a conversation
router.post(
  '/resolve',
  authenticate,
  validate(conversationSchemas.resolve),
  conversationController.resolve
);

// Deallocate conversation back to queue (Manager/Admin only)
router.post(
  '/deallocate',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  validate(conversationSchemas.deallocate),
  conversationController.deallocate
);

// Reassign conversation to another operator (Manager/Admin only)
router.post(
  '/reassign',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  validate(conversationSchemas.reassign),
  conversationController.reassign
);

// Move conversation to different inbox (Manager/Admin only)
router.post(
  '/move-inbox',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  validate(conversationSchemas.moveInbox),
  conversationController.moveInbox
);

// Search conversations by phone number
router.get(
  '/search',
  authenticate,
  validate(searchSchema, 'query'),
  conversationController.search
);

// Update priority scores (Admin only)
router.post(
  '/update-priorities',
  authenticate,
  authorize('ADMIN'),
  conversationController.updatePriorities
);

// Get conversation message history (proxy to orchestrator)
router.get(
  '/:conversation_id/history',
  authenticate,
  conversationController.getHistory
);

// Get contact snapshot
router.get(
  '/:conversation_id/contact',
  authenticate,
  conversationController.getContactSnapshot
);

module.exports = router;
