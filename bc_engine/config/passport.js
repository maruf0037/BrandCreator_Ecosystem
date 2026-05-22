const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { poolPromise, sql } = require('./db');

const SUPER_ADMIN_EMAIL = 'md.marufalrashid@gmail.com';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
  proxy: true
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const pool = await poolPromise;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : '';
    const googleId = profile.id;
    const displayName = profile.displayName || '';

    // Find user by email
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM Users WHERE Email = @email');
    let user = result.recordset[0];

    if (!user) {
      const role = email === SUPER_ADMIN_EMAIL ? 'SuperAdmin' : 'Customer';
      await pool.request()
        .input('email', sql.NVarChar(255), email)
        .input('googleId', sql.NVarChar(255), googleId)
        .input('role', sql.NVarChar(50), role)
        .query('INSERT INTO Users (Email, GoogleID, Role) VALUES (@email, @googleId, @role)');
      user = { Email: email, Role: role };
    } else {
      // Update GoogleID if changed
      await pool.request()
        .input('email', sql.NVarChar(255), email)
        .input('googleId', sql.NVarChar(255), googleId)
        .query('UPDATE Users SET GoogleID = @googleId WHERE Email = @email');
      // Promote to SuperAdmin if needed
      if (email === SUPER_ADMIN_EMAIL && user.Role !== 'SuperAdmin') {
        await pool.request()
          .input('email', sql.NVarChar(255), email)
          .query("UPDATE Users SET Role = 'SuperAdmin' WHERE Email = @email");
        user.Role = 'SuperAdmin';
      }
    }

    const role = user.Role || 'Customer';
    console.log(`User ${email} logged in as ${role}`);
    return done(null, { email, role });
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser(async (email, done) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM Users WHERE Email = @email');
    const user = result.recordset[0];
    if (user && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
      user.Role = 'SuperAdmin';
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
