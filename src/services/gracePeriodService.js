const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Clean up conversations from operators who've been offline too long
 * This runs every minute to make sure customers don't get stuck waiting
 */
const processExpiredGracePeriods = async () => {
  return await db.transaction(async (dbClient) => {
    // Look for conversations that have been waiting too long for their operator to come back
    const expiredGracePeriods = await dbClient.query(
      `SELECT gpa.conversation_id, gpa.operator_id, c.state
       FROM grace_period_assignments gpa
       JOIN conversations c ON gpa.conversation_id = c.id
       WHERE gpa.expires_at <= NOW()
       FOR UPDATE SKIP LOCKED`
    );

    if (expiredGracePeriods.rows.length === 0) {
      return { processed: 0, released: 0 }; // Nothing to do right now
    }

    const conversationsToRelease = expiredGracePeriods.rows.map(row => row.conversation_id);

    // Put these conversations back in the queue so other operators can pick them up
    const releaseResult = await dbClient.query(
      `UPDATE conversations
       SET state = 'QUEUED',
           assigned_operator_id = NULL,
           updated_at = NOW()
       WHERE id = ANY($1) AND state = 'ALLOCATED'
       RETURNING id`,
      [conversationsToRelease]
    );

    // Update their priority scores since they've been waiting even longer now
    await dbClient.query(
      `UPDATE conversations c
       SET priority_score = calculate_priority_score(
         c.message_count,
         c.last_message_at,
         t.priority_alpha,
         t.priority_beta
       )
       FROM tenants t
       WHERE c.tenant_id = t.id AND c.id = ANY($1)`,
      [conversationsToRelease]
    );

    // Clean up the grace period records since we're done with them
    await dbClient.query(
      `DELETE FROM grace_period_assignments WHERE conversation_id = ANY($1)`,
      [conversationsToRelease]
    );

    const howManyWeProcessed = expiredGracePeriods.rows.length;
    const howManyWeReleased = releaseResult.rows.length;

    // Log what we did for monitoring and debugging
    logger.info('Processed expired grace periods', {
      processed: howManyWeProcessed,
      released: howManyWeReleased,
      conversationIds: releaseResult.rows.map(row => row.id),
    });

    return { processed: howManyWeProcessed, released: howManyWeReleased };
  });
};

/**
 * Get all active grace period assignments
 */
const getActiveGracePeriods = async () => {
  const result = await db.query(
    `SELECT gpa.*, c.external_conversation_id, o.name as operator_name,
       EXTRACT(EPOCH FROM (gpa.expires_at - NOW())) as seconds_remaining
     FROM grace_period_assignments gpa
     JOIN conversations c ON gpa.conversation_id = c.id
     JOIN operators o ON gpa.operator_id = o.id
     WHERE gpa.expires_at > NOW()
     ORDER BY gpa.expires_at ASC`
  );

  return result.rows;
};

/**
 * Get grace period status for a specific conversation
 */
const getConversationGracePeriod = async (conversationId) => {
  const result = await db.query(
    `SELECT gpa.*, o.name as operator_name,
       EXTRACT(EPOCH FROM (gpa.expires_at - NOW())) as seconds_remaining
     FROM grace_period_assignments gpa
     JOIN operators o ON gpa.operator_id = o.id
     WHERE gpa.conversation_id = $1`,
    [conversationId]
  );

  return result.rows[0] || null;
};

/**
 * Manually create grace period for a conversation
 */
const createGracePeriod = async (conversationId, operatorId, expiresAt, reason = 'MANUAL') => {
  const result = await db.query(
    `INSERT INTO grace_period_assignments 
     (conversation_id, operator_id, expires_at, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (conversation_id) 
     DO UPDATE SET 
       expires_at = $3,
       reason = $4
     RETURNING *`,
    [conversationId, operatorId, expiresAt, reason]
  );

  logger.info('Grace period created', {
    conversationId,
    operatorId,
    expiresAt,
    reason,
  });

  return result.rows[0];
};

/**
 * Cancel grace period for a conversation
 */
const cancelGracePeriod = async (conversationId) => {
  const result = await db.query(
    `DELETE FROM grace_period_assignments 
     WHERE conversation_id = $1
     RETURNING *`,
    [conversationId]
  );

  if (result.rows.length > 0) {
    logger.info('Grace period cancelled', { conversationId });
  }

  return result.rows[0] || null;
};

module.exports = {
  processExpiredGracePeriods,
  getActiveGracePeriods,
  getConversationGracePeriod,
  createGracePeriod,
  cancelGracePeriod,
};
