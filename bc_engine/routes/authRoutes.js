// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { devAuthSimulator } = require('../src/middleware/auth');

const router = express.Router();

// Trigger Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    const role = req.query.role || 'Customer';
    if (req.query.role) {
      req.session.oauthRole = req.query.role;
    }
    
    // Resolve callback URL dynamically; fall back to .env configured URL if host is an IP address (since Google blocks HTTP IP redirects)
    const host = req.get('host');
    const isIP = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(host);
    const callbackURL = (isIP && process.env.GOOGLE_CALLBACK_URL)
      ? process.env.GOOGLE_CALLBACK_URL
      : `${req.protocol}://${host}/auth/google/callback`;

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: role,
      callbackURL
    })(req, res, next);
  }
);

// Google OAuth callback route
router.get(
  '/google/callback',
  (req, res, next) => {
    const host = req.get('host');
    const isIP = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(host);
    const callbackURL = (isIP && process.env.GOOGLE_CALLBACK_URL)
      ? process.env.GOOGLE_CALLBACK_URL
      : `${req.protocol}://${host}/auth/google/callback`;

    passport.authenticate('google', { 
      failureRedirect: '/login',
      callbackURL
    })(req, res, next);
  },
  authController.googleCallback
);

// Fetch current logged in user details
// devAuthSimulator allows x-user-* headers to set req.user in non-production
router.get('/current-user', devAuthSimulator, authController.getCurrentUser);

// Local development bypass simulation login
router.post('/simulate', authController.simulateLogin);

// Handle logout
router.get('/logout', authController.logout);

module.exports = router;
