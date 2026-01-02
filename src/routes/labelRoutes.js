const express = require('express');
const router = express.Router();
const labelController = require('../controllers/labelController');
const { validate, labelSchemas } = require('../utils/validators');
const { authenticate, authorize, checkInboxAccess } = require('../middleware/auth');
const Joi = require('joi');

// List labels for an inbox
router.get(
  '/',
  authenticate,
  validate(
    Joi.object({
      inbox_id: Joi.number().integer().required(),
    }),
    'query'
  ),
  checkInboxAccess,
  labelController.listLabels
);

// Create a new label
router.post(
  '/',
  authenticate,
  validate(labelSchemas.create),
  checkInboxAccess,
  labelController.createLabel
);

// Update a label
router.put(
  '/:label_id',
  authenticate,
  validate(labelSchemas.update),
  labelController.updateLabel
);

// Delete a label
router.delete(
  '/:label_id',
  authenticate,
  labelController.deleteLabel
);

// Attach label to conversation
router.post(
  '/attach',
  authenticate,
  validate(labelSchemas.attach),
  labelController.attachLabel
);

// Detach label from conversation
router.post(
  '/detach',
  authenticate,
  validate(labelSchemas.detach),
  labelController.detachLabel
);

module.exports = router;
