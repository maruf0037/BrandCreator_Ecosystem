const { poolPromise } = require('../config/db');
const returnService = require('../services/returnService');
const logger = require('../src/logger');

/**
 * POST /api/orders/:orderRef/return
 * Customer requests a return on a confirmed order.
 * Body: { items: [{ productId, qty }], reason: "optional reason" }
 */
exports.requestReturn = async (req, res) => {
  try {
    const { orderRef } = req.params;
    const { items, reason, refundMethod, cancellationType } = req.body;
    const customerEmail = req.user?.email;
    const userRole = req.user?.role || 'Customer';

    if (!customerEmail) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const pool = await poolPromise;
    const result = await returnService.requestReturn(pool, orderRef, customerEmail, items, reason, userRole, refundMethod, cancellationType);

    return res.status(201).json({
      success: true,
      message: 'Return request submitted successfully. Awaiting admin approval.',
      returnRequest: result
    });
  } catch (err) {
    logger.error('Error requesting return:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};

/**
 * GET /api/orders/:orderRef/returns
 * Customer views their return requests for an order.
 */
exports.getOrderReturns = async (req, res) => {
  try {
    const { orderRef } = req.params;
    const customerEmail = req.user?.email;

    if (!customerEmail) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const pool = await poolPromise;
    const returns = await returnService.getOrderReturns(pool, orderRef, customerEmail);

    return res.json({ success: true, items: returns });
  } catch (err) {
    logger.error('Error fetching order returns:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET /api/admin/returns
 * Admin lists all return requests. Optional query params: status, customerEmail, orderRef.
 */
exports.getAdminReturns = async (req, res) => {
  try {
    const { status, customerEmail, orderRef } = req.query;
    const pool = await poolPromise;
    const returns = await returnService.getReturnRequests(pool, { status, customerEmail, orderRef });

    return res.json({ success: true, items: returns });
  } catch (err) {
    logger.error('Error fetching admin returns:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * POST /api/admin/returns/:id/approve
 * Admin approves a return request — restores stock.
 */
exports.approveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetLedger } = req.body;
    const adminEmail = req.user?.email;

    if (!adminEmail) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const pool = await poolPromise;
    const result = await returnService.approveReturn(pool, parseInt(id, 10), adminEmail, targetLedger);

    return res.json({
      success: true,
      message: 'Return request approved. Stock restored.',
      ...result
    });
  } catch (err) {
    logger.error('Error approving return:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};

/**
 * POST /api/admin/returns/:id/reject
 * Admin rejects a return request.
 */
exports.rejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const adminEmail = req.user?.email;

    if (!adminEmail) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const pool = await poolPromise;
    const result = await returnService.rejectReturn(pool, parseInt(id, 10), adminEmail, rejectReason);

    return res.json({
      success: true,
      message: 'Return request rejected.',
      ...result
    });
  } catch (err) {
    logger.error('Error rejecting return:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};

/**
 * POST /api/admin/returns/:id/refund
 * Admin processes the final refund — updates profit breakdowns, records wallet transaction.
 */
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = req.user?.email;

    if (!adminEmail) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required.' });
    }

    const pool = await poolPromise;
    const result = await returnService.processRefund(pool, parseInt(id, 10), adminEmail);

    return res.json({
      success: true,
      message: 'Refund processed successfully. Profit breakdowns and wallet adjusted.',
      ...result
    });
  } catch (err) {
    logger.error('Error processing refund:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'SERVER_ERROR',
      message: err.message
    });
  }
};
