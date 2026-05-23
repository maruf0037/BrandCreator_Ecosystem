const { poolPromise, sql } = require('../config/db');

const locationDefaults = {
  uttara: {
    suggestedAreas: ['Uttara Sector 4', 'Uttara Sector 7', 'Uttara Sector 10', 'Uttara Sector 11'],
    nearbyExpansionAreas: ['Tongi', 'Airport', 'Khilkhet', 'Gazipur'],
    interests: ['women fashion', 'boutique clothing', 'family shopping', 'online shopping', 'Eid fashion', 'modest fashion']
  },
  mirpur: {
    suggestedAreas: ['Mirpur 1', 'Mirpur 10', 'Mirpur 11', 'Kazipara'],
    nearbyExpansionAreas: ['Pallabi', 'Kafrul', 'Agargaon'],
    interests: ['value fashion', 'household', 'electronics', 'family shopping']
  },
  dhanmondi: {
    suggestedAreas: ['Dhanmondi 27', 'Dhanmondi 15', 'Satmasjid Road'],
    nearbyExpansionAreas: ['Mohammadpur', 'New Market', 'Kalabagan'],
    interests: ['student lifestyle', 'food', 'fashion', 'education', 'online shopping']
  },
  gulshan: {
    suggestedAreas: ['Gulshan 1', 'Gulshan 2', 'Baridhara'],
    nearbyExpansionAreas: ['Banani', 'Badda', 'Niketon'],
    interests: ['premium fashion', 'beauty', 'lifestyle', 'imported goods', 'corporate audience']
  },
  banani: {
    suggestedAreas: ['Banani 11', 'Banani DOHS', 'Kakoli'],
    nearbyExpansionAreas: ['Gulshan', 'Mohakhali', 'Baridhara'],
    interests: ['premium lifestyle', 'beauty', 'fashion', 'corporate shopping']
  },
  narayanganj: {
    suggestedAreas: ['Chashara', 'Fatullah', 'Siddhirganj'],
    nearbyExpansionAreas: ['Signboard', 'Jatrabari', 'Demra'],
    interests: ['price-sensitive fashion', 'wholesale value', 'household', 'family shopping']
  },
  gazipur: {
    suggestedAreas: ['Joydebpur', 'Tongi', 'Board Bazar'],
    nearbyExpansionAreas: ['Uttara', 'Kaliakair', 'Savar'],
    interests: ['volume fashion', 'household', 'price-sensitive offers', 'factory worker audience']
  },
  tongi: {
    suggestedAreas: ['Tongi Bazar', 'Cherag Ali', 'Station Road'],
    nearbyExpansionAreas: ['Uttara', 'Gazipur', 'Airport'],
    interests: ['value fashion', 'household', 'online shopping', 'family shopping']
  }
};

function parseJsonArray(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
}

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
}

function pickDefaults(locationName) {
  const key = String(locationName || '').trim().toLowerCase();
  return locationDefaults[key] || {
    suggestedAreas: [locationName],
    nearbyExpansionAreas: [],
    interests: ['online shopping', 'local delivery', 'value offer']
  };
}

function selectPlatforms(categoryText) {
  const category = String(categoryText || '').toLowerCase();

  if (/fashion|clothing|kurti|shirt|boutique|lifestyle|dress|wear/.test(category)) {
    return [
      { platformName: 'Facebook', priority: 1, reason: 'Strong local commerce and fashion discovery fit.' },
      { platformName: 'Instagram', priority: 2, reason: 'Visual product presentation and lifestyle audience fit.' },
      { platformName: 'Local Groups', priority: 3, reason: 'Good for low-cost city-based validation.' }
    ];
  }

  if (/youth|trend|beauty|accessory|cosmetic/.test(category)) {
    return [
      { platformName: 'TikTok/Reels', priority: 1, reason: 'Short-form creative can create quick demand.' },
      { platformName: 'Instagram', priority: 2, reason: 'Visual discovery fit.' },
      { platformName: 'Facebook', priority: 3, reason: 'Broad local reach.' }
    ];
  }

  if (/electronics|service|repair|device|gadget/.test(category)) {
    return [
      { platformName: 'Google Search', priority: 1, reason: 'High-intent search demand is likely.' },
      { platformName: 'Facebook', priority: 2, reason: 'Local awareness and retargeting support.' }
    ];
  }

  if (/demo|explainer|course|training/.test(category)) {
    return [
      { platformName: 'YouTube/Reels', priority: 1, reason: 'Demo-led product education fit.' },
      { platformName: 'Facebook', priority: 2, reason: 'Broad retargeting and remarketing fit.' }
    ];
  }

  return [
    { platformName: 'Facebook', priority: 1, reason: 'Default broad local selling channel.' },
    { platformName: 'Instagram', priority: 2, reason: 'Visual discovery channel.' },
    { platformName: 'Local Groups', priority: 3, reason: 'Low-cost local validation channel.' }
  ];
}

function buildBudgetSuggestion(score, stockAvailable) {
  const stock = Number(stockAvailable || 0);
  const dailyMin = score >= 75 ? 800 : score >= 55 ? 500 : 300;
  const dailyMax = score >= 75 ? 1500 : score >= 55 ? 1000 : 600;
  const days = stock > 20 ? 3 : 2;

  return {
    currency: 'BDT',
    testDays: days,
    suggestedDailyBudgetMin: dailyMin,
    suggestedDailyBudgetMax: dailyMax,
    suggestedTotalBudgetMin: dailyMin * days,
    suggestedTotalBudgetMax: dailyMax * days,
    budgetNote: stock <= 0 ? 'No ad spend recommended until SELL stock is available.' : 'Small test budget before scaling.'
  };
}

function buildExpectedResult(score, stockAvailable) {
  const stock = Number(stockAvailable || 0);
  const reachMin = score * 40;
  const reachMax = score * 120;
  const orderMax = Math.max(0, Math.min(stock, Math.round(score / 12)));

  return {
    expectedReachRange: `${reachMin}-${reachMax}`,
    expectedOrderRange: stock <= 0 ? '0' : `1-${Math.max(1, orderMax)}`,
    note: 'Rule-based early estimate; improves later with real campaign and payment data.'
  };
}

async function loadProduct(pool, productId) {
  const result = await pool.request()
    .input('productId', sql.Int, productId)
    .query(`
      SELECT TOP 1
        p.ProductId,
        p.ProductName,
        p.SKU,
        p.Category,
        p.Brand,
        p.Barcode,
        p.RPU_MRP,
        p.SuggestedRetailPrice,
        p.BasePrice,
        p.SupplierLocation,
        p.DeliveryCoverageJson,
        p.ProductReadinessStatus,
        pi.ImageUrl,
        ISNULL(sl.OnHandQty, 0) AS SellOnHand,
        ISNULL(sl.ReservedQty, 0) AS SellReserved
      FROM dbo.Products p
      LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
      LEFT JOIN dbo.InventoryLedgers sl ON p.ProductId = sl.ProductId AND sl.LedgerType = 'MASTER'
      WHERE p.ProductId = @productId
      ORDER BY pi.IsPrimary DESC, pi.CreatedAt DESC
    `);

  return result.recordset[0];
}

async function analyzeLocationAds(req, res) {
  try {
    const { productId, testedLocation } = req.body;
    if (!productId || !testedLocation) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'productId and testedLocation are required' });
    }

    const pool = await poolPromise;
    const product = await loadProduct(pool, productId);
    if (!product) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    const locationResult = await pool.request()
      .input('loc', sql.NVarChar(150), testedLocation)
      .query(`
        SELECT TOP 1 *
        FROM dbo.LocationMarketProfiles
        WHERE IsActive = 1 AND LOWER(LocationName) = LOWER(@loc)
      `);
    const locationProfile = locationResult.recordset[0];

    const sellAvailable = Number(product.SellOnHand || 0) - Number(product.SellReserved || 0);
    let score = 50;
    if (locationProfile) score += 15;
    if (product.Category) score += 10;
    if (product.ImageUrl) score += 10;
    if (product.SuggestedRetailPrice || product.RPU_MRP || product.BasePrice) score += 10;
    if (sellAvailable > 0) score += 10;
    if (sellAvailable <= 0) score -= 20;
    score = Math.max(0, Math.min(100, score));

    const defaults = pickDefaults(testedLocation);
    const profileInterests = parseJsonArray(locationProfile?.CommonInterestsJson, defaults.interests);
    const platformSuggestion = selectPlatforms(`${product.Category || ''} ${product.ProductName || ''}`);
    const budgetSuggestion = buildBudgetSuggestion(score, sellAvailable);
    const expectedResult = buildExpectedResult(score, sellAvailable);
    const riskLevel = score >= 75 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH';
    const banglaReason = locationProfile
      ? `${testedLocation} er profile match pawa geche. Category, image, price, ebong SELL stock mile fit score ${score}.`
      : `${testedLocation} er saved market profile nei. Basic product data diye estimate kora hoyeche.`;
    const englishReason = locationProfile
      ? `${testedLocation} has a saved market profile. Fit score ${score} is based on category, image, price, and SELL stock readiness.`
      : `${testedLocation} has no saved profile yet. This is a basic estimate from product readiness and stock.`;

    const suggestion = {
      productId: product.ProductId,
      testedLocation,
      fitScore: score,
      productName: product.ProductName,
      sku: product.SKU,
      sellAvailable,
      suggestedAreas: defaults.suggestedAreas || [testedLocation],
      nearbyExpansionAreas: defaults.nearbyExpansionAreas || [],
      interestTags: profileInterests,
      platformSuggestion,
      budgetSuggestion,
      expectedResult,
      riskLevel,
      reasonBangla: banglaReason,
      reasonEnglish: englishReason,
      confidenceScore: score,
      freshnessStatus: 'LIVE',
      lastAnalyzedAt: new Date().toISOString()
    };

    const requestedByEmail = req.user?.email || 'admin@test.com';
    await pool.request()
      .input('productId', sql.Int, product.ProductId)
      .input('requestedByEmail', sql.NVarChar(255), requestedByEmail)
      .input('requestedLocation', sql.NVarChar(150), testedLocation)
      .input('status', sql.NVarChar(50), 'COMPLETED')
      .query(`
        INSERT INTO dbo.LocationSuggestionSyncEvents (ProductId, RequestedByEmail, RequestedLocation, Status)
        VALUES (@productId, @requestedByEmail, @requestedLocation, @status)
      `);

    const insertResult = await pool.request()
      .input('productId', sql.Int, suggestion.productId)
      .input('testedLocation', sql.NVarChar(150), suggestion.testedLocation)
      .input('fitScore', sql.Int, suggestion.fitScore)
      .input('suggestedAreas', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.suggestedAreas))
      .input('nearbyExpansion', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.nearbyExpansionAreas))
      .input('interestTags', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.interestTags))
      .input('platformSuggestion', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.platformSuggestion))
      .input('budgetSuggestion', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.budgetSuggestion))
      .input('expectedResult', sql.NVarChar(sql.MAX), JSON.stringify(suggestion.expectedResult))
      .input('riskLevel', sql.NVarChar(50), suggestion.riskLevel)
      .input('reasonBangla', sql.NVarChar(sql.MAX), suggestion.reasonBangla)
      .input('reasonEnglish', sql.NVarChar(sql.MAX), suggestion.reasonEnglish)
      .input('confidenceScore', sql.Int, suggestion.confidenceScore)
      .input('freshnessStatus', sql.NVarChar(50), suggestion.freshnessStatus)
      .query(`
        INSERT INTO dbo.ProductLocationSuggestions (
          ProductId, TestedLocation, FitScore, SuggestedAreasJson, NearbyExpansionAreasJson,
          InterestTagsJson, PlatformSuggestionJson, BudgetSuggestionJson, ExpectedResultJson,
          RiskLevel, ReasonBangla, ReasonEnglish, ConfidenceScore, FreshnessStatus, LastAnalyzedAt
        )
        OUTPUT inserted.SuggestionId
        VALUES (
          @productId, @testedLocation, @fitScore, @suggestedAreas, @nearbyExpansion,
          @interestTags, @platformSuggestion, @budgetSuggestion, @expectedResult,
          @riskLevel, @reasonBangla, @reasonEnglish, @confidenceScore, @freshnessStatus, SYSUTCDATETIME()
        )
      `);

    suggestion.suggestionId = insertResult.recordset[0].SuggestionId;
    return res.json({ success: true, suggestion });
  } catch (err) {
    console.error('Location ads analysis error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

async function getProductSuggestions(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('productId', sql.Int, req.params.productId)
      .query(`
        SELECT TOP 20 *
        FROM dbo.ProductLocationSuggestions
        WHERE ProductId = @productId
        ORDER BY CreatedAt DESC
      `);

    const items = result.recordset.map((row) => ({
      suggestionId: row.SuggestionId,
      productId: row.ProductId,
      testedLocation: row.TestedLocation,
      fitScore: row.FitScore,
      suggestedAreas: parseJsonArray(row.SuggestedAreasJson),
      nearbyExpansionAreas: parseJsonArray(row.NearbyExpansionAreasJson),
      interestTags: parseJsonArray(row.InterestTagsJson),
      platformSuggestion: parseJsonArray(row.PlatformSuggestionJson),
      budgetSuggestion: parseJsonObject(row.BudgetSuggestionJson),
      expectedResult: parseJsonObject(row.ExpectedResultJson),
      riskLevel: row.RiskLevel,
      reasonBangla: row.ReasonBangla,
      reasonEnglish: row.ReasonEnglish,
      confidenceScore: row.ConfidenceScore,
      freshnessStatus: row.FreshnessStatus,
      lastAnalyzedAt: row.LastAnalyzedAt,
      createdAt: row.CreatedAt
    }));

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

async function getLocationProfiles(_req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT *
      FROM dbo.LocationMarketProfiles
      WHERE IsActive = 1
      ORDER BY City, LocationName
    `);

    return res.json({
      items: result.recordset.map((row) => ({
        profileId: row.ProfileId,
        locationName: row.LocationName,
        city: row.City,
        audienceType: row.AudienceType,
        avgPurchasePower: row.AvgPurchasePower,
        commonInterests: parseJsonArray(row.CommonInterestsJson),
        deliveryDifficulty: row.DeliveryDifficulty,
        competitionLevel: row.CompetitionLevel,
        notesBangla: row.NotesBangla
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

module.exports = { analyzeLocationAds, getProductSuggestions, getLocationProfiles };
