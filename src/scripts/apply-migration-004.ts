import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Apply migration 004 - Create separate Mohadin QA table
 */
async function applyMigration004() {
  try {
    console.log('=== Migration 004: Create Mohadin QA Table ===\n');

    // Test connection
    console.log('Testing database connection...');
    const testResult = await sql`SELECT current_database()`;
    console.log(`✅ Connected to database: ${testResult[0].current_database}\n`);

    // Create sharepoint_mohadin_qa table
    console.log('Creating sharepoint_mohadin_qa table...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_mohadin_qa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date TIMESTAMP,
        drop_number VARCHAR(255),
        source VARCHAR(50),
        zone_no INTEGER,
        pon_no INTEGER,
        step_1_property_frontage BOOLEAN,
        step_2_location_on_wall BOOLEAN,
        step_3_outside_cable_span BOOLEAN,
        step_4_home_entry_outside BOOLEAN,
        step_5_home_entry_inside BOOLEAN,
        step_6_fibre_entry_to_ont BOOLEAN,
        step_7_work_area_completion BOOLEAN,
        step_8_ont_barcode BOOLEAN,
        step_9_mini_ups_serial BOOLEAN,
        step_10_powermeter_before_activation BOOLEAN,
        step_11_active_broadband_light BOOLEAN,
        step_12_customer_signature BOOLEAN,
        completed_photos TEXT,
        outstanding_photos TEXT,
        user_name VARCHAR(255),
        outstanding_photos_loaded_1map BOOLEAN,
        qa_completed_loaded_sp BOOLEAN,
        comment TEXT,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Table created');

    // Create indexes
    console.log('Creating indexes...');
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_drop
        ON sharepoint_mohadin_qa(drop_number)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_source
        ON sharepoint_mohadin_qa(source)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_date
        ON sharepoint_mohadin_qa(date)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_zone_pon
        ON sharepoint_mohadin_qa(zone_no, pon_no)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_pon
        ON sharepoint_mohadin_qa(pon_no)
    `;
    console.log('✅ Indexes created');

    // Add comments
    console.log('Adding table comments...');
    await sql`
      COMMENT ON TABLE sharepoint_mohadin_qa IS
      'QA photo verification data from Mohadin Activations sheet (separate from Lawley)'
    `;
    await sql`
      COMMENT ON COLUMN sharepoint_mohadin_qa.zone_no IS
      'Network zone number from SharePoint'
    `;
    await sql`
      COMMENT ON COLUMN sharepoint_mohadin_qa.pon_no IS
      'PON number from SharePoint'
    `;
    await sql`
      COMMENT ON COLUMN sharepoint_mohadin_qa.source IS
      'Source of data: mohadin_historical or mohadin_activations'
    `;
    console.log('✅ Comments added');

    // Check existing Mohadin records in Lawley table
    const existingMohadinRecords = await sql`
      SELECT COUNT(*) as count
      FROM sharepoint_lawley_qa
      WHERE source IN ('mohadin_historical', 'mohadin_activations')
    `;
    console.log(`\nFound ${existingMohadinRecords[0].count} Mohadin records in sharepoint_lawley_qa`);

    if (existingMohadinRecords[0].count > 0) {
      console.log('\nMigrating existing Mohadin records to new table...');
      await sql`
        INSERT INTO sharepoint_mohadin_qa (
          id, date, drop_number, source, zone_no, pon_no,
          step_1_property_frontage, step_2_location_on_wall, step_3_outside_cable_span,
          step_4_home_entry_outside, step_5_home_entry_inside, step_6_fibre_entry_to_ont,
          step_7_work_area_completion, step_8_ont_barcode, step_9_mini_ups_serial,
          step_10_powermeter_before_activation, step_11_active_broadband_light,
          step_12_customer_signature, completed_photos, outstanding_photos,
          user_name, outstanding_photos_loaded_1map, qa_completed_loaded_sp,
          comment, project_id, sync_timestamp, source_file, raw_data,
          created_at, updated_at
        )
        SELECT
          id, date, drop_number, source, zone_no, pon_no,
          step_1_property_frontage, step_2_location_on_wall, step_3_outside_cable_span,
          step_4_home_entry_outside, step_5_home_entry_inside, step_6_fibre_entry_to_ont,
          step_7_work_area_completion, step_8_ont_barcode, step_9_mini_ups_serial,
          step_10_powermeter_before_activation, step_11_active_broadband_light,
          step_12_customer_signature, completed_photos, outstanding_photos,
          user_name, outstanding_photos_loaded_1map, qa_completed_loaded_sp,
          comment, project_id, sync_timestamp, source_file, raw_data,
          created_at, updated_at
        FROM sharepoint_lawley_qa
        WHERE source IN ('mohadin_historical', 'mohadin_activations')
        ON CONFLICT (drop_number) DO NOTHING
      `;

      const migratedCount = await sql`
        SELECT COUNT(*) as count FROM sharepoint_mohadin_qa
      `;
      console.log(`✅ Migrated ${migratedCount[0].count} records to sharepoint_mohadin_qa`);

      console.log('\nRemoving Mohadin records from Lawley table...');
      await sql`
        DELETE FROM sharepoint_lawley_qa
        WHERE source IN ('mohadin_historical', 'mohadin_activations')
      `;
      console.log('✅ Cleanup complete');
    }

    // Verify final counts
    const lawleyCount = await sql`SELECT COUNT(*) as count FROM sharepoint_lawley_qa`;
    const mohadinCount = await sql`SELECT COUNT(*) as count FROM sharepoint_mohadin_qa`;

    console.log('\n=== Final Status ===');
    console.log(`Lawley QA records: ${lawleyCount[0].count}`);
    console.log(`Mohadin QA records: ${mohadinCount[0].count}`);

    console.log('\n=== ✅ Migration 004 Complete! ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    logger.error('Migration 004 failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

applyMigration004();
