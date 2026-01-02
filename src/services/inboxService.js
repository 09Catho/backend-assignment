const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Get inboxes available to operator (subscribed inboxes)
 */
const getOperatorInboxes = async (operatorId, tenantId) => {
  const result = await db.query(
    `SELECT 
      i.id,
      i.tenant_id,
      i.phone_number,
      i.display_name,
      i.created_at,
      i.updated_at,
      ois.created_at as subscribed_at,
      COUNT(c.id) FILTER (WHERE c.state = 'QUEUED') as queued_count,
      COUNT(c.id) FILTER (WHERE c.state = 'ALLOCATED') as allocated_count,
      COUNT(c.id) FILTER (WHERE c.state = 'RESOLVED' AND c.resolved_at >= NOW() - INTERVAL '24 hours') as resolved_today
     FROM inboxes i
     JOIN operator_inbox_subscriptions ois ON i.id = ois.inbox_id
     LEFT JOIN conversations c ON i.id = c.inbox_id
     WHERE ois.operator_id = $1 AND i.tenant_id = $2
     GROUP BY i.id, ois.created_at
     ORDER BY i.display_name`,
    [operatorId, tenantId]
  );

  logger.info('Retrieved operator inboxes', {
    operatorId,
    tenantId,
    count: result.rows.length,
  });

  return result.rows;
};

/**
 * Get all inboxes for a tenant (Admin/Manager only)
 */
const getAllInboxes = async (tenantId) => {
  const result = await db.query(
    `SELECT 
      i.*,
      COUNT(DISTINCT ois.operator_id) as subscribed_operators,
      COUNT(c.id) FILTER (WHERE c.state = 'QUEUED') as queued_count,
      COUNT(c.id) FILTER (WHERE c.state = 'ALLOCATED') as allocated_count
     FROM inboxes i
     LEFT JOIN operator_inbox_subscriptions ois ON i.id = ois.inbox_id
     LEFT JOIN conversations c ON i.id = c.inbox_id
     WHERE i.tenant_id = $1
     GROUP BY i.id
     ORDER BY i.display_name`,
    [tenantId]
  );

  return result.rows;
};

module.exports = {
  getOperatorInboxes,
  getAllInboxes,
};
