// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

// Initialize passport configuration
require('./config/passport');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5002;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5174';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'brand_creator_ecosystem_secret_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to true if deploying over HTTPS
      sameSite: 'lax'
    }
  })
);

// Initialize Passport & Passport Session
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/brand_creator';
mongoose
  .connect(mongoURI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB database connection failure:', err));

// Routes mapping
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BrandCreator Engine' });
});

// Root fallback route
app.get('/', (req, res) => {
  res.send('BrandCreator Backend API is active.');
});

// Bind to port
app.listen(PORT, () => {
  console.log(`BrandCreator Engine running on http://localhost:${PORT}`);
});
