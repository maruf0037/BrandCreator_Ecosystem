/**
 * Centralized Authentication & Authorization Middleware
 * 
 * This middleware provides consistent auth handling across all routes.
 * It supports:
 * 1. Passport-based authentication (for production)
 * 2. Header-based auth simulation (for development/testing only)
 * 
 * SECURITY NOTE: Header-based auth is ONLY available when NODE_ENV !== 'production'
 * In production, only Passport-based authentication is allowed.
 */

const logger = require('../logger');

/**
 * Development-only auth simulation middleware
 * WARNING: This should NEVER be enabled in production
 */
const devAuthSimulator = (req, res, next) => {
  // Only allow header-based auth in non-production environments
  if (process.env.NODE_ENV === 'production') {
    // In production, ignore x-user-* headers completely
    return next();
  }

  // In development, allow header-based auth for testing
  if (req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer',
      isDevAuth: true // Flag to indicate this is dev auth
    };
  }
  
  next();
};

/**
 * Main authentication middleware
 * Checks if user is authenticated via Passport or dev simulation
 */
const requireAuth = (req, res, next) => {
  // First try dev auth simulator (only works in non-production)
  devAuthSimulator(req, res, () => {
    // If no user set by dev auth, check Passport authentication
    if (!req.user && req.isAuthenticated && req.isAuthenticated()) {
      // User is authenticated via Passport
      return next();
    }

    if (!req.user) {
      logger.warn({
        event: 'auth.failure',
        path: req.path,
        method: req.method,
        ip: req.ip,
        message: 'Authentication required but not provided'
      });
      
      return res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Authentication required. Please log in to access this resource.' 
      });
    }

    next();
  });
};

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRole = req.user?.role || 'Customer';
      
      // Support for system roles and custom role mapping
      const effectiveRole = req.user?.effectiveRole || userRole;
      
      if (!allowedRoles.includes(effectiveRole) && !allowedRoles.includes(userRole)) {
        logger.warn({
          event: 'auth.forbidden',
          path: req.path,
          method: req.method,
          userId: req.user?.email,
          userRole,
          requiredRoles: allowedRoles,
          ip: req.ip,
          message: `Access denied: user role '${userRole}' not in allowed roles`
        });
        
        return res.status(403).json({ 
          error: 'FORBIDDEN', 
          message: `Access denied: insufficient permissions. Required roles: ${allowedRoles.join(', ')}` 
        });
      }

      next();
    });
  };
};

/**
 * Convenience middleware for admin-only routes
 */
const requireAdmin = requireRole(['SuperAdmin', 'Admin']);

/**
 * Convenience middleware for supplier routes
 */
const requireSupplier = requireRole(['SuperAdmin', 'Admin', 'Supplier']);

/**
 * Convenience middleware for any authenticated user
 */
const requireUser = requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']);

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireSupplier,
  requireUser,
  devAuthSimulator
};