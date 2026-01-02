const inboxService = require('../services/inboxService');

/**
 * GET /api/v1/inboxes
 * List inboxes available to the authenticated operator
 */
const listInboxes = async (req, res, next) => {
  try {
    const operatorId = req.operator.id;
    const tenantId = req.operator.tenant_id;

    const inboxes = await inboxService.getOperatorInboxes(operatorId, tenantId);

    res.json({
      status: 'success',
      data: { inboxes },
      meta: {
        count: inboxes.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listInboxes,
};
