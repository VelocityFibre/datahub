import { sql } from '../database/client.js';

async function verifyColumns() {
  try {
    console.log('=== Verifying zone_no and pon_no columns ===\n');

    // Check if columns exist
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sharepoint_lawley_qa'
      AND column_name IN ('zone_no', 'pon_no')
    `;

    console.log('1. Column Definition:');
    console.table(columns);

    if (columns.length < 2) {
      console.log('\n❌ Columns not found! Run migration first.\n');
      process.exit(1);
    }

    // Check data population
    const stats = await sql`
      SELECT
        COUNT(*) as total_records,
        COUNT(zone_no) as zone_populated,
        COUNT(pon_no) as pon_populated,
        COUNT(*) FILTER (WHERE zone_no IS NOT NULL AND pon_no IS NOT NULL) as both_populated,
        COUNT(*) FILTER (WHERE zone_no IS NULL AND pon_no IS NULL) as both_null
      FROM sharepoint_lawley_qa
    `;

    console.log('\n2. Data Population:');
    console.table(stats);

    // Show sample data
    const samples = await sql`
      SELECT
        drop_number,
        zone_no,
        pon_no,
        source,
        date
      FROM sharepoint_lawley_qa
      WHERE zone_no IS NOT NULL
      ORDER BY date DESC
      LIMIT 10
    `;

    console.log('\n3. Sample Records (with zone_no/pon_no):');
    console.table(samples);

    // Show null records
    const nullCount = await sql`
      SELECT COUNT(*) as count
      FROM sharepoint_lawley_qa
      WHERE zone_no IS NULL OR pon_no IS NULL
    `;

    console.log(`\n4. Records with NULL zone_no or pon_no: ${nullCount[0].count}`);

    if (nullCount[0].count > 0) {
      const nullSamples = await sql`
        SELECT
          drop_number,
          zone_no,
          pon_no,
          source,
          raw_data->>'zone_no' as raw_zone,
          raw_data->>'pon_no' as raw_pon
        FROM sharepoint_lawley_qa
        WHERE zone_no IS NULL OR pon_no IS NULL
        LIMIT 5
      `;

      console.log('\nSample NULL records (check raw_data):');
      console.table(nullSamples);
    }

    // Distribution by zone
    const zoneDistribution = await sql`
      SELECT
        zone_no,
        COUNT(*) as record_count
      FROM sharepoint_lawley_qa
      WHERE zone_no IS NOT NULL
      GROUP BY zone_no
      ORDER BY zone_no
      LIMIT 20
    `;

    console.log('\n5. Distribution by Zone:');
    console.table(zoneDistribution);

    // Distribution by PON
    const ponDistribution = await sql`
      SELECT
        pon_no,
        COUNT(*) as record_count
      FROM sharepoint_lawley_qa
      WHERE pon_no IS NOT NULL
      GROUP BY pon_no
      ORDER BY pon_no
      LIMIT 20
    `;

    console.log('\n6. Distribution by PON:');
    console.table(ponDistribution);

    console.log('\n=== ✅ Verification Complete! ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyColumns();
