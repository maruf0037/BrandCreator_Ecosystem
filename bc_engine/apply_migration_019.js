/**
 * Migration 019: User Onboarding and Profiles
 * 
 * Applies the schema changes for Supplier Onboarding and Customer Profiles.
 */

require('dotenv').config({ path: '.env' });
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function applyMigration019() {
    const migrationName = 'Migration 019: User Onboarding and Profiles';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting ${migrationName}`);
    console.log(`${'='.repeat(60)}\n`);

    const config = {
        user: process.env.SQL_USER || 'sa',
        password: process.env.SQL_PASSWORD || '',
        server: process.env.SQL_SERVER || 'localhost',
        database: process.env.SQL_DATABASE || 'BrandCreator_HUBDB',
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    let connection;

    try {
        console.log('📡 Connecting to SQL Server...');
        connection = await sql.connect(config);
        console.log('✅ Connected to database successfully!\n');

        const migrationPath = path.join(__dirname, 'migration_019_user_onboarding.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded successfully!\n');

        console.log('🚀 Executing migration SQL...');
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

        console.log('🔍 Verifying migration...\n');
        
        const supplierProfilesCheck = await connection.query(`
            SELECT COUNT(*) as count FROM sys.tables WHERE name = 'SupplierProfiles'
        `);
        if (supplierProfilesCheck.recordset[0].count > 0) {
            console.log('✅ SupplierProfiles table exists in DB');
        } else {
            console.log('❌ SupplierProfiles table creation failed');
        }

        const customerProfilesCheck = await connection.query(`
            SELECT COUNT(*) as count FROM sys.tables WHERE name = 'CustomerProfiles'
        `);
        if (customerProfilesCheck.recordset[0].count > 0) {
            console.log('✅ CustomerProfiles table exists in DB');
        } else {
            console.log('❌ CustomerProfiles table creation failed');
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 ${migrationName} completed successfully!`);
        console.log(`${'='.repeat(60)}\n`);
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ Error during migration:`);
        console.error(`   ${error.message}\n`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.close();
            console.log('📡 Database connection closed.\n');
        }
    }
}

if (require.main === module) {
    applyMigration019();
}
