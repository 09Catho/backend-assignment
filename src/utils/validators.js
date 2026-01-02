const Joi = require('joi');

// Conversation validation schemas
const conversationSchemas = {
  list: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    cursor: Joi.string().optional(),
    inbox_id: Joi.number().integer().optional(),
    state: Joi.string().valid('QUEUED', 'ALLOCATED', 'RESOLVED').optional(),
    operator_id: Joi.number().integer().optional(),
    label_id: Joi.number().integer().optional(),
    sort: Joi.string().valid('newest', 'oldest', 'priority').default('priority'),
  }),

  allocate: Joi.object({
    operator_id: Joi.number().integer().required(),
  }),

  claim: Joi.object({
    operator_id: Joi.number().integer().required(),
    conversation_id: Joi.number().integer().required(),
  }),

  resolve: Joi.object({
    conversation_id: Joi.number().integer().required(),
  }),

  deallocate: Joi.object({
    conversation_id: Joi.number().integer().required(),
  }),

  reassign: Joi.object({
    conversation_id: Joi.number().integer().required(),
    operator_id: Joi.number().integer().required(),
  }),

  moveInbox: Joi.object({
    conversation_id: Joi.number().integer().required(),
    inbox_id: Joi.number().integer().required(),
  }),
};

// Operator validation schemas
const operatorSchemas = {
  updateStatus: Joi.object({
    operator_id: Joi.number().integer().required(),
    status: Joi.string().valid('AVAILABLE', 'OFFLINE').required(),
  }),

  getStatus: Joi.object({
    operator_id: Joi.number().integer().required(),
  }),
};

// Label validation schemas
const labelSchemas = {
  create: Joi.object({
    inbox_id: Joi.number().integer().required(),
    name: Joi.string().min(1).max(100).required(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    created_by: Joi.number().integer().required(),
  }),

  update: Joi.object({
    label_id: Joi.number().integer().required(),
    name: Joi.string().min(1).max(100).optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),

  delete: Joi.object({
    label_id: Joi.number().integer().required(),
  }),

  attach: Joi.object({
    conversation_id: Joi.number().integer().required(),
    label_id: Joi.number().integer().required(),
  }),

  detach: Joi.object({
    conversation_id: Joi.number().integer().required(),
    label_id: Joi.number().integer().required(),
  }),
};

// Search validation schema
const searchSchema = Joi.object({
  phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
});

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  validate,
  conversationSchemas,
  operatorSchemas,
  labelSchemas,
  searchSchema,
};
