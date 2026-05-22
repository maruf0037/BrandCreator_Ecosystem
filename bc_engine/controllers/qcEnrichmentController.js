const { poolPromise, sql } = require('../config/db');

// Background worker to retry queued enrichment jobs when a valid GEMINI_API_KEY becomes available
const startEnrichmentRetryWorker = () => {
  console.log('Product Enrichment Retry Worker started.');
  
  setInterval(async () => {
    // Strict key validation inside worker
    const rawKey = process.env.GEMINI_API_KEY;
    const hasKey = rawKey && 
                   rawKey.trim() !== '' && 
                   !rawKey.includes('your_') && 
                   !rawKey.startsWith('\\') && 
                   rawKey !== 'dummy_client_id' &&
                   rawKey !== 'AIzaSyBfIVAtLNthv7utfYsrgNFtSLJV05K3C1Q';

    if (!hasKey) {
      // No valid key available yet, skip check
      return;
    }

    try {
      const pool = await poolPromise;
      // Get all queued jobs
      const jobsResult = await pool.request()
        .query("SELECT TOP 5 * FROM dbo.ProductEnrichmentJobs WHERE Status = 'QUEUED' ORDER BY CreatedAt ASC");

      for (const job of jobsResult.recordset) {
        console.log(`Retry Worker: Processing queued enrichment job #${job.JobId} for Product #${job.ProductId}`);
        
        // 1. Update job to RUNNING
        await pool.request()
          .input('jobId', sql.BigInt, job.JobId)
          .query("UPDATE dbo.ProductEnrichmentJobs SET Status = 'RUNNING' WHERE JobId = @jobId");

        try {
          // 2. Fetch product details
          const productResult = await pool.request()
            .input('productId', sql.Int, job.ProductId)
            .query("SELECT * FROM dbo.Products WHERE ProductId = @productId");

          if (productResult.recordset.length === 0) {
            throw new Error('Product not found');
          }

          const product = productResult.recordset[0];
          
          // 3. Make Gemini API call
          const enrichmentData = await callGeminiAI(product.ProductName, product.SKU, 'bn');

          // 4. Update Product table
          await pool.request()
            .input('productId', sql.Int, job.ProductId)
            .input('enrichmentJson', sql.NVarChar(sql.MAX), JSON.stringify(enrichmentData))
            .query(`
              UPDATE dbo.Products
              SET EnrichmentJson = @enrichmentJson,
                  LastEnrichedAt = SYSUTCDATETIME(),
                  UpdatedAt = SYSUTCDATETIME()
              WHERE ProductId = @productId
            `);

          // 5. Update Job status to SUCCEEDED
          await pool.request()
            .input('jobId', sql.BigInt, job.JobId)
            .query("UPDATE dbo.ProductEnrichmentJobs SET Status = 'SUCCEEDED', FinishedAt = SYSUTCDATETIME() WHERE JobId = @jobId");

          console.log(`Retry Worker: Job #${job.JobId} completed successfully!`);
        } catch (err) {
          console.error(`Retry Worker: Job #${job.JobId} failed:`, err.message);
          // Update Job status to FAILED
          await pool.request()
            .input('jobId', sql.BigInt, job.JobId)
            .input('errMsg', sql.NVarChar(1000), err.message)
            .query("UPDATE dbo.ProductEnrichmentJobs SET Status = 'FAILED', ErrorMessage = @errMsg, FinishedAt = SYSUTCDATETIME() WHERE JobId = @jobId");
        }
      }
    } catch (err) {
      console.error('Retry Worker Check Error:', err.message);
    }
  }, 5000); // Check every 5 seconds in dev mode for quick feedback
};

// Helper function to call Gemini API using native fetch
const callGeminiAI = async (productName, sku, language) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Mock support for integration tests
  if (apiKey === 'mock_key_for_testing') {
    return {
      title: `পছন্দসই ${productName}`,
      description: `উচ্চ মানের ${productName} যা প্রতিদিনের ব্যবহারের জন্য আরামদায়ক।`,
      tags: ['clothing', 'premium', 'cotton']
    };
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const langText = language === 'bn' ? 'Bengali (বাংলা)' : 'English';
  const prompt = `Generate a high-quality product title, description, and tags in ${langText} for a product named '${productName}' with SKU '${sku}'. 
Return your output strictly as a valid JSON object with the following keys:
- title: an enhanced, attractive product title in ${langText}
- description: a detailed product description in ${langText}
- tags: an array of 3-5 short, relevant tags/keywords (strings) in lowercase

Do not include any explanation, markdown formatting, or code fences (e.g. do not wrap in \`\`\`json). Return raw JSON only.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  const rawText = responseData.contents?.[0]?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Invalid or empty response from Gemini API');
  }

  // Parse JSON, cleaning any potential markdown fences
  const cleanJson = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleanJson);
};

// Helper function to check if Supplier owns the product
const checkSupplierOwnership = async (pool, productId, email, role) => {
  if (role === 'Supplier') {
    const ownerCheck = await pool.request()
      .input('productId', sql.Int, productId)
      .input('email', sql.NVarChar(255), email)
      .query("SELECT TOP 1 1 FROM dbo.ProductOwnership WHERE ProductId = @productId AND SupplierEmail = @email AND IsActive = 1");

    if (ownerCheck.recordset.length === 0) {
      const err = new Error('Supplier does not own this product');
      err.status = 403;
      throw err;
    }
  }
};

// POST /api/products/:id/qc/submit
exports.submitProductQC = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const email = req.user?.email || 'unknown@brandcreator.com';
  const role = req.user?.role || 'Supplier';

  try {
    const pool = await poolPromise;

    // Strict row-level Supplier ownership check
    try {
      await checkSupplierOwnership(pool, id, email, role);
    } catch (ownershipErr) {
      return res.status(ownershipErr.status || 403).json({ error: 'FORBIDDEN', message: ownershipErr.message });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verify product exists
      const prodCheck = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT ProductId, QCStatus FROM dbo.Products WHERE ProductId = @id');

      if (prodCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
      }

      // 2. Update QCStatus to SUBMITTED
      await transaction.request()
        .input('id', sql.Int, id)
        .query("UPDATE dbo.Products SET QCStatus = 'SUBMITTED', UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @id");

      // 3. Insert QC Event log
      await transaction.request()
        .input('productId', sql.Int, id)
        .input('note', sql.NVarChar(1000), note || null)
        .input('email', sql.NVarChar(255), email)
        .query(`
          INSERT INTO dbo.ProductQCEvents (ProductId, Action, Reason, PerformedByEmail)
          VALUES (@productId, 'SUBMIT', @note, @email)
        `);

      await transaction.commit();

      res.json({
        productId: parseInt(id),
        qcStatus: 'SUBMITTED',
        event: {
          action: 'SUBMIT',
          performedByEmail: email
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/products/:id/qc/review
exports.reviewProductQC = async (req, res) => {
  const { id } = req.params;
  const { decision, reason } = req.body;
  const email = req.user?.email || 'admin@brandcreator.com';

  if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: "decision is required and must be either 'APPROVE' or 'REJECT'" });
  }

  if (decision === 'REJECT' && (!reason || reason.trim() === '')) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: "reason is required when decision is REJECT" });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verify product exists
      const prodCheck = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT ProductId, QCStatus FROM dbo.Products WHERE ProductId = @id');

      if (prodCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
      }

      const qcStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const qcReason = decision === 'REJECT' ? reason : null;

      // 2. Update Product QC info
      await transaction.request()
        .input('id', sql.Int, id)
        .input('qcStatus', sql.NVarChar(30), qcStatus)
        .input('qcReason', sql.NVarChar(1000), qcReason)
        .query(`
          UPDATE dbo.Products 
          SET QCStatus = @qcStatus, 
              QCReason = @qcReason, 
              UpdatedAt = SYSUTCDATETIME() 
          WHERE ProductId = @id
        `);

      // 3. Insert QC Event log
      await transaction.request()
        .input('productId', sql.Int, id)
        .input('action', sql.NVarChar(30), decision)
        .input('reason', sql.NVarChar(1000), reason || null)
        .input('email', sql.NVarChar(255), email)
        .query(`
          INSERT INTO dbo.ProductQCEvents (ProductId, Action, Reason, PerformedByEmail)
          VALUES (@productId, @action, @reason, @email)
        `);

      await transaction.commit();

      res.json({
        productId: parseInt(id),
        qcStatus,
        qcReason,
        event: {
          action: decision,
          performedByEmail: email
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/products/:id/enrich
exports.enrichProduct = async (req, res) => {
  const { id } = req.params;
  const { fields, language } = req.body;
  const email = req.user?.email || 'admin@brandcreator.com';
  const role = req.user?.role || 'Supplier';
  const lang = language || 'bn';

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: "fields must be a non-empty array" });
  }

  try {
    const pool = await poolPromise;

    // Strict row-level Supplier ownership check
    try {
      await checkSupplierOwnership(pool, id, email, role);
    } catch (ownershipErr) {
      return res.status(ownershipErr.status || 403).json({ error: 'FORBIDDEN', message: ownershipErr.message });
    }
    
    // 1. Get product and check QCStatus
    const prodResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM dbo.Products WHERE ProductId = @id');

    if (prodResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    const product = prodResult.recordset[0];

    if (product.QCStatus !== 'APPROVED') {
      return res.status(400).json({
        error: 'INVALID_STATE',
        message: 'Product must be APPROVED before enrichment',
        details: { qcStatus: product.QCStatus }
      });
    }

    // Strict key verification
    const rawKey = process.env.GEMINI_API_KEY;
    const hasKey = rawKey && 
                   rawKey.trim() !== '' && 
                   !rawKey.includes('your_') && 
                   !rawKey.startsWith('\\') && 
                   rawKey !== 'dummy_client_id' &&
                   rawKey !== 'AIzaSyBfIVAtLNthv7utfYsrgNFtSLJV05K3C1Q';

    if (!hasKey) {
      // ==========================================
      // FALLBACK MODE: QUEUE THE JOB
      // ==========================================
      const queueResult = await pool.request()
        .input('productId', sql.Int, id)
        .input('email', sql.NVarChar(255), email)
        .query(`
          INSERT INTO dbo.ProductEnrichmentJobs (ProductId, Status, Provider, PromptVersion, RequestedByEmail)
          OUTPUT inserted.JobId
          VALUES (@productId, 'QUEUED', 'GEMINI', 'v1', @email)
        `);

      const jobId = queueResult.recordset[0].JobId;

      return res.status(202).json({
        productId: parseInt(id),
        jobId: parseInt(jobId),
        status: 'QUEUED',
        message: 'AI key missing; job queued for retry worker.'
      });
    }

    // ==========================================
    // AI KEY PRESENT: RUN ENRICHMENT ATOMICALLY
    // ==========================================
    // 1. Create Job in RUNNING state
    const jobResult = await pool.request()
      .input('productId', sql.Int, id)
      .input('email', sql.NVarChar(255), email)
      .query(`
        INSERT INTO dbo.ProductEnrichmentJobs (ProductId, Status, Provider, PromptVersion, RequestedByEmail)
        OUTPUT inserted.JobId
        VALUES (@productId, 'RUNNING', 'GEMINI', 'v1', @email)
      `);

    const jobId = jobResult.recordset[0].JobId;

    try {
      // 2. Run Gemini AI Content Generation
      const enrichmentData = await callGeminiAI(product.ProductName, product.SKU, lang);

      // 3. Save to database
      await pool.request()
        .input('productId', sql.Int, id)
        .input('enrichmentJson', sql.NVarChar(sql.MAX), JSON.stringify(enrichmentData))
        .query(`
          UPDATE dbo.Products
          SET EnrichmentJson = @enrichmentJson,
              LastEnrichedAt = SYSUTCDATETIME(),
              UpdatedAt = SYSUTCDATETIME()
          WHERE ProductId = @productId
        `);

      // 4. Complete the job
      await pool.request()
        .input('jobId', sql.BigInt, jobId)
        .query("UPDATE dbo.ProductEnrichmentJobs SET Status = 'SUCCEEDED', FinishedAt = SYSUTCDATETIME() WHERE JobId = @jobId");

      res.json({
        productId: parseInt(id),
        jobId: parseInt(jobId),
        status: 'SUCCEEDED',
        enrichment: enrichmentData
      });
    } catch (err) {
      console.error('Enrichment generation error:', err.message);
      
      // Update Job to FAILED
      await pool.request()
        .input('jobId', sql.BigInt, jobId)
        .input('errMsg', sql.NVarChar(1000), err.message)
        .query("UPDATE dbo.ProductEnrichmentJobs SET Status = 'FAILED', ErrorMessage = @errMsg, FinishedAt = SYSUTCDATETIME() WHERE JobId = @jobId");

      res.status(500).json({ error: 'AI_SERVICE_ERROR', message: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products/:id/qc/events
exports.getProductQCEvents = async (req, res) => {
  const { id } = req.params;
  const email = req.user?.email || 'supplier@example.com';
  const role = req.user?.role || 'Supplier';

  try {
    const pool = await poolPromise;

    // Strict row-level Supplier ownership check
    try {
      await checkSupplierOwnership(pool, id, email, role);
    } catch (ownershipErr) {
      return res.status(ownershipErr.status || 403).json({ error: 'FORBIDDEN', message: ownershipErr.message });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT EventId AS eventId, Action AS action, Reason AS reason, PerformedByEmail AS performedByEmail, CreatedAt AS createdAt FROM dbo.ProductQCEvents WHERE ProductId = @id ORDER BY CreatedAt DESC');

    res.json({
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products/:id/enrichment/jobs
exports.getProductEnrichmentJobs = async (req, res) => {
  const { id } = req.params;
  const email = req.user?.email || 'supplier@example.com';
  const role = req.user?.role || 'Supplier';

  try {
    const pool = await poolPromise;

    // Strict row-level Supplier ownership check
    try {
      await checkSupplierOwnership(pool, id, email, role);
    } catch (ownershipErr) {
      return res.status(ownershipErr.status || 403).json({ error: 'FORBIDDEN', message: ownershipErr.message });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT JobId AS jobId, Status AS status, Provider AS provider, PromptVersion AS promptVersion, ErrorMessage AS errorMessage, CreatedAt AS createdAt, FinishedAt AS finishedAt FROM dbo.ProductEnrichmentJobs WHERE ProductId = @id ORDER BY CreatedAt DESC');

    res.json({
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products/:id (extended payload)
exports.getProductDetails = async (req, res) => {
  const { id } = req.params;
  const email = req.user?.email || 'supplier@example.com';
  const role = req.user?.role || 'Supplier';

  try {
    const pool = await poolPromise;

    // Strict row-level Supplier ownership check
    try {
      await checkSupplierOwnership(pool, id, email, role);
    } catch (ownershipErr) {
      return res.status(ownershipErr.status || 403).json({ error: 'FORBIDDEN', message: ownershipErr.message });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM dbo.Products WHERE ProductId = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    const product = result.recordset[0];
    let enrichment = null;

    if (product.EnrichmentJson) {
      try {
        enrichment = JSON.parse(product.EnrichmentJson);
      } catch (e) {
        // Safe fallback if JSON parsing fails
      }
    }

    res.json({
      productId: product.ProductId,
      sku: product.SKU,
      productName: product.ProductName,
      qcStatus: product.QCStatus,
      qcReason: product.QCReason,
      lastEnrichedAt: product.LastEnrichedAt,
      enrichment: enrichment
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/qc/queue
exports.getQCQueue = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT p.ProductId AS productId, p.SKU AS sku, p.ProductName AS productName, 
               p.Status AS status, p.QCStatus AS qcStatus, p.QCReason AS qcReason,
               p.CreatedAt AS createdAt, p.UpdatedAt AS updatedAt,
               (
                 SELECT STRING_AGG(o.SupplierEmail, ', ') 
                 FROM dbo.ProductOwnership o 
                 WHERE o.ProductId = p.ProductId AND o.IsActive = 1
               ) AS owners
        FROM dbo.Products p
        WHERE p.QCStatus = 'SUBMITTED'
        ORDER BY p.UpdatedAt ASC
      `);
    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

module.exports.startEnrichmentRetryWorker = startEnrichmentRetryWorker;
