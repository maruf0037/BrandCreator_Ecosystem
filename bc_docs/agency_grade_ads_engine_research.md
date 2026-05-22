# Agency-Grade Ads Engine Research for BrandCreator

## 1. Correct Strategic Frame

BrandCreator should not be treated as an e-commerce platform that later adds ads.

BrandCreator should be treated as:

```text
An ads and marketing intelligence engine with a controlled selling platform inside it.
```

The selling platform exists to produce:

- conversion data
- customer list
- product demand signals
- location-level selling signals
- payment success/failure signals
- return/review signals
- profit attribution

This data then feeds the Admin-led ads engine.

Supplier is the stock source. BrandCreator is the marketing brain, pricing controller, campaign operator, and customer asset owner.

## 2. What Top Marketing Agencies Actually Do

High-performing marketing agencies do not simply boost posts. They usually follow an operating loop:

```text
Product intelligence
-> Offer/pricing strategy
-> Audience/location research
-> Channel/platform selection
-> Creative testing
-> Conversion tracking
-> Budget allocation
-> Optimization
-> Profit/ROAS reporting
-> Retargeting and customer asset building
```

BrandCreator should implement this same loop as software.

## 3. Source-Backed Best Practice Findings

### Google Ads / Performance Max

Google's Performance Max guidance emphasizes strong conversion data, valuable conversion actions, creative assets, and value-based bidding. For BrandCreator this means the engine must know order value, profit value, payment success, return loss, and product stock before recommending Google campaigns.

Relevant source:

- Google Performance Max best practices: https://support.google.com/google-ads/answer/13775965
- Google value-based bidding guidance: https://support.google.com/google-ads/answer/11189316
- Google Ads API recommendations: https://developers.google.com/google-ads/api/docs/recommendations

Implementation meaning for BrandCreator:

- Store conversion value, not only order count.
- Feed verified payment and profit into marketing reports.
- Use recommendations/optimization-score concepts later for Google Ads API integration.
- Do not recommend Google Search if product intent/search demand is weak.

### Google Enhanced Conversions and First-Party Data

Google recommends robust sitewide tagging and enhanced conversions using privacy-safe first-party data. For BrandCreator, customer email/phone/order history must become a structured customer asset, not just order text.

Relevant source:

- Google Enhanced Conversions best practices: https://support.google.com/google-ads/answer/14795081
- Google Ads conversion measurement: https://ads.google.com/intl/en_us/home/measurement/conversion-tracking/

Implementation meaning:

- Capture customer phone/email when legally allowed.
- Hash and send first-party conversion data later.
- Track `orderRef`, `paidAmount`, `paymentStatus`, `customerLocation`, and `productCategory`.
- Build customer list for future own-stock campaigns.

### Meta / Facebook / Instagram

Meta's Conversions API is designed to connect server, website, app, CRM, offline, and messaging events directly to Meta for optimization and measurement. For BrandCreator, this validates a server-side event pipeline later: order created, payment verified, purchase confirmed, return/refund, repeat customer.

Relevant source:

- Meta Conversions API overview: https://www.facebook.com/business/help/AboutConversionsAPI

Implementation meaning:

- Pixel-only is not enough for serious performance ads.
- BrandCreator should later send server-side purchase and post-purchase events.
- Customer match quality matters: phone/email/location/order data should be structured.
- Meta/Instagram is likely high priority for fashion/lifestyle/impulse products.

### TikTok / Reels-Style Performance Marketing

TikTok's official best practices emphasize continuous testing, diversified creatives/ad groups, Smart Performance/Smart+ automation, and avoiding overly narrow targeting. This means BrandCreator should generate creative angles and test plans, not one static ad plan.

Relevant sources:

- TikTok creative best practices: https://ads.tiktok.com/help/article/creative-best-practices
- TikTok targeting best practices: https://ads.us.tiktok.com/help/article/best-practices-for-targeting
- TikTok split testing: https://ads-useast2a.tiktok.com/help/article/split-testing
- TikTok Smart+ campaigns: https://ads.us.tiktok.com/help/article/about-smart-plus-campaign

Implementation meaning:

- Recommend multiple creative angles per product.
- Avoid hyper-narrow audiences until data exists.
- Track creative fatigue.
- Recommend TikTok/Reels for visual/viral products with enough image/video quality.

## 4. Agency Method -> BrandCreator Engine Module

| Agency Method | BrandCreator Module |
| :--- | :--- |
| Product audit | Product Readiness Score |
| Offer audit | Admin Pricing & Margin Engine |
| Audience research | Location Target Scoring |
| Channel planning | Platform Recommendation Score |
| Creative strategy | Creative Angle Generator |
| SEO/product copy | SEO Intelligence Snapshot |
| Conversion tracking | Payment & Order Attribution |
| Budget planning | Ads Budget Ledger |
| Daily optimization | Background Sync + Freshness Badges |
| ROAS reporting | Profit Forecast + Actual Profit |
| Retargeting | Customer Asset/Audience Segments |

## 5. BrandCreator's Required Data Foundation

Before any serious AI ads recommendation, the product intake must collect:

- SKU
- barcode
- product name
- category
- brand
- product images
- RPU/MRP or supplier base price
- suggested retail price
- cost note
- size/color/variant
- supplier location
- delivery coverage
- stock quantity
- online selling requested
- supplier notes

Without these, AI recommendations will be weak or fake.

## 6. Admin-Led Ads Engine Workflow

```text
Supplier adds product and stock
-> Admin QC approval
-> Product readiness check
-> Background marketing analysis job
-> Location/platform/SEO/budget/profit recommendation
-> Admin reviews and adjusts plan
-> Admin approves campaign-ready plan
-> Later: real ad API launch
-> Payment/order/return data comes back
-> Engine recalculates profit and audience value
```

Supplier should not control ads, SEO, final pricing, or hidden profit.

## 7. Product Readiness Score

The engine should score each product before ads planning.

Suggested scoring:

| Signal | Weight |
| :--- | ---: |
| Has image | 20 |
| Has barcode | 10 |
| Has category | 10 |
| Has brand | 5 |
| Has clear product name | 10 |
| Has RPU/MRP | 10 |
| Has retail price | 10 |
| Has stock in SELL ledger | 15 |
| Has delivery coverage | 5 |
| Has supplier location | 5 |

Status:

- `NOT_READY`: below 50
- `NEEDS_DATA`: 50-69
- `READY_FOR_ANALYSIS`: 70-84
- `ADS_READY`: 85+

## 8. Location Intelligence Method

BrandCreator should score locations by:

- product-category demand fit
- price affordability
- delivery feasibility
- stock capacity
- historical order performance
- return risk
- payment success rate
- customer density

Initial Bangladesh-first locations:

- Dhaka
- Chittagong
- Sylhet
- Rajshahi
- Khulna
- Narayanganj
- Gazipur
- district expansion later

Example:

```text
Fashion kurti:
Dhaka: high demand, high competition, high delivery feasibility
Narayanganj: medium-high demand, lower CPC estimate
Sylhet: strong premium audience potential
```

## 9. Platform Selection Method

### Facebook / Instagram

Best for:

- fashion
- beauty
- lifestyle
- impulse purchase
- visual products
- local social proof

Required:

- multiple images/videos
- strong offer
- product price clarity
- customer event tracking

### TikTok / Reels

Best for:

- youth-focused products
- viral demonstration
- transformation/beauty/fashion
- low-mid price impulse products

Required:

- video or short-form creative concept
- continuous creative testing
- enough inventory to handle demand

### Google Search

Best for:

- high-intent products
- branded/known demand
- need-based products
- products with search keywords

Required:

- SEO keyword profile
- landing/product page clarity
- conversion value tracking

### YouTube

Best for:

- explainer products
- demonstration needed
- premium/educational products

Required:

- video creative
- longer buying journey tracking

### Local Groups / Social Commerce

Best for:

- city-based delivery
- early validation
- low budget testing
- products with local demand

Required:

- manual/managed posting plan
- careful spam/compliance control

## 10. Creative Testing Method

Best agencies do not test only one ad. BrandCreator should generate a creative test matrix.

For each product:

- 3 hooks
- 3 captions
- 3 image/video angles
- 2 offers
- 2 target locations

Example hooks:

- Problem-solving hook
- Price/value hook
- Lifestyle/status hook
- Scarcity/limited-stock hook
- Social-proof hook

## 11. Budget and Scaling Method

BrandCreator should not recommend large budgets immediately.

Suggested stages:

### Test Stage

- small daily budget
- 2-3 platforms max
- multiple creatives
- goal: identify signal

### Validation Stage

- increase budget only if CPA/ROAS is acceptable
- keep stock capacity in mind
- watch payment success and return rate

### Scale Stage

- increase winning campaign budget gradually
- refresh creatives before fatigue
- retarget engaged visitors/customers

## 12. Profit Calculation Model

BrandCreator should calculate profit before recommending ads.

Formula:

```text
Gross Revenue = Final Selling Price * Sold Quantity
Supplier Payable = Supplier RPU/MRP * Sold Quantity
Marketing Cost = Ad Spend Allocated or Actual
Ops Cost = Delivery/packaging/platform cost
Refund Loss = Returned/Refunded Amount
Net BrandCreator Profit = Gross Revenue - Supplier Payable - Marketing Cost - Ops Cost - Refund Loss
```

Track:

- forecast profit
- actual profit
- profit per product
- profit per campaign
- profit per location
- profit per customer segment

## 13. Freshness and Sync Method

All recommendations must show freshness.

Statuses:

- `LIVE`: analyzed under 5 minutes
- `FRESH`: under 30 minutes
- `STALE`: over 1 hour
- `OUTDATED`: product/stock/order/payment/return changed after analysis

Sync triggers:

- product added
- product QC approved
- product image/barcode/category updated
- MASTER stock added
- SELL stock available
- order placed
- payment verified
- return/refund created
- Admin clicks Sync Data

## 14. Data Tables Needed

Recommended schema groups:

### Product Intake

- `ProductExtendedAttributes`
- `ProductImages`
- `SupplierStockBatches`

### Marketing Intelligence

- `MarketingAnalysisJobs`
- `MarketingRecommendationSnapshots`
- `LocationTargetScores`
- `PlatformRecommendationScores`
- `SEORecommendationSnapshots`

### Budget and Profit

- `AdsBudgetLedgers`
- `ProfitForecasts`
- `OrderProfitBreakdowns`

### Customer Asset

- `CustomerProfiles`
- `CustomerOrderSummaries`
- `AudienceSegments`

### Trust and Outcome

- `PaymentVerificationRecords`
- `ReturnRequests`
- `ProductReviews`

## 15. Admin Dashboard Modules

Admin should get a command-center dashboard:

- Business Overview
- Supplier Product Intake
- Product QC
- Supplier Stock
- Ads Intelligence
- SEO Intelligence
- Location Targeting
- Pricing & Profit
- Orders & Payment Success
- Returns
- Reviews
- Customers
- Campaign Performance
- Future Own-Stock Audience

## 16. Supplier Dashboard Scope

Supplier should stay simple:

- add product
- add image/barcode/category/brand
- add RPU/MRP
- add stock
- submit for QC
- view status

Supplier should not:

- control ads
- control SEO
- control final selling price
- approve campaigns
- see hidden BrandCreator profit
- see customer strategy

## 17. Customer Data Strategy

Customer list is BrandCreator's future asset.

Track:

- name/contact if available
- location
- order count
- successful payment count
- return count
- preferred category
- average order value
- last order date
- high-intent product categories
- future own-stock targeting potential

## 18. Implementation Phases

### Phase 1: Product Intake Upgrade

Add barcode, images, category, brand, RPU/MRP, retail price, supplier location, delivery coverage, variants, online selling request.

### Phase 2: Admin Pricing and Profit Engine

Create pricing plans, supplier payable, ad budget, projected profit, actual profit.

### Phase 3: Background Marketing Analysis Jobs

Create jobs, snapshots, freshness, sync button, rules-based recommendation first.

### Phase 4: Admin Ads and SEO Command Dashboard

Build Admin-only marketing tab with recommendation cards and approval layer.

### Phase 5: Payment Verification and Profit Finalization

Payment must be verified before final profit is counted.

### Phase 6: Returns, Reviews, Customer Background

Add return loss, review sentiment, customer summaries.

### Phase 7: Real Ads API Integration

Meta/Google/TikTok API, but only after internal planning engine is stable.

### Phase 8: Audience and Own-Stock Targeting

Use customer data to launch BrandCreator-owned product campaigns.

## 19. First Coding Task

The first coding task should be:

```text
Upgrade supplier product intake schema and UI.
```

Do not start with ads API.

First implement:

- `migration_008_product_intake.sql`
- product extended fields
- product images table
- supplier stock batch table
- supplier product creation form fields
- backend mapping in `inventoryController.js`
- product list returns new fields

This unlocks real ads intelligence later.

## 20. Practical Rule

If product data is weak, ads recommendation will be weak.

Therefore:

```text
Product data quality -> AI recommendation quality -> Ads result quality -> Profit quality
```

BrandCreator must first become excellent at product intake and customer outcome tracking before spending real ad money.

## 21. Research Sources

- Google Performance Max best practices: https://support.google.com/google-ads/answer/13775965
- Google Performance Max conversion value bidding: https://support.google.com/google-ads/answer/11189316
- Google Ads API recommendations: https://developers.google.com/google-ads/api/docs/recommendations
- Google Enhanced Conversions best practices: https://support.google.com/google-ads/answer/14795081
- Google Ads conversion measurement: https://ads.google.com/intl/en_us/home/measurement/conversion-tracking/
- Meta Conversions API overview: https://www.facebook.com/business/help/AboutConversionsAPI
- TikTok creative best practices: https://ads.tiktok.com/help/article/creative-best-practices
- TikTok targeting best practices: https://ads.us.tiktok.com/help/article/best-practices-for-targeting
- TikTok split testing: https://ads-useast2a.tiktok.com/help/article/split-testing
- TikTok Smart+ campaigns: https://ads.us.tiktok.com/help/article/about-smart-plus-campaign
