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
  
  const requestedRole = (req.query && req.query.state) || (req.session && req.session.oauthRole);
  if (req.session) {
    delete req.session.oauthRole;
  }

  const frontend = resolveFrontendUrl();
  const params = `?auth_email=${encodeURIComponent(emailVal)}&auth_role=${encodeURIComponent(role)}`;

  if (role === "SuperAdmin" || role === "Admin") return res.redirect(`${frontend}/admin${params}`);
  if (role === "Supplier") return res.redirect(`${frontend}/supplier${params}`);
  if (requestedRole === "Supplier") return res.redirect(`${frontend}/supplier-onboarding${params}`);
  return res.redirect(`${frontend}/shop${params}`);
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

exports.getCurrentUser = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false, message: "Not logged in" });
  }
  const emailVal = (req.user.email || req.user.Email || "").toLowerCase().trim();
  let roleVal = req.user.role || req.user.Role || "Customer";
  if (emailVal === "md.marufalrashid@gmail.com") {
    roleVal = "SuperAdmin";
  }

  try {
    const pool = await poolPromise;
    
    // Check Supplier onboarding status
    let supplierStatus = 'NOT_SUBMITTED';
    let rejectReason = null;
    const supplierRes = await pool.request()
      .input('email', sql.NVarChar(255), emailVal)
      .query('SELECT TOP 1 Status, RejectReason FROM dbo.SupplierProfiles WHERE Email = @email');
    if (supplierRes.recordset.length > 0) {
      supplierStatus = supplierRes.recordset[0].Status;
      rejectReason = supplierRes.recordset[0].RejectReason;
    }

    // Check Customer profile completion status
    let customerProfileComplete = false;
    const customerRes = await pool.request()
      .input('email', sql.NVarChar(255), emailVal)
      .query('SELECT TOP 1 PhoneNumber, DeliveryAddress FROM dbo.CustomerProfiles WHERE Email = @email');
    if (customerRes.recordset.length > 0) {
      const cp = customerRes.recordset[0];
      if (cp.PhoneNumber && cp.DeliveryAddress) {
        customerProfileComplete = true;
      }
    }

    const user = {
      id: req.user.id || req.user.Id || req.user.UserID || null,
      email: emailVal,
      role: roleVal,
      displayName: req.user.displayName || req.user.DisplayName || "",
      avatar: req.user.avatar || req.user.Avatar || "",
      supplierStatus,
      rejectReason,
      customerProfileComplete
    };

    return res.json({
      authenticated: true,
      user
    });
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
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
    const trimmedEmail = email.toLowerCase().trim();

    // Seed onboarding simulation profiles
    if (trimmedEmail === 'pending@example.com') {
      await pool.request()
        .input('email', sql.NVarChar(255), trimmedEmail)
        .query(`
          MERGE INTO dbo.SupplierProfiles AS target
          USING (SELECT @email AS Email) AS source
          ON (target.Email = source.Email)
          WHEN MATCHED THEN
            UPDATE SET Status = 'PENDING_APPROVAL', RejectReason = NULL
          WHEN NOT MATCHED THEN
            INSERT (Email, ShopName, ShopLocation, PhoneNumber, NID, TradeLicense, Status)
            VALUES (source.Email, 'Simulated Pending Shop', 'Dhaka', '01700000000', '1234567890', 'TL-12345', 'PENDING_APPROVAL');
        `);
    } else if (trimmedEmail === 'rejected@example.com') {
      await pool.request()
        .input('email', sql.NVarChar(255), trimmedEmail)
        .query(`
          MERGE INTO dbo.SupplierProfiles AS target
          USING (SELECT @email AS Email) AS source
          ON (target.Email = source.Email)
          WHEN MATCHED THEN
            UPDATE SET Status = 'REJECTED', RejectReason = 'Invalid NID number provided.'
          WHEN NOT MATCHED THEN
            INSERT (Email, ShopName, ShopLocation, PhoneNumber, NID, TradeLicense, Status, RejectReason)
            VALUES (source.Email, 'Simulated Rejected Shop', 'Dhaka', '01700000000', '0000000000', 'TL-12345', 'REJECTED', 'Invalid NID number provided.');
        `);
    } else if (trimmedEmail === 'approved@example.com') {
      await pool.request()
        .input('email', sql.NVarChar(255), trimmedEmail)
        .query(`
          MERGE INTO dbo.SupplierProfiles AS target
          USING (SELECT @email AS Email) AS source
          ON (target.Email = source.Email)
          WHEN MATCHED THEN
            UPDATE SET Status = 'APPROVED'
          WHEN NOT MATCHED THEN
            INSERT (Email, ShopName, ShopLocation, PhoneNumber, NID, TradeLicense, Status)
            VALUES (source.Email, 'Simulated Approved Shop', 'Dhaka', '01700000000', '1234567890', 'TL-12345', 'APPROVED');
        `);
    } else if (trimmedEmail === 'customer_complete@example.com') {
      await pool.request()
        .input('email', sql.NVarChar(255), trimmedEmail)
        .query(`
          MERGE INTO dbo.CustomerProfiles AS target
          USING (SELECT @email AS Email) AS source
          ON (target.Email = source.Email)
          WHEN MATCHED THEN
            UPDATE SET PhoneNumber = '01800000000', DeliveryAddress = '123 Main Street, Dhaka'
          WHEN NOT MATCHED THEN
            INSERT (Email, PhoneNumber, DeliveryAddress)
            VALUES (source.Email, '01800000000', '123 Main Street, Dhaka');
        `);
    }

    const result = await pool.request()
      .input('email', sql.NVarChar(255), trimmedEmail)
      .query('SELECT TOP 1 * FROM Users WHERE Email = @email');
    
    let user = result.recordset[0];
    let userRole = role || 'Customer';
    if (trimmedEmail === 'md.marufalrashid@gmail.com') {
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

