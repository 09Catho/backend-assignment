const operatorService = require('../services/operatorService');

/**
 * GET /api/v1/operators/:operator_id/status
 * Get operator status
 */
const getStatus = async (req, res, next) => {
  try {
    const operatorId = parseInt(req.params.operator_id, 10);

    const status = await operatorService.getOperatorStatus(operatorId);

    res.json({
      status: 'success',
      data: { status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/operators/:operator_id/status
 * Update operator status
 */
const updateStatus = async (req, res, next) => {
  try {
    const operatorId = parseInt(req.params.operator_id, 10);
    const { status } = req.body;

    const updatedStatus = await operatorService.updateOperatorStatus(
      operatorId,
      status
    );

    res.json({
      status: 'success',
      message: `Operator status updated to ${status}`,
      data: { status: updatedStatus },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/operators/:operator_id/inboxes
 * Get operator's subscribed inboxes
 */
const getInboxes = async (req, res, next) => {
  try {
    const operatorId = parseInt(req.params.operator_id, 10);

    const inboxes = await operatorService.getOperatorInboxes(operatorId);

    res.json({
      status: 'success',
      data: { inboxes },
      meta: {
        count: inboxes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/operators
 * Get all operators for tenant
 */
const listOperators = async (req, res, next) => {
  try {
    const tenantId = req.operator.tenant_id;

    const operators = await operatorService.getOperators(tenantId);

    res.json({
      status: 'success',
      data: { operators },
      meta: {
        count: operators.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/operators/:operator_id/stats
 * Get operator statistics
 */
const getStats = async (req, res, next) => {
  try {
    const operatorId = parseInt(req.params.operator_id, 10);

    const stats = await operatorService.getOperatorStats(operatorId);

    res.json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  updateStatus,
  getInboxes,
  listOperators,
  getStats,
};
