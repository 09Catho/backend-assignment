const express = require('express');
const router = express.Router();
const operatorController = require('../controllers/operatorController');
const { authenticate, authorize } = require('../middleware/auth');
const Joi = require('joi');
const { validate } = require('../utils/validators');

// Validation schemas
const statusSchema = Joi.object({
  status: Joi.string().valid('AVAILABLE', 'OFFLINE').required(),
});

// List all operators (Manager/Admin only)
router.get(
  '/',
  authenticate,
  authorize('MANAGER', 'ADMIN'),
  operatorController.listOperators
);

// Get operator status
router.get(
  '/:operator_id/status',
  authenticate,
  operatorController.getStatus
);

// Update operator status
router.put(
  '/:operator_id/status',
  authenticate,
  validate(statusSchema),
  operatorController.updateStatus
);

// Get operator's subscribed inboxes
router.get(
  '/:operator_id/inboxes',
  authenticate,
  operatorController.getInboxes
);

// Get operator statistics
router.get(
  '/:operator_id/stats',
  authenticate,
  operatorController.getStats
);

module.exports = router;
