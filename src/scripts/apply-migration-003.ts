import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

async function applyMigration003() {
  try {
    console.log('=== Applying Migration 003: Add zone_no and pon_no to lawley_qa ===\n');

    // Add columns
    console.log('Adding zone_no column...');
    await sql`
      ALTER TABLE sharepoint_lawley_qa
      ADD COLUMN IF NOT EXISTS zone_no INTEGER
    `;
    console.log('✅ zone_no column added');

    console.log('Adding pon_no column...');
    await sql`
      ALTER TABLE sharepoint_lawley_qa
      ADD COLUMN IF NOT EXISTS pon_no INTEGER
    `;
    console.log('✅ pon_no column added');

    // Create indexes
    console.log('Creating index on (zone_no, pon_no)...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_zone_pon
      ON sharepoint_lawley_qa(zone_no, pon_no)
    `;
    console.log('✅ Index created: idx_sharepoint_lawley_qa_zone_pon');

    console.log('Creating index on pon_no...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_pon
      ON sharepoint_lawley_qa(pon_no)
    `;
    console.log('✅ Index created: idx_sharepoint_lawley_qa_pon');

    // Add comments
    await sql`
      COMMENT ON COLUMN sharepoint_lawley_qa.zone_no
      IS 'Network zone number from SharePoint'
    `;
    await sql`
      COMMENT ON COLUMN sharepoint_lawley_qa.pon_no
      IS 'PON number from SharePoint'
    `;
    console.log('✅ Column comments added\n');

    // Verify
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sharepoint_lawley_qa'
      AND column_name IN ('zone_no', 'pon_no')
      ORDER BY column_name
    `;

    console.log('Verification:');
    console.table(columns);

    console.log('\n=== ✅ Migration 003 Complete! ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    logger.error('Migration 003 failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

applyMigration003();
