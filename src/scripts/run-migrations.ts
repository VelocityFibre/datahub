import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    console.log('=== VelocityFibre DataHub - Database Migrations ===\n');

    // Test connection first
    console.log('Testing database connection...');
    const testResult = await sql`SELECT current_database(), version()`;
    console.log(`✅ Connected to database: ${testResult[0].current_database}\n`);

    // Migration 001: Create SharePoint tables
    console.log('📦 Running Migration 001: Create SharePoint Tables...');
    const migration001Path = join(__dirname, '../database/migrations/001_create_sharepoint_tables.sql');
    const migration001SQL = readFileSync(migration001Path, 'utf-8');

    // Split SQL into individual statements and execute
    const statements001 = migration001SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    console.log(`   Executing ${statements001.length} SQL statements...`);

    for (const statement of statements001) {
      if (statement.trim()) {
        try {
          await sql([statement] as any);
        } catch (err: any) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists')) {
            throw err;
          }
        }
      }
    }
    console.log('✅ Migration 001 complete - Tables created\n');

    // Verify tables created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'sharepoint_%'
      ORDER BY table_name
    `;
    console.log(`   Created ${tables.length} tables:`);
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));
    console.log();

    // Migration 002: Create compatibility views
    console.log('📦 Running Migration 002: Create Compatibility Views...');
    const migration002Path = join(__dirname, '../database/migrations/002_create_compatibility_views.sql');
    const migration002SQL = readFileSync(migration002Path, 'utf-8');

    // Split SQL into individual statements and execute
    const statements002 = migration002SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    console.log(`   Executing ${statements002.length} SQL statements...`);

    for (const statement of statements002) {
      if (statement.trim()) {
        try {
          await sql([statement] as any);
        } catch (err: any) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists')) {
            throw err;
          }
        }
      }
    }
    console.log('✅ Migration 002 complete - Views created\n');

    // Verify views created
    const views = await sql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND (table_name LIKE 'sow_%' OR table_name LIKE '%_summary' OR table_name LIKE '%_progress%')
      ORDER BY table_name
    `;
    console.log(`   Created ${views.length} views:`);
    views.forEach((v: any) => console.log(`   - ${v.table_name}`));
    console.log();

    // Test insert and query via view
    console.log('🧪 Testing with sample data...');

    // Insert test pole
    await sql`
      INSERT INTO sharepoint_hld_pole (
        label_1, type_1, subtyp_1, spec_1, dim1, dim2,
        status, lat, lon, pon_no, zone_no, address
      ) VALUES (
        'MIGRATION.TEST.001',
        'Pole',
        'Creosote',
        'H4SANS754',
        '7m',
        '140-160mm',
        'approved',
        -26.1234,
        28.5678,
        1,
        1,
        '123 Migration Test Street'
      )
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Inserted test pole into sharepoint_hld_pole');

    // Query via view
    const testPole = await sql`
      SELECT
        pole_number,
        pole_type,
        status,
        latitude,
        longitude,
        address
      FROM sow_poles
      WHERE pole_number = 'MIGRATION.TEST.001'
    `;

    if (testPole.length > 0) {
      console.log('✅ Successfully queried via sow_poles view:');
      console.log('   ', JSON.stringify(testPole[0], null, 2));
    } else {
      console.log('⚠️  Test pole not found in view');
    }

    console.log('\n=== ✅ All Migrations Complete! ===\n');
    console.log('Next steps:');
    console.log('1. Run sync connectors to populate tables');
    console.log('2. Test FF app APIs with new views');
    console.log('3. Verify data integrity\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run migrations
runMigrations();
