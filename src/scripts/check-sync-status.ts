import { sql } from '../database/client.js';

async function checkStatus() {
  try {
    // Check raw table
    const poles = await sql`SELECT COUNT(*) as count FROM sharepoint_hld_pole`;
    console.log(`✅ sharepoint_hld_pole: ${poles[0].count} poles`);

    // Check view
    const viewPoles = await sql`SELECT COUNT(*) as count FROM sow_poles`;
    console.log(`✅ sow_poles view: ${viewPoles[0].count} poles`);

    // Sample data
    const sample = await sql`
      SELECT pole_number, pole_type, status, latitude, longitude
      FROM sow_poles
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\nSample poles from view:');
    console.log(JSON.stringify(sample, null, 2));

    // Check sync log
    const syncLog = await sql`
      SELECT worksheet_name, status, records_processed, records_inserted,
             sync_started_at, duration_ms
      FROM sharepoint_sync_log
      ORDER BY sync_started_at DESC
      LIMIT 5
    `;

    console.log('\nRecent syncs:');
    console.log(JSON.stringify(syncLog, null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStatus();
