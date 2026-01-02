const conversationService = require('../services/conversationService');
const orchestratorService = require('../services/orchestratorService');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/v1/conversations
 * List conversations with filters and pagination
 */
const listConversations = async (req, res, next) => {
  try {
    const result = await conversationService.getConversations(req.query);

    res.json({
      status: 'success',
      data: {
        conversations: result.conversations,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
      },
      meta: {
        count: result.conversations.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-assign the next highest priority conversation to an operator
 * This is the main way operators get work assigned to them
 */
const allocate = async (req, res, next) => {
  try {
    const { operator_id } = req.body;

    // Try to find and assign the best conversation for this operator
    const assignedConversation = await conversationService.allocateConversation(operator_id);

    // Sometimes there's just nothing available right now
    if (!assignedConversation) {
      return res.json({
        status: 'success',
        message: 'No conversations available for allocation',
        data: null,
      });
    }

    // Great! We found something for them to work on
    res.json({
      status: 'success',
      message: 'Conversation allocated successfully',
      data: { conversation: assignedConversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Let managers and admins assign conversations to specific operators
 * This is really handy for load balancing and skill-based routing
 */
const managerAllocate = async (req, res, next) => {
  try {
    // Pull out the details from the request
    const { operator_id, conversation_id } = req.body;
    const whoIsAsking = req.operator.role;

    // Do the actual assignment through our service
    const assignedConversation = await conversationService.managerAllocateConversation(
      operator_id,
      conversation_id,
      whoIsAsking
    );

    // Send back a nice success message
    res.json({
      status: 'success',
      message: `Conversation allocated to operator ${operator_id} successfully`,
      data: { conversation: assignedConversation },
    });
  } catch (error) {
    // Let the error handler deal with any problems
    next(error);
  }
};

/**
 * POST /api/v1/conversations/claim
 * Manually claim a specific conversation
 */
const claim = async (req, res, next) => {
  try {
    const { operator_id, conversation_id } = req.body;

    const conversation = await conversationService.claimConversation(
      operator_id,
      conversation_id
    );

    res.json({
      status: 'success',
      message: 'Conversation claimed successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/conversations/resolve
 * Mark conversation as resolved
 */
const resolve = async (req, res, next) => {
  try {
    const { conversation_id } = req.body;
    const operatorId = req.operator.id;
    const operatorRole = req.operator.role;

    const conversation = await conversationService.resolveConversation(
      conversation_id,
      operatorId,
      operatorRole
    );

    res.json({
      status: 'success',
      message: 'Conversation resolved successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/conversations/deallocate
 * Return conversation to queue
 */
const deallocate = async (req, res, next) => {
  try {
    const { conversation_id } = req.body;

    const conversation = await conversationService.deallocateConversation(
      conversation_id
    );

    res.json({
      status: 'success',
      message: 'Conversation deallocated successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/conversations/reassign
 * Reassign conversation to another operator
 */
const reassign = async (req, res, next) => {
  try {
    const { conversation_id, operator_id } = req.body;
    const requestingOperatorRole = req.operator.role;

    const conversation = await conversationService.reassignConversation(
      conversation_id,
      operator_id,
      requestingOperatorRole
    );

    res.json({
      status: 'success',
      message: 'Conversation reassigned successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/conversations/move-inbox
 * Move conversation to different inbox
 */
const moveInbox = async (req, res, next) => {
  try {
    const { conversation_id, inbox_id } = req.body;
    const tenantId = req.operator.tenant_id;

    const conversation = await conversationService.moveConversation(
      conversation_id,
      inbox_id,
      tenantId
    );

    res.json({
      status: 'success',
      message: 'Conversation moved successfully',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/conversations/search
 * Search conversations by phone number
 */
const search = async (req, res, next) => {
  try {
    const { phone_number } = req.query;
    const tenantId = req.operator.tenant_id;

    const conversations = await conversationService.searchByPhoneNumber(
      phone_number,
      tenantId
    );

    res.json({
      status: 'success',
      data: { conversations },
      meta: {
        count: conversations.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/conversations/update-priorities
 * Manually trigger priority score recalculation
 */
const updatePriorities = async (req, res, next) => {
  try {
    const count = await conversationService.updateAllPriorityScores();

    res.json({
      status: 'success',
      message: 'Priority scores updated',
      data: { updated_count: count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/conversations/:conversation_id/history
 * Get conversation message history from orchestrator
 */
const getHistory = async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.conversation_id, 10);
    const { page = 1, limit = 50 } = req.query;

    // Verify conversation exists and operator has access
    const tenantId = req.operator.tenant_id;
    const conversation = await conversationService.getConversationById(
      conversationId,
      tenantId
    );

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Fetch history from orchestrator
    const history = await orchestratorService.getConversationHistory(
      conversation.external_conversation_id,
      page,
      limit
    );

    res.json({
      status: 'success',
      data: {
        conversation_id: conversationId,
        external_conversation_id: conversation.external_conversation_id,
        messages: history.messages,
      },
      pagination: history.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/conversations/:conversation_id/contact
 * Get contact snapshot (read-only contact information)
 */
const getContactSnapshot = async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.conversation_id, 10);
    const tenantId = req.operator.tenant_id;

    // Verify conversation exists and operator has access
    const conversation = await conversationService.getConversationById(
      conversationId,
      tenantId
    );

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Return contact snapshot from conversation metadata
    // In a real system, this might fetch from a contact service
    const contactSnapshot = {
      phone_number: conversation.customer_phone_number,
      conversation_id: conversationId,
      external_conversation_id: conversation.external_conversation_id,
      first_contact_at: conversation.created_at,
      last_message_at: conversation.last_message_at,
      total_conversations: 1, // Could be enhanced to count all conversations with this phone
      note: 'Contact management is handled by external service. This is metadata only.',
    };

    res.json({
      status: 'success',
      data: { contact: contactSnapshot },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listConversations,
  allocate,
  managerAllocate,
  claim,
  resolve,
  deallocate,
  reassign,
  moveInbox,
  search,
  updatePriorities,
  getHistory,
  getContactSnapshot,
};
