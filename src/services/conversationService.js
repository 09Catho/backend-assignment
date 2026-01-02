const db = require('../config/database');
const config = require('../config/index');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const orchestratorService = require('./orchestratorService');

/**
 * Get conversations with cursor-based pagination
 */
const getConversations = async (filters) => {
  const {
    limit = config.pagination.defaultLimit,
    cursor,
    inbox_id,
    state,
    operator_id,
    label_id,
    sort = 'priority',
  } = filters;

  let query = `
    SELECT c.*,
      i.display_name as inbox_name,
      o.name as operator_name,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', l2.id, 'name', l2.name, 'color', l2.color))
          FROM conversation_labels cl2
          JOIN labels l2 ON cl2.label_id = l2.id
          WHERE cl2.conversation_id = c.id
        ), 
        '[]'
      ) as labels
    FROM conversations c
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    LEFT JOIN operators o ON c.assigned_operator_id = o.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  // Apply filters
  if (inbox_id) {
    query += ` AND c.inbox_id = $${paramCount}`;
    params.push(inbox_id);
    paramCount++;
  }

  if (state) {
    query += ` AND c.state = $${paramCount}`;
    params.push(state);
    paramCount++;
  }

  if (operator_id) {
    query += ` AND c.assigned_operator_id = $${paramCount}`;
    params.push(operator_id);
    paramCount++;
  }

  if (label_id) {
    query += ` AND EXISTS (
      SELECT 1 FROM conversation_labels cl2 
      WHERE cl2.conversation_id = c.id AND cl2.label_id = $${paramCount}
    )`;
    params.push(label_id);
    paramCount++;
  }

  // Apply cursor for pagination
  if (cursor) {
    if (sort === 'priority') {
      // Cursor format: priority_score|last_message_at|id
      const [cursorScore, cursorTime, cursorId] = cursor.split('|');
      query += ` AND (
        c.priority_score < $${paramCount} OR 
        (c.priority_score = $${paramCount} AND c.last_message_at < $${paramCount + 1}) OR
        (c.priority_score = $${paramCount} AND c.last_message_at = $${paramCount + 1} AND c.id > $${paramCount + 2})
      )`;
      params.push(parseFloat(cursorScore), cursorTime, parseInt(cursorId));
      paramCount += 3;
    } else {
      // For newest/oldest, cursor is just the ID
      const cursorId = parseInt(cursor);
      if (sort === 'newest') {
        query += ` AND c.id < $${paramCount}`;
      } else {
        query += ` AND c.id > $${paramCount}`;
      }
      params.push(cursorId);
      paramCount++;
    }
  }

  // Apply sorting
  if (sort === 'priority') {
    query += ` ORDER BY c.priority_score DESC, c.last_message_at DESC, c.id ASC`;
  } else if (sort === 'newest') {
    query += ` ORDER BY c.last_message_at DESC, c.id DESC`;
  } else {
    query += ` ORDER BY c.last_message_at ASC, c.id ASC`;
  }

  // Apply limit
  query += ` LIMIT $${paramCount}`;
  params.push(limit + 1); // Fetch one extra to determine if there are more results

  const result = await db.query(query, params);

  // Determine if there are more results
  const hasMore = result.rows.length > limit;
  const conversations = hasMore ? result.rows.slice(0, limit) : result.rows;

  // Generate next cursor
  let nextCursor = null;
  if (hasMore) {
    const lastConv = conversations[conversations.length - 1];
    if (sort === 'priority') {
      nextCursor = `${lastConv.priority_score}|${lastConv.last_message_at}|${lastConv.id}`;
    } else {
      nextCursor = lastConv.id.toString();
    }
  }

  return {
    conversations,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
};

/**
 * Auto-assign the next highest priority conversation to an operator
 * This is the bread and butter of the allocation system
 */
const allocateConversation = async (operatorId) => {
  return await db.transaction(async (dbClient) => {
    // First, let's make sure this operator is actually online and ready to work
    const operatorStatus = await dbClient.query(
      `SELECT status FROM operator_status WHERE operator_id = $1`,
      [operatorId]
    );

    if (operatorStatus.rows.length === 0 || operatorStatus.rows[0].status !== 'AVAILABLE') {
      throw new AppError('Operator is not available', 400);
    }

    // Find out which inboxes this operator can handle
    const subscribedInboxes = await dbClient.query(
      `SELECT inbox_id FROM operator_inbox_subscriptions WHERE operator_id = $1`,
      [operatorId]
    );

    if (subscribedInboxes.rows.length === 0) {
      throw new AppError('Operator is not subscribed to any inbox', 400);
    }

    const availableInboxes = subscribedInboxes.rows.map(row => row.inbox_id);

    // We need to know how this company calculates priority scores
    const companySettings = await dbClient.query(
      `SELECT o.tenant_id, t.priority_alpha, t.priority_beta
       FROM operators o
       JOIN tenants t ON o.tenant_id = t.id
       WHERE o.id = $1`,
      [operatorId]
    );

    if (companySettings.rows.length === 0) {
      throw new AppError('Operator not found', 404);
    }

    const { tenant_id } = companySettings.rows[0];

    // Now let's find the most urgent conversation that needs attention
    // We limit this to avoid performance issues with huge datasets
    const availableConversations = await dbClient.query(
      `SELECT c.id
       FROM conversations c
       WHERE c.state = 'QUEUED'
         AND c.tenant_id = $1
         AND c.inbox_id = ANY($2)
       ORDER BY c.priority_score DESC, c.last_message_at DESC
       LIMIT ${config.pagination.maxConversationFetch}
       FOR UPDATE SKIP LOCKED`,
      [tenant_id, availableInboxes]
    );

    if (availableConversations.rows.length === 0) {
      return null; // Nothing to assign right now
    }

    const bestConversationId = availableConversations.rows[0].id;

    // Great! Let's assign this conversation to our operator
    const allocationResult = await dbClient.query(
      `UPDATE conversations
       SET state = 'ALLOCATED',
           assigned_operator_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [operatorId, bestConversationId]
    );

    // Keep track of what happened for reporting and debugging
    logger.info('Conversation allocated', {
      conversationId: bestConversationId,
      operatorId,
    });

    return allocationResult.rows[0];
  });
};

/**
 * Let managers and admins manually assign conversations to operators
 * This is super useful for load balancing and skill-based routing
 */
const managerAllocateConversation = async (whoToAssignTo, whichConversation, whoIsAsking) => {
  return await db.transaction(async (dbClient) => {
    // First things first - make sure this person can actually do this
    const allowedRoles = ['MANAGER', 'ADMIN'];
    if (!allowedRoles.includes(whoIsAsking)) {
      throw new AppError('Only managers and admins can allocate conversations to operators', 403);
    }

    // Let's check if the operator we want to assign to actually exists and is online
    const operatorLookup = await dbClient.query(
      `SELECT o.id, o.tenant_id, os.status
       FROM operators o
       LEFT JOIN operator_status os ON o.id = os.operator_id
       WHERE o.id = $1`,
      [whoToAssignTo]
    );

    if (operatorLookup.rows.length === 0) {
      throw new AppError('Target operator not found', 404);
    }

    const operatorInfo = operatorLookup.rows[0];

    // Can't assign to someone who's offline - that would be weird
    if (!operatorInfo.status || operatorInfo.status !== 'AVAILABLE') {
      throw new AppError('Target operator is not available', 400);
    }

    // Now let's grab the conversation and make sure it's actually available to assign
    const conversationLookup = await dbClient.query(
      `SELECT c.*, i.tenant_id as inbox_tenant_id
       FROM conversations c
       JOIN inboxes i ON c.inbox_id = i.id
       WHERE c.id = $1
       FOR UPDATE`,
      [whichConversation]
    );

    if (conversationLookup.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    const conversationInfo = conversationLookup.rows[0];

    // Security check - can't assign across different companies/tenants
    if (conversationInfo.inbox_tenant_id !== operatorInfo.tenant_id) {
      throw new AppError('Operator and conversation must be in the same tenant', 400);
    }

    // Make sure the conversation is actually waiting to be assigned
    if (conversationInfo.state !== 'QUEUED') {
      throw new AppError(`Conversation is not in QUEUED state (current: ${conversationInfo.state})`, 400);
    }

    // Double-check that this operator can actually handle this inbox
    // (they need to be subscribed to it)
    const subscriptionCheck = await dbClient.query(
      `SELECT 1 FROM operator_inbox_subscriptions 
       WHERE operator_id = $1 AND inbox_id = $2`,
      [whoToAssignTo, conversationInfo.inbox_id]
    );

    if (subscriptionCheck.rows.length === 0) {
      throw new AppError('Target operator is not subscribed to this inbox', 400);
    }

    // Alright, everything looks good - let's actually do the assignment
    const assignmentResult = await dbClient.query(
      `UPDATE conversations
       SET state = 'ALLOCATED',
           assigned_operator_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [whoToAssignTo, whichConversation]
    );

    // Log this for audit purposes - managers love their reports
    logger.info('Conversation allocated by manager/admin', {
      conversationId: whichConversation,
      targetOperatorId: whoToAssignTo,
      managerRole: whoIsAsking,
    });

    return assignmentResult.rows[0];
  });
};

/**
 * Manually claim a specific conversation
 */
const claimConversation = async (operatorId, conversationId) => {
  return await db.transaction(async (client) => {
    // Verify operator is available
    const statusResult = await client.query(
      `SELECT status FROM operator_status WHERE operator_id = $1`,
      [operatorId]
    );

    if (statusResult.rows.length === 0 || statusResult.rows[0].status !== 'AVAILABLE') {
      throw new AppError('Operator is not available', 400);
    }

    // Lock conversation first (cannot use FOR UPDATE with LEFT JOIN)
    const conversationResult = await client.query(
      `SELECT * FROM conversations WHERE id = $1 FOR UPDATE`,
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    const conversation = conversationResult.rows[0];

    if (conversation.state !== 'QUEUED') {
      throw new AppError('Conversation is not available for claiming', 400);
    }

    // Check if operator is subscribed to the inbox (separate query)
    const subscriptionResult = await client.query(
      `SELECT 1 FROM operator_inbox_subscriptions 
       WHERE operator_id = $1 AND inbox_id = $2`,
      [operatorId, conversation.inbox_id]
    );

    if (subscriptionResult.rows.length === 0) {
      throw new AppError('Operator is not subscribed to this inbox', 403);
    }

    // Claim the conversation
    const updateResult = await client.query(
      `UPDATE conversations
       SET state = 'ALLOCATED',
           assigned_operator_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [operatorId, conversationId]
    );

    logger.info('Conversation claimed', {
      conversationId,
      operatorId,
    });

    return updateResult.rows[0];
  });
};

/**
 * Resolve a conversation
 */
const resolveConversation = async (conversationId, operatorId, operatorRole) => {
  return await db.transaction(async (client) => {
    // Get conversation details
    const conversationResult = await client.query(
      `SELECT assigned_operator_id, state 
       FROM conversations 
       WHERE id = $1
       FOR UPDATE`,
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    const conversation = conversationResult.rows[0];

    if (conversation.state === 'RESOLVED') {
      throw new AppError('Conversation is already resolved', 400);
    }

    // Check permissions
    const canResolve =
      ['MANAGER', 'ADMIN'].includes(operatorRole) ||
      conversation.assigned_operator_id === operatorId;

    if (!canResolve) {
      throw new AppError('Only assigned operator or manager/admin can resolve', 403);
    }

    // Resolve the conversation
    const updateResult = await client.query(
      `UPDATE conversations
       SET state = 'RESOLVED',
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [conversationId]
    );

    // Remove from grace period if exists
    await client.query(
      `DELETE FROM grace_period_assignments WHERE conversation_id = $1`,
      [conversationId]
    );

    const resolvedConversation = updateResult.rows[0];

    logger.info('Conversation resolved', {
      conversationId,
      operatorId,
    });

    // Send event to orchestrator (async, don't wait)
    orchestratorService.sendConversationEvent(
      'conversation.resolved',
      resolvedConversation.external_conversation_id,
      {
        conversation_id: conversationId,
        operator_id: operatorId,
        resolved_at: resolvedConversation.resolved_at,
      }
    ).catch(err => {
      logger.error('Failed to send resolve event to orchestrator', { error: err.message });
    });

    return resolvedConversation;
  });
};

/**
 * Deallocate a conversation back to queue
 */
const deallocateConversation = async (conversationId) => {
  return await db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE conversations
       SET state = 'QUEUED',
           assigned_operator_id = NULL,
           updated_at = NOW()
       WHERE id = $1 AND state = 'ALLOCATED'
       RETURNING *`,
      [conversationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Conversation not found or not allocated', 404);
    }

    // Remove from grace period if exists
    await client.query(
      `DELETE FROM grace_period_assignments WHERE conversation_id = $1`,
      [conversationId]
    );

    // Recalculate priority score
    await updatePriorityScore(client, conversationId);

    logger.info('Conversation deallocated', { conversationId });

    return result.rows[0];
  });
};

/**
 * Reassign conversation to another operator
 * Managers and Admins can reassign to any operator (override inbox subscription)
 * Regular operators must respect inbox subscriptions
 */
const reassignConversation = async (conversationId, newOperatorId, requestingOperatorRole) => {
  return await db.transaction(async (client) => {
    // Verify new operator exists and get their details
    const operatorResult = await client.query(
      `SELECT o.id, o.role, os.status 
       FROM operators o
       LEFT JOIN operator_status os ON o.id = os.operator_id
       WHERE o.id = $1`,
      [newOperatorId]
    );

    if (operatorResult.rows.length === 0) {
      throw new AppError('Target operator not found', 404);
    }

    const targetOperator = operatorResult.rows[0];

    // Verify new operator is available
    if (targetOperator.status !== 'AVAILABLE') {
      throw new AppError('Target operator is not available', 400);
    }

    // Check if conversation exists and get inbox
    const conversationResult = await client.query(
      `SELECT inbox_id, state FROM conversations WHERE id = $1 FOR UPDATE`,
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversationResult.rows[0].state === 'RESOLVED') {
      throw new AppError('Cannot reassign resolved conversation', 400);
    }

    const { inbox_id } = conversationResult.rows[0];

    // Only enforce inbox subscription for non-Manager/Admin roles
    // Managers and Admins can override business rules and assign to any operator
    const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(requestingOperatorRole);
    
    if (!isManagerOrAdmin) {
      // Regular operators must respect inbox subscriptions
      const subscriptionResult = await client.query(
        `SELECT 1 FROM operator_inbox_subscriptions 
         WHERE operator_id = $1 AND inbox_id = $2`,
        [newOperatorId, inbox_id]
      );

      if (subscriptionResult.rows.length === 0) {
        throw new AppError('Target operator is not subscribed to this inbox', 400);
      }
    } else {
      // Manager/Admin: Log that subscription check was bypassed
      logger.info('Inbox subscription check bypassed for Manager/Admin reassignment', {
        requestingRole: requestingOperatorRole,
        conversationId,
        newOperatorId,
        inboxId: inbox_id,
      });
    }

    // Reassign
    const updateResult = await client.query(
      `UPDATE conversations
       SET assigned_operator_id = $1,
           state = 'ALLOCATED',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newOperatorId, conversationId]
    );

    logger.info('Conversation reassigned', {
      conversationId,
      newOperatorId,
      byRole: requestingOperatorRole,
    });

    return updateResult.rows[0];
  });
};

/**
 * Move conversation to different inbox
 */
const moveConversation = async (conversationId, newInboxId, tenantId) => {
  return await db.transaction(async (client) => {
    // Verify inbox belongs to same tenant
    const inboxResult = await client.query(
      `SELECT tenant_id FROM inboxes WHERE id = $1`,
      [newInboxId]
    );

    if (inboxResult.rows.length === 0) {
      throw new AppError('Target inbox not found', 404);
    }

    if (inboxResult.rows[0].tenant_id !== tenantId) {
      throw new AppError('Cannot move conversation to different tenant', 400);
    }

    // Move conversation
    const updateResult = await client.query(
      `UPDATE conversations
       SET inbox_id = $1,
           state = 'QUEUED',
           assigned_operator_id = NULL,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newInboxId, conversationId]
    );

    if (updateResult.rows.length === 0) {
      throw new AppError('Conversation not found', 404);
    }

    // Remove labels (they're inbox-specific)
    await client.query(
      `DELETE FROM conversation_labels WHERE conversation_id = $1`,
      [conversationId]
    );

    logger.info('Conversation moved to different inbox', {
      conversationId,
      newInboxId,
    });

    return updateResult.rows[0];
  });
};

/**
 * Update priority score for a conversation
 */
const updatePriorityScore = async (client, conversationId) => {
  await client.query(
    `UPDATE conversations c
     SET priority_score = calculate_priority_score(
       c.message_count,
       c.last_message_at,
       t.priority_alpha,
       t.priority_beta
     )
     FROM tenants t
     WHERE c.tenant_id = t.id AND c.id = $1`,
    [conversationId]
  );
};

/**
 * Bulk update priority scores for all queued conversations
 */
const updateAllPriorityScores = async () => {
  const result = await db.query(
    `UPDATE conversations c
     SET priority_score = calculate_priority_score(
       c.message_count,
       c.last_message_at,
       t.priority_alpha,
       t.priority_beta
     )
     FROM tenants t
     WHERE c.tenant_id = t.id AND c.state = 'QUEUED'`
  );

  logger.info('Updated priority scores', { count: result.rowCount });
  return result.rowCount;
};

/**
 * Search conversations by phone number
 */
const searchByPhoneNumber = async (phoneNumber, tenantId) => {
  const result = await db.query(
    `SELECT c.*, i.display_name as inbox_name, o.name as operator_name
     FROM conversations c
     LEFT JOIN inboxes i ON c.inbox_id = i.id
     LEFT JOIN operators o ON c.assigned_operator_id = o.id
     WHERE c.customer_phone_number = $1 AND c.tenant_id = $2
     ORDER BY c.last_message_at DESC`,
    [phoneNumber, tenantId]
  );

  return result.rows;
};

/**
 * Get conversation by ID (for access verification)
 */
const getConversationById = async (conversationId, tenantId) => {
  const result = await db.query(
    `SELECT c.*, i.display_name as inbox_name, o.name as operator_name
     FROM conversations c
     LEFT JOIN inboxes i ON c.inbox_id = i.id
     LEFT JOIN operators o ON c.assigned_operator_id = o.id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [conversationId, tenantId]
  );

  return result.rows[0] || null;
};

module.exports = {
  getConversations,
  allocateConversation,
  managerAllocateConversation,
  claimConversation,
  resolveConversation,
  deallocateConversation,
  reassignConversation,
  moveConversation,
  updatePriorityScore,
  updateAllPriorityScores,
  searchByPhoneNumber,
  getConversationById,
};
