const db = require('../config/database');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new label
 */
const createLabel = async (labelData) => {
  const { inbox_id, name, color, created_by } = labelData;

  const result = await db.query(
    `INSERT INTO labels (tenant_id, inbox_id, name, color, created_by)
     SELECT i.tenant_id, $1, $2, $3, $4
     FROM inboxes i
     WHERE i.id = $1
     RETURNING *`,
    [inbox_id, name, color, created_by]
  );

  logger.info('Label created', { labelId: result.rows[0].id, name });

  return result.rows[0];
};

/**
 * Get all labels for an inbox
 */
const getLabels = async (inboxId) => {
  const result = await db.query(
    `SELECT l.*, o.name as creator_name,
       COUNT(cl.conversation_id) as conversation_count
     FROM labels l
     LEFT JOIN operators o ON l.created_by = o.id
     LEFT JOIN conversation_labels cl ON l.id = cl.label_id
     WHERE l.inbox_id = $1
     GROUP BY l.id, o.name
     ORDER BY l.name`,
    [inboxId]
  );

  return result.rows;
};

/**
 * Update a label
 */
const updateLabel = async (labelId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount}`);
    values.push(updates.name);
    paramCount++;
  }

  if (updates.color !== undefined) {
    fields.push(`color = $${paramCount}`);
    values.push(updates.color);
    paramCount++;
  }

  if (fields.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  values.push(labelId);

  const result = await db.query(
    `UPDATE labels
     SET ${fields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Label not found', 404);
  }

  logger.info('Label updated', { labelId });

  return result.rows[0];
};

/**
 * Delete a label
 */
const deleteLabel = async (labelId) => {
  return await db.transaction(async (client) => {
    // Remove all conversation associations
    await client.query(
      `DELETE FROM conversation_labels WHERE label_id = $1`,
      [labelId]
    );

    // Delete the label
    const result = await client.query(
      `DELETE FROM labels WHERE id = $1 RETURNING *`,
      [labelId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Label not found', 404);
    }

    logger.info('Label deleted', { labelId });

    return result.rows[0];
  });
};

/**
 * Attach label to conversation
 */
const attachLabel = async (conversationId, labelId) => {
  // Verify label and conversation are in the same inbox
  const verifyResult = await db.query(
    `SELECT c.inbox_id as conv_inbox, l.inbox_id as label_inbox
     FROM conversations c, labels l
     WHERE c.id = $1 AND l.id = $2`,
    [conversationId, labelId]
  );

  if (verifyResult.rows.length === 0) {
    throw new AppError('Conversation or label not found', 404);
  }

  if (verifyResult.rows[0].conv_inbox !== verifyResult.rows[0].label_inbox) {
    throw new AppError('Label and conversation must be in the same inbox', 400);
  }

  const result = await db.query(
    `INSERT INTO conversation_labels (conversation_id, label_id)
     VALUES ($1, $2)
     ON CONFLICT (conversation_id, label_id) DO NOTHING
     RETURNING *`,
    [conversationId, labelId]
  );

  logger.info('Label attached to conversation', { conversationId, labelId });

  return result.rows[0] || { conversation_id: conversationId, label_id: labelId };
};

/**
 * Detach label from conversation
 */
const detachLabel = async (conversationId, labelId) => {
  const result = await db.query(
    `DELETE FROM conversation_labels
     WHERE conversation_id = $1 AND label_id = $2
     RETURNING *`,
    [conversationId, labelId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Label attachment not found', 404);
  }

  logger.info('Label detached from conversation', { conversationId, labelId });

  return result.rows[0];
};

/**
 * Get labels for a specific conversation
 */
const getConversationLabels = async (conversationId) => {
  const result = await db.query(
    `SELECT l.*
     FROM labels l
     JOIN conversation_labels cl ON l.id = cl.label_id
     WHERE cl.conversation_id = $1
     ORDER BY l.name`,
    [conversationId]
  );

  return result.rows;
};

module.exports = {
  createLabel,
  getLabels,
  updateLabel,
  deleteLabel,
  attachLabel,
  detachLabel,
  getConversationLabels,
};
