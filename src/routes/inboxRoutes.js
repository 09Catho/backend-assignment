const express = require('express');
const router = express.Router();
const inboxController = require('../controllers/inboxController');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/v1/inboxes
 * List inboxes available to the authenticated operator
 * Returns inboxes the operator is subscribed to with conversation counts
 */
router.get(
  '/',
  authenticate,
  inboxController.listInboxes
);

module.exports = router;
