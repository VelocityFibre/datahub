import { sql } from '../database/client.js';

/**
 * Check if date field is populated in Mohadin QA table
 */
async function checkMohadinDates() {
  try {
    console.log('=== Checking Mohadin QA Date Field ===\n');

    // Get sample records
    const records = await sql`
      SELECT
        drop_number,
        date,
        zone_no,
        pon_no,
        source,
        sync_timestamp
      FROM sharepoint_mohadin_qa
      ORDER BY sync_timestamp DESC
      LIMIT 10
    `;

    console.log('Latest 10 records in database:\n');
    records.forEach((r: any) => {
      console.log(`${r.drop_number.padEnd(12)} | Date: ${r.date || '(NULL)'} | Zone: ${r.zone_no || 'N/A'} | PON: ${r.pon_no || 'N/A'} | Source: ${r.source}`);
    });

    // Check how many records have dates
    const stats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(date) as with_date,
        COUNT(zone_no) as with_zone,
        COUNT(pon_no) as with_pon
      FROM sharepoint_mohadin_qa
    `;

    console.log('\n=== Statistics ===\n');
    console.log(`Total records:        ${stats[0].total}`);
    console.log(`Records with date:    ${stats[0].with_date} (${Math.round(stats[0].with_date / stats[0].total * 100)}%)`);
    console.log(`Records with zone_no: ${stats[0].with_zone} (${Math.round(stats[0].with_zone / stats[0].total * 100)}%)`);
    console.log(`Records with pon_no:  ${stats[0].with_pon} (${Math.round(stats[0].with_pon / stats[0].total * 100)}%)`);

    if (stats[0].with_date === 0) {
      console.log('\n⚠️ WARNING: No dates are being synced!');
      console.log('   Need to check the field mapping in mohadin-qa.connector.ts');
    } else if (stats[0].with_date < stats[0].total) {
      console.log('\n⚠️ WARNING: Some records missing dates');
    } else {
      console.log('\n✅ All records have dates populated');
    }

    console.log('\n=== ✅ Check Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkMohadinDates();
