const db = require('../config/database');
const config = require('../config/index');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * ============================================================================
 * OPERATOR SERVICE - API ENDPOINTS & USAGE
 * ============================================================================
 * 
 * This service handles operator-related operations including status management,
 * inbox subscriptions, and statistics.
 * 
 * ============================================================================
 * API ENDPOINTS
 * ============================================================================
 * 
 * 1. GET /api/v1/operators/:operator_id/status
 *    Description: Get operator status (AVAILABLE/OFFLINE)
 *    Auth: Required (X-Operator-Id header)
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/operators/1/status' `
 *        -Headers @{'X-Operator-Id'='1'} -UseBasicParsing
 * 
 * 2. PUT /api/v1/operators/:operator_id/status
 *    Description: Update operator status to AVAILABLE or OFFLINE
 *    Auth: Required (X-Operator-Id header)
 *    Body: { "status": "AVAILABLE" } or { "status": "OFFLINE" }
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/operators/1/status' `
 *        -Method PUT -Headers @{'X-Operator-Id'='1'; 'Content-Type'='application/json'} `
 *        -Body '{"status":"AVAILABLE"}' -UseBasicParsing
 * 
 * 3. GET /api/v1/operators/:operator_id/inboxes
 *    Description: Get inboxes subscribed by operator
 *    Auth: Required (X-Operator-Id header)
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/operators/1/inboxes' `
 *        -Headers @{'X-Operator-Id'='1'} -UseBasicParsing
 * 
 * 4. GET /api/v1/operators/:operator_id/stats
 *    Description: Get operator statistics (active, resolved, avg time)
 *    Auth: Required (X-Operator-Id header)
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/operators/1/stats' `
 *        -Headers @{'X-Operator-Id'='1'} -UseBasicParsing
 * 
 * 5. GET /api/v1/operators
 *    Description: List all operators in tenant (Manager/Admin only)
 *    Auth: Required (X-Operator-Id header)
 *    Role: MANAGER or ADMIN
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/operators' `
 *        -Headers @{'X-Operator-Id'='1'} -UseBasicParsing
 * 
 * ============================================================================
 * RELATED ENDPOINTS (Inboxes)
 * ============================================================================
 * 
 * 6. GET /api/v1/inboxes
 *    Description: List inboxes available to operator (NEW ENDPOINT)
 *    Auth: Required (X-Operator-Id header)
 *    PowerShell:
 *      Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/inboxes' `
 *        -Headers @{'X-Operator-Id'='1'} -UseBasicParsing
 * 
 * ============================================================================
 * EXAMPLE RESPONSES
 * ============================================================================
 * 
 * GET /operators/1/status:
 * {
 *   "status": "success",
 *   "data": {
 *     "status": {
 *       "operator_id": 1,
 *       "status": "AVAILABLE",
 *       "last_status_change_at": "2026-01-01T12:00:00Z",
 *       "name": "John Doe",
 *       "role": "OPERATOR"
 *     }
 *   }
 * }
 * 
 * GET /operators/1/inboxes:
 * {
 *   "status": "success",
 *   "data": {
 *     "inboxes": [
 *       {
 *         "id": 1,
 *         "phone_number": "+1234567890",
 *         "display_name": "Customer Support",
 *         "subscribed_at": "2026-01-01T10:00:00Z"
 *       }
 *     ]
 *   },
 *   "meta": { "count": 1 }
 * }
 * 
 * GET /operators/1/stats:
 * {
 *   "status": "success",
 *   "data": {
 *     "stats": {
 *       "active_conversations": "3",
 *       "resolved_today": "12",
 *       "resolved_this_week": "45",
 *       "avg_resolution_time_minutes": "25.5"
 *     }
 *   }
 * }
 * 
 * ============================================================================
 * GRACE PERIOD BEHAVIOR
 * ============================================================================
 * 
 * When operator status changes from AVAILABLE → OFFLINE:
 * - All ALLOCATED conversations enter grace period (15 minutes)
 * - Conversations stay assigned to operator
 * - If operator returns ONLINE within 15 min, conversations remain assigned
 * - If grace period expires, conversations return to QUEUED state
 * 
 * When operator status changes from OFFLINE → AVAILABLE:
 * - Grace period is removed
 * - Conversations remain assigned to operator
 * 
 * ============================================================================
 */

/**
 * Get operator status
 */
const getOperatorStatus = async (operatorId) => {
  const result = await db.query(
    `SELECT os.*, o.name, o.role
     FROM operator_status os
     JOIN operators o ON os.operator_id = o.id
     WHERE os.operator_id = $1`,
    [operatorId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Operator status not found', 404);
  }

  return result.rows[0];
};

/**
 * Update operator status
 */
const updateOperatorStatus = async (operatorId, status) => {
  return await db.transaction(async (client) => {
    // Get current status
    const currentResult = await client.query(
      `SELECT status FROM operator_status WHERE operator_id = $1`,
      [operatorId]
    );

    let currentStatus = null;
    if (currentResult.rows.length > 0) {
      currentStatus = currentResult.rows[0].status;
    }

    // Update status
    const result = await client.query(
      `INSERT INTO operator_status (operator_id, status, last_status_change_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (operator_id)
       DO UPDATE SET 
         status = $2,
         last_status_change_at = NOW()
       RETURNING *`,
      [operatorId, status]
    );

    // If operator is going offline, handle grace period
    if (currentStatus === 'AVAILABLE' && status === 'OFFLINE') {
      await initiateGracePeriod(client, operatorId);
    }

    // If operator is coming back online, remove grace period
    if (currentStatus === 'OFFLINE' && status === 'AVAILABLE') {
      await removeGracePeriod(client, operatorId);
    }

    logger.info('Operator status updated', {
      operatorId,
      oldStatus: currentStatus,
      newStatus: status,
    });

    return result.rows[0];
  });
};

/**
 * Initiate grace period for operator's conversations
 */
const initiateGracePeriod = async (client, operatorId) => {
  const expiresAt = new Date(Date.now() + config.gracePeriod.minutes * 60 * 1000);

  // Get all allocated conversations for this operator
  const conversationsResult = await client.query(
    `SELECT id FROM conversations 
     WHERE assigned_operator_id = $1 AND state = 'ALLOCATED'`,
    [operatorId]
  );

  if (conversationsResult.rows.length === 0) {
    return;
  }

  // Create grace period entries
  const conversationIds = conversationsResult.rows.map(row => row.id);

  for (const conversationId of conversationIds) {
    await client.query(
      `INSERT INTO grace_period_assignments 
       (conversation_id, operator_id, expires_at, reason)
       VALUES ($1, $2, $3, 'OFFLINE')
       ON CONFLICT (conversation_id) DO NOTHING`,
      [conversationId, operatorId, expiresAt]
    );
  }

  logger.info('Grace period initiated', {
    operatorId,
    conversationCount: conversationIds.length,
    expiresAt,
  });
};

/**
 * Remove grace period for operator
 */
const removeGracePeriod = async (client, operatorId) => {
  const result = await client.query(
    `DELETE FROM grace_period_assignments 
     WHERE operator_id = $1 AND reason = 'OFFLINE'
     RETURNING conversation_id`,
    [operatorId]
  );

  logger.info('Grace period removed', {
    operatorId,
    conversationCount: result.rows.length,
  });

  return result.rows.map(row => row.conversation_id);
};

/**
 * Get operator's subscribed inboxes
 */
const getOperatorInboxes = async (operatorId) => {
  const result = await db.query(
    `SELECT i.*, ois.created_at as subscribed_at
     FROM inboxes i
     JOIN operator_inbox_subscriptions ois ON i.id = ois.inbox_id
     WHERE ois.operator_id = $1
     ORDER BY i.display_name`,
    [operatorId]
  );

  return result.rows;
};

/**
 * Get all operators for a tenant
 */
const getOperators = async (tenantId) => {
  const result = await db.query(
    `SELECT o.*, os.status, os.last_status_change_at,
       COUNT(c.id) FILTER (WHERE c.state = 'ALLOCATED') as active_conversations
     FROM operators o
     LEFT JOIN operator_status os ON o.id = os.operator_id
     LEFT JOIN conversations c ON o.id = c.assigned_operator_id
     WHERE o.tenant_id = $1
     GROUP BY o.id, os.status, os.last_status_change_at
     ORDER BY o.name`,
    [tenantId]
  );

  return result.rows;
};

/**
 * Get operator statistics
 */
const getOperatorStats = async (operatorId) => {
  const result = await db.query(
    `SELECT 
       COUNT(*) FILTER (WHERE state = 'ALLOCATED') as active_conversations,
       COUNT(*) FILTER (WHERE state = 'RESOLVED' AND DATE(resolved_at) = CURRENT_DATE) as resolved_today,
       COUNT(*) FILTER (WHERE state = 'RESOLVED' AND resolved_at >= NOW() - INTERVAL '7 days') as resolved_this_week,
       AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) FILTER (WHERE state = 'RESOLVED') as avg_resolution_time_minutes
     FROM conversations
     WHERE assigned_operator_id = $1`,
    [operatorId]
  );

  return result.rows[0];
};

module.exports = {
  getOperatorStatus,
  updateOperatorStatus,
  getOperatorInboxes,
  getOperators,
  getOperatorStats,
  initiateGracePeriod,
  removeGracePeriod,
};
