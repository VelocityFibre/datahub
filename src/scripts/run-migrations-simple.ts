import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Simple migration runner - creates tables one by one
 * This works better with Neon serverless client
 */
async function runMigrations() {
  try {
    console.log('=== VelocityFibre DataHub - Database Migrations ===\n');

    // Test connection
    console.log('Testing database connection...');
    const testResult = await sql`SELECT current_database(), version()`;
    console.log(`✅ Connected to database: ${testResult[0].current_database}\n`);

    console.log('📦 Creating SharePoint tables...\n');

    // 1. Create sharepoint_hld_pole
    console.log('Creating sharepoint_hld_pole...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_hld_pole (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label_1 VARCHAR(255),
        type_1 VARCHAR(100),
        subtyp_1 VARCHAR(100),
        spec_1 VARCHAR(100),
        dim1 VARCHAR(50),
        dim2 VARCHAR(50),
        cblcpty1 VARCHAR(50),
        conntr1 VARCHAR(100),
        status VARCHAR(100),
        cmpownr VARCHAR(255),
        lat NUMERIC(10, 8),
        lon NUMERIC(11, 8),
        address TEXT,
        pon_no INTEGER,
        zone_no INTEGER,
        subplace VARCHAR(255),
        mainplce VARCHAR(255),
        mun VARCHAR(255),
        datecrtd TIMESTAMP,
        crtdby VARCHAR(255),
        date_edt TIMESTAMP,
        editby VARCHAR(255),
        comments TEXT,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_hld_pole created');

    // Create indexes for hld_pole
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_label ON sharepoint_hld_pole(label_1)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_pon_zone ON sharepoint_hld_pole(pon_no, zone_no)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_location ON sharepoint_hld_pole(lat, lon)`;

    // 2. Create sharepoint_hld_home
    console.log('Creating sharepoint_hld_home...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_hld_home (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(255),
        type VARCHAR(100),
        subtyp VARCHAR(100),
        spec VARCHAR(100),
        dim1 VARCHAR(50),
        dim2 VARCHAR(50),
        cblcpty VARCHAR(50),
        conntr VARCHAR(100),
        ntwrkptn VARCHAR(255),
        cmpownr VARCHAR(255),
        strtfeat VARCHAR(255),
        endfeat VARCHAR(255),
        lat NUMERIC(10, 8),
        lon NUMERIC(11, 8),
        address TEXT,
        pon_no INTEGER,
        zone_no INTEGER,
        subplace VARCHAR(255),
        mainplce VARCHAR(255),
        mun VARCHAR(255),
        datecrtd TIMESTAMP,
        crtdby VARCHAR(255),
        date_edt TIMESTAMP,
        editby VARCHAR(255),
        comments TEXT,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_hld_home created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_label ON sharepoint_hld_home(label)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_pole ON sharepoint_hld_home(strtfeat)`;

    // 3. Create sharepoint_tracker_pole
    console.log('Creating sharepoint_tracker_pole...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_tracker_pole (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label_1 VARCHAR(255),
        pon_no INTEGER,
        zone_no INTEGER,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_tracker_pole created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_pole_label ON sharepoint_tracker_pole(label_1)`;

    // 4. Create sharepoint_tracker_home
    console.log('Dropping old sharepoint_tracker_home if exists...');
    await sql`DROP TABLE IF EXISTS sharepoint_tracker_home CASCADE`;
    console.log('Creating sharepoint_tracker_home...');
    await sql`
      CREATE TABLE sharepoint_tracker_home (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(255),
        pon_no INTEGER,
        zone_no INTEGER,
        home_sign_up_date VARCHAR(255),
        home_all_dates VARCHAR(255),
        home_drop_date VARCHAR(255),
        home_install_complete_date VARCHAR(255),
        home_connected_date VARCHAR(255),
        drop_install_status VARCHAR(255),
        hld_pon VARCHAR(255),
        ops_pon VARCHAR(255),
        pon_optical_status VARCHAR(255),
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_tracker_home created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_home_label ON sharepoint_tracker_home(label)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_home_pon_zone ON sharepoint_tracker_home(pon_no, zone_no)`;

    // 5. Create sharepoint_nokia_exp
    console.log('Creating sharepoint_nokia_exp...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_nokia_exp (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drop_number VARCHAR(255),
        serial_number VARCHAR(255),
        timestamp TIMESTAMP,
        olt_address VARCHAR(255),
        ont_rx_sig_dbm NUMERIC(10, 3),
        link_budget_ont_to_olt_db NUMERIC(10, 3),
        olt_rx_sig_dbm NUMERIC(10, 3),
        link_budget_olt_to_ont_db NUMERIC(10, 3),
        status VARCHAR(100),
        latitude NUMERIC(15, 6),
        longitude NUMERIC(15, 6),
        current_ont_rx NUMERIC(15, 6),
        team VARCHAR(100),
        date DATE,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_nokia_exp created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_drop ON sharepoint_nokia_exp(drop_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_serial ON sharepoint_nokia_exp(serial_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_status ON sharepoint_nokia_exp(status)`;

    // 6. Create sharepoint_1map_ins
    console.log('Dropping old sharepoint_1map_ins if exists...');
    await sql`DROP TABLE IF EXISTS sharepoint_1map_ins CASCADE`;
    console.log('Creating sharepoint_1map_ins...');
    await sql`
      CREATE TABLE sharepoint_1map_ins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id VARCHAR(255),
        onemap_nad_id VARCHAR(255),
        job_id VARCHAR(255),
        status TEXT,
        flow_name_groups TEXT,
        site VARCHAR(100),
        sections VARCHAR(100),
        pons VARCHAR(100),
        location_address TEXT,
        actual_device_location_latitude NUMERIC(15, 10),
        actual_device_location_longitude NUMERIC(15, 10),
        lst_mod_by VARCHAR(255),
        lst_mod_dt TIMESTAMP,
        date_status_changed TIMESTAMP,
        pole_number VARCHAR(255),
        drop_number VARCHAR(255),
        language VARCHAR(100),
        survey_date TIMESTAMP,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_1map_ins created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_property ON sharepoint_1map_ins(property_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_pole ON sharepoint_1map_ins(pole_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_drop ON sharepoint_1map_ins(drop_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_status ON sharepoint_1map_ins(status)`;

    // 7. Create sharepoint_1map_pole
    console.log('Creating sharepoint_1map_pole...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_1map_pole (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id VARCHAR(255),
        onemap_nad_id VARCHAR(255),
        job_id VARCHAR(255),
        status TEXT,
        flow_name_groups TEXT,
        site VARCHAR(100),
        sections VARCHAR(100),
        pons VARCHAR(100),
        location_address TEXT,
        actual_device_location_latitude NUMERIC(15, 10),
        actual_device_location_longitude NUMERIC(15, 10),
        lst_mod_by VARCHAR(255),
        lst_mod_dt TIMESTAMP,
        date_status_changed TIMESTAMP,
        pole_number VARCHAR(255),
        language VARCHAR(100),
        survey_date TIMESTAMP,
        project_id UUID,
        sync_timestamp TIMESTAMP DEFAULT NOW(),
        source_file VARCHAR(500),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_1map_pole created');

    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_property ON sharepoint_1map_pole(property_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_pole ON sharepoint_1map_pole(pole_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_status ON sharepoint_1map_pole(status)`;

    // 8. Create sharepoint_lawley_qa
    console.log('Creating sharepoint_lawley_qa...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_lawley_qa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date TIMESTAMP,
        drop_number VARCHAR(255),
        source VARCHAR(50),
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
        completed_photos BOOLEAN,
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
    console.log('✅ sharepoint_lawley_qa created');

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_drop ON sharepoint_lawley_qa(drop_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_source ON sharepoint_lawley_qa(source)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_date ON sharepoint_lawley_qa(date)`;

    // 9. Create sync_log
    console.log('Creating sharepoint_sync_log...');
    await sql`
      CREATE TABLE IF NOT EXISTS sharepoint_sync_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worksheet_name VARCHAR(100) NOT NULL,
        sync_started_at TIMESTAMP NOT NULL,
        sync_completed_at TIMESTAMP,
        status VARCHAR(50) NOT NULL,
        records_processed INTEGER DEFAULT 0,
        records_inserted INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        error_message TEXT,
        error_details JSONB,
        duration_ms INTEGER,
        file_url VARCHAR(500),
        file_size_bytes BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ sharepoint_sync_log created\n');

    // Create views
    console.log('📦 Creating compatibility views...\n');

    // Drop existing views/tables if they exist
    console.log('Cleaning up old sow_* views/tables if they exist...');
    await sql`DROP VIEW IF EXISTS sow_poles CASCADE`;
    await sql`DROP VIEW IF EXISTS sow_drops CASCADE`;
    await sql`DROP VIEW IF EXISTS sow_fibre CASCADE`;
    console.log('✅ Cleanup complete\n');

    // View: sow_poles
    console.log('Creating sow_poles view...');
    await sql`
      CREATE OR REPLACE VIEW sow_poles AS
      SELECT
        hld.id,
        hld.project_id,
        hld.label_1 AS pole_number,
        hld.lat AS latitude,
        hld.lon AS longitude,
        COALESCE(
          CASE
            WHEN hld.status ILIKE '%approved%' THEN 'approved'
            WHEN hld.status ILIKE '%permission%' THEN 'permission_pending'
            ELSE 'planned'
          END,
          'planned'
        ) AS status,
        hld.type_1 AS pole_type,
        hld.spec_1 AS pole_spec,
        hld.dim1 AS height,
        hld.dim2 AS diameter,
        hld.cmpownr AS owner,
        hld.pon_no,
        hld.zone_no,
        hld.address,
        COALESCE(hld.mainplce, hld.mun) AS municipality,
        hld.datecrtd AS created_date,
        hld.crtdby AS created_by,
        hld.comments,
        hld.raw_data,
        hld.updated_at,
        hld.created_at
      FROM sharepoint_hld_pole hld
    `;
    console.log('✅ sow_poles view created');

    // View: sow_drops
    console.log('Creating sow_drops view...');
    await sql`
      CREATE OR REPLACE VIEW sow_drops AS
      SELECT
        hld.id,
        hld.project_id,
        hld.label AS drop_number,
        hld.strtfeat AS pole_number,
        hld.lat AS latitude,
        hld.lon AS longitude,
        COALESCE(
          CASE
            WHEN hld.datecrtd IS NOT NULL THEN 'planned'
            ELSE 'pending'
          END,
          'pending'
        ) AS status,
        hld.address,
        COALESCE(hld.mainplce, hld.mun) AS municipality,
        hld.pon_no,
        hld.zone_no,
        hld.conntr AS contractor,
        hld.cblcpty AS cable_capacity,
        hld.datecrtd AS created_date,
        hld.crtdby AS created_by,
        hld.comments,
        hld.raw_data,
        hld.updated_at,
        hld.created_at
      FROM sharepoint_hld_home hld
    `;
    console.log('✅ sow_drops view created\n');

    // Verify tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'sharepoint_%'
      ORDER BY table_name
    `;
    console.log(`Created ${tables.length} tables:`);
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));

    // Verify views
    const views = await sql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name LIKE 'sow_%'
      ORDER BY table_name
    `;
    console.log(`\nCreated ${views.length} views:`);
    views.forEach((v: any) => console.log(`   - ${v.table_name}`));

    // Test insert
    console.log('\n🧪 Testing with sample data...');
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
    console.log('✅ Inserted test pole');

    // Test view query
    const testPole = await sql`
      SELECT pole_number, pole_type, status, latitude, longitude
      FROM sow_poles
      WHERE pole_number = 'MIGRATION.TEST.001'
    `;

    if (testPole.length > 0) {
      console.log('✅ Successfully queried via sow_poles view:');
      console.log('   ', JSON.stringify(testPole[0], null, 2));
    }

    console.log('\n=== ✅ Migrations Complete! ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

runMigrations();
