// controllers/authController.js
const { poolPromise, sql } = require('../config/db');

function resolveFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:8080";
}

exports.googleCallback = (req, res) => {
  const emailVal = (req.user?.email || req.user?.Email || "").toLowerCase().trim();
  let role = req.user?.role || req.user?.Role || "Customer";
  if (emailVal === "md.marufalrashid@gmail.com") {
    role = "SuperAdmin";
  }
  const frontend = resolveFrontendUrl();

  if (role === "SuperAdmin" || role === "Admin") return res.redirect(`${frontend}/admin`);
  if (role === "Supplier") return res.redirect(`${frontend}/supplier`);
  return res.redirect(`${frontend}/shop`);
};

exports.authFailure = (_req, res) => {
  res.status(401).json({ message: "Google authentication failed" });
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(`${resolveFrontendUrl()}/login`);
  });
};

exports.getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false, message: "Not logged in" });
  }
  const emailVal = (req.user.email || req.user.Email || "").toLowerCase().trim();
  let roleVal = req.user.role || req.user.Role || "Customer";
  if (emailVal === "md.marufalrashid@gmail.com") {
    roleVal = "SuperAdmin";
  }

  const user = {
    id: req.user.id || req.user.Id || req.user.UserID || null,
    email: emailVal,
    role: roleVal,
    displayName: req.user.displayName || req.user.DisplayName || "",
    avatar: req.user.avatar || req.user.Avatar || ""
  };

  return res.json({
    authenticated: true,
    user
  });
};

exports.simulateLogin = async (req, res) => {
  const { email, role } = req.body;
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Simulation not allowed in production' });
  }

  if (!email) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email is required' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email.toLowerCase().trim())
      .query('SELECT TOP 1 * FROM Users WHERE Email = @email');
    
    let user = result.recordset[0];
    let userRole = role || 'Customer';
    if (email.toLowerCase().trim() === 'md.marufalrashid@gmail.com') {
      userRole = 'SuperAdmin';
    }

    if (!user) {
      const googleId = 'simulated_' + Math.floor(Math.random() * 1000000);
      await pool.request()
        .input('email', sql.NVarChar(255), email.toLowerCase().trim())
        .input('googleId', sql.NVarChar(255), googleId)
        .input('role', sql.NVarChar(50), userRole)
        .query('INSERT INTO Users (Email, GoogleID, Role) VALUES (@email, @googleId, @role)');
      user = { Email: email, Role: userRole };
    } else {
      // Ensure if email is md.marufalrashid@gmail.com, role is SuperAdmin in db as well
      const targetRole = email.toLowerCase().trim() === 'md.marufalrashid@gmail.com' ? 'SuperAdmin' : userRole;
      if (user.Role !== targetRole) {
        await pool.request()
          .input('email', sql.NVarChar(255), email.toLowerCase().trim())
          .input('role', sql.NVarChar(50), targetRole)
          .query('UPDATE Users SET Role = @role WHERE Email = @email');
        user.Role = targetRole;
      }
    }

    req.login({ email: user.Email, role: user.Role }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        authenticated: true,
        user: {
          email: user.Email,
          role: user.Role,
          displayName: 'Simulated ' + user.Role
        }
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

