const labelService = require('../services/labelService');

/**
 * GET /api/v1/labels
 * Get all labels for an inbox
 */
const listLabels = async (req, res, next) => {
  try {
    const { inbox_id } = req.query;

    const labels = await labelService.getLabels(parseInt(inbox_id, 10));

    res.json({
      status: 'success',
      data: { labels },
      meta: {
        count: labels.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/labels
 * Create a new label
 */
const createLabel = async (req, res, next) => {
  try {
    const label = await labelService.createLabel(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Label created successfully',
      data: { label },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/labels/:label_id
 * Update a label
 */
const updateLabel = async (req, res, next) => {
  try {
    const labelId = parseInt(req.params.label_id, 10);
    const updates = req.body;

    const label = await labelService.updateLabel(labelId, updates);

    res.json({
      status: 'success',
      message: 'Label updated successfully',
      data: { label },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/labels/:label_id
 * Delete a label
 */
const deleteLabel = async (req, res, next) => {
  try {
    const labelId = parseInt(req.params.label_id, 10);

    await labelService.deleteLabel(labelId);

    res.json({
      status: 'success',
      message: 'Label deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/labels/attach
 * Attach label to conversation
 */
const attachLabel = async (req, res, next) => {
  try {
    const { conversation_id, label_id } = req.body;

    const result = await labelService.attachLabel(conversation_id, label_id);

    res.json({
      status: 'success',
      message: 'Label attached successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/labels/detach
 * Detach label from conversation
 */
const detachLabel = async (req, res, next) => {
  try {
    const { conversation_id, label_id } = req.body;

    await labelService.detachLabel(conversation_id, label_id);

    res.json({
      status: 'success',
      message: 'Label detached successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/conversations/:conversation_id/labels
 * Get labels for a conversation
 */
const getConversationLabels = async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.conversation_id, 10);

    const labels = await labelService.getConversationLabels(conversationId);

    res.json({
      status: 'success',
      data: { labels },
      meta: {
        count: labels.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  attachLabel,
  detachLabel,
  getConversationLabels,
};
