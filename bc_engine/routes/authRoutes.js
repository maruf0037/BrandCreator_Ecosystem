// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');

const router = express.Router();

// Trigger Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  authController.googleCallback
);

// Fetch current logged in user details
router.get('/current-user', authController.getCurrentUser);

// Local development bypass simulation login
router.post('/simulate', authController.simulateLogin);

// Handle logout
router.get('/logout', authController.logout);

module.exports = router;
