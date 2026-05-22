const { poolPromise, sql } = require('../config/db');
const logger = require('../src/logger');

// POST /api/admin/secrets/webhook/rotate
exports.rotateWebhookSecret = async (req, res) => {
  const { newKeyId, newSecret } = req.body;

  if (!newKeyId || !newSecret) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'newKeyId and newSecret are required' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Mark existing keys as rotated/inactive
      await transaction.request()
        .input('secretType', sql.NVarChar(50), 'WEBHOOK')
        .query(`
          UPDATE dbo.SecretVersions 
          SET IsActive = 0, RotatedAt = SYSUTCDATETIME()
          WHERE SecretType = @secretType AND IsActive = 1
        `);

      // 2. Insert the new active key version
      await transaction.request()
        .input('secretType', sql.NVarChar(50), 'WEBHOOK')
        .input('keyId', sql.NVarChar(50), newKeyId)
        .input('secretValue', sql.NVarChar(500), newSecret)
        .query(`
          INSERT INTO dbo.SecretVersions (SecretType, KeyId, SecretValue, IsActive)
          VALUES (@secretType, @keyId, @secretValue, 1)
        `);

      await transaction.commit();

      logger.info({
        event: 'secret.rotation',
        reqId: req.reqId,
        secretType: 'WEBHOOK',
        activeKeyId: newKeyId
      });

      res.json({
        rotated: true,
        activeKeyId: newKeyId
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (rErr) {}
      throw err;
    }
  } catch (err) {
    logger.error({
      event: 'secret.rotation.error',
      reqId: req.reqId,
      message: err.message
    });
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
