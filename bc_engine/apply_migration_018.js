// cspell:ignore ELOGIN ENAME
/**
 * Migration 018: Dynamic Hold Period & Supplier Trust System
 * 
 * This script applies the migration to add:
 * - Trust levels (Bronze, Silver, Gold, Platinum)
 * - Dynamic hold periods (3, 5, 7 days based on trust)
 * - 0% commission for first 3 months for new suppliers
 * - Volume-based commission tiers
 * - Trusted Supplier badge system
 */

require('dotenv').config({ path: '.env' });
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function applyMigration018() {
    const migrationName = 'Migration 018: Dynamic Hold Period & Supplier Trust System';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting ${migrationName}`);
    console.log(`${'='.repeat(60)}\n`);

    // Database configuration
    const config = {
        user: process.env.SQL_USER || 'sa',
        password: process.env.SQL_PASSWORD || '',
        server: process.env.SQL_SERVER || 'localhost',
        database: process.env.SQL_DATABASE || 'BrandCreator_HUBDB',
        options: {
            encrypt: process.env.SQL_ENCRYPT === 'true',
            trustServerCertificate: process.env.SQL_TRUST_CERT === 'true'
        }
    };

    let connection;

    try {
        // Connect to database
        console.log('📡 Connecting to SQL Server...');
        connection = await sql.connect(config);
        console.log('✅ Connected to database successfully!\n');

        // Read migration SQL file with safe path resolution
        const migrationPath = path.join(__dirname, 'migration_018_dynamic_hold_period.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded successfully!\n');

        // Execute migration
        console.log('🚀 Executing migration SQL...');
        console.log('   This may take a few moments...\n');
        
        // Split by GO statements to execute each batch separately
        const batches = migrationSQL
            .split(/^\s*GO\s*$/im)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);
        
        let batchIndex = 1;
        for (const rawBatch of batches) {
            const batch = rawBatch.trim();
            if (batch.length > 0) {
                console.log(`   Executing batch ${batchIndex}/${batches.length}...`);
                await connection.query(batch);
                batchIndex++;
            }
        }
        
        console.log('\n✅ Migration executed successfully!\n');

        // Verify migration
        console.log('🔍 Verifying migration...\n');
        
        // Check if TrustLevel column exists
        const trustLevelCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
            AND name = 'TrustLevel'
        `);
        
        const [trustLevelRow] = trustLevelCheck.recordset;
        if (trustLevelRow && trustLevelRow.count > 0) {
            console.log('✅ TrustLevel column added successfully');
        } else {
            console.log('⚠️  TrustLevel column may not have been added (check if it already exists)');
        }

        // Check if CustomHoldDays column exists
        const customHoldDaysCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
            AND name = 'CustomHoldDays'
        `);
        
        const [customHoldDaysRow] = customHoldDaysCheck.recordset;
        if (customHoldDaysRow && customHoldDaysRow.count > 0) {
            console.log('✅ CustomHoldDays column added successfully');
        }

        // Check if OnboardedAt column exists
        const onboardedAtCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
            AND name = 'OnboardedAt'
        `);
        
        const [onboardedAtRow] = onboardedAtCheck.recordset;
        if (onboardedAtRow && onboardedAtRow.count > 0) {
            console.log('✅ OnboardedAt column added successfully');
        }

        // Check if CommissionTiers table exists
        const commissionTiersCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.tables 
            WHERE name = 'CommissionTiers'
        `);
        
        const [commissionTiersRow] = commissionTiersCheck.recordset;
        if (commissionTiersRow && commissionTiersRow.count > 0) {
            console.log('✅ CommissionTiers table created successfully');
            
            // Show commission tiers
            const tiers = await connection.query('SELECT TierName, MinMonthlySales, MaxMonthlySales, CommissionRate FROM CommissionTiers WHERE IsActive = 1');
            console.log('\n📊 Commission Tiers:');
            console.log('   ' + '-'.repeat(50));
            tiers.recordset.forEach(tier => {
                const maxSales = tier.MaxMonthlySales ? `৳${tier.MaxMonthlySales.toLocaleString()}` : 'Unlimited';
                console.log(`   ${tier.TierName}: ৳${tier.MinMonthlySales.toLocaleString()} - ${maxSales} → ${tier.CommissionRate}%`);
            });
            console.log('   ' + '-'.repeat(50));
        }

        // Check if SupplierTrustHistory table exists
        const trustHistoryCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.tables 
            WHERE name = 'SupplierTrustHistory'
        `);
        
        const [trustHistoryRow] = trustHistoryCheck.recordset;
        if (trustHistoryRow && trustHistoryRow.count > 0) {
            console.log('✅ SupplierTrustHistory table created successfully');
        }

        // Check if stored procedures exist
        const trustProcCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.procedures 
            WHERE name = 'sp_UpdateSupplierTrustLevel'
        `);
        
        const [trustProcRow] = trustProcCheck.recordset;
        if (trustProcRow && trustProcRow.count > 0) {
            console.log('✅ sp_UpdateSupplierTrustLevel stored procedure created');
        }

        const commissionFuncCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.objects 
            WHERE type = 'FN' AND name = 'fn_CalculateCommissionRate'
        `);
        
        const [commissionFuncRow] = commissionFuncCheck.recordset;
        if (commissionFuncRow && commissionFuncRow.count > 0) {
            console.log('✅ fn_CalculateCommissionRate function created');
        }

        const holdDaysFuncCheck = await connection.query(`
            SELECT COUNT(*) as count 
            FROM sys.objects 
            WHERE type = 'FN' AND name = 'fn_GetHoldDays'
        `);
        
        const [holdDaysFuncRow] = holdDaysFuncCheck.recordset;
        if (holdDaysFuncRow && holdDaysFuncRow.count > 0) {
            console.log('✅ fn_GetHoldDays function created');
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 ${migrationName} completed successfully!`);
        console.log(`${'='.repeat(60)}\n`);

        console.log('📋 Summary:');
        console.log('   • Trust levels: Bronze, Silver, Gold, Platinum');
        console.log('   • Hold periods: 7 days (Bronze), 5 days (Silver), 3 days (Gold/Platinum)');
        console.log('   • New supplier incentive: 0% commission for first 90 days');
        console.log('   • Volume-based commission tiers: 10% → 8% → 6% → 5%');
        console.log('   • Trusted Supplier badge for Silver+ levels\n');

        console.log('🚀 Next Steps:');
        console.log('   1. Update backend APIs to use new trust level functions');
        console.log('   2. Update commission calculation logic in orderController.js');
        console.log('   3. Add frontend UI for Trusted Supplier badge');
        console.log('   4. Test with sample supplier data\n');

    } catch (error) {
        console.error(`\n❌ Error during migration:`);
        console.error(`   ${error.message}\n`);
        
        if (error.code === 'ELOGIN') {
            console.error('💡 Tip: Check your database credentials in .env file');
        } else if (error.code === 'ENAME') {
            console.error('💡 Tip: Check if the database name is correct');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.close();
            console.log('📡 Database connection closed.\n');
        }
    }
}

// Run migration
if (require.main === module) {
    applyMigration018();
}

module.exports = { applyMigration018 };