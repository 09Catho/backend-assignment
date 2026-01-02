const express = require('express');
const router = express.Router();
const conversationRoutes = require('./conversationRoutes');
const operatorRoutes = require('./operatorRoutes');
const labelRoutes = require('./labelRoutes');
const inboxRoutes = require('./inboxRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Conversation Allocation System API is running',
    timestamp: new Date().toISOString(),
  });
});

// API version info
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Conversation Allocation System API',
    version: '1.0.0',
    endpoints: {
      conversations: '/api/v1/conversations',
      operators: '/api/v1/operators',
      labels: '/api/v1/labels',
      inboxes: '/api/v1/inboxes',
      health: '/api/v1/health',
    },
  });
});

// Mount routes
router.use('/conversations', conversationRoutes);
router.use('/operators', operatorRoutes);
router.use('/labels', labelRoutes);
router.use('/inboxes', inboxRoutes);

module.exports = router;
