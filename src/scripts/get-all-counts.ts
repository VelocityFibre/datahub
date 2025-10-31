import { sql } from '../database/client.js';

async function getAllCounts() {
  try {
    console.log('=== VelocityFibre DataHub - Current Status ===\n');

    // Get counts for all main tables
    const tables = [
      { name: 'HLD_Pole', table: 'sharepoint_hld_pole', key: 'label_1' },
      { name: 'HLD_Home', table: 'sharepoint_hld_home', key: 'label' },
      { name: 'Tracker_Pole', table: 'sharepoint_tracker_pole', key: 'label_1' },
      { name: 'Tracker_Home', table: 'sharepoint_tracker_home', key: 'label' },
      { name: 'Nokia_Exp', table: 'sharepoint_nokia_exp', key: 'drop_number' },
      { name: '1Map_Ins', table: 'sharepoint_1map_ins', key: 'property_id' },
      { name: '1Map_Pole', table: 'sharepoint_1map_pole', key: 'property_id' },
      { name: 'Lawley QA', table: 'sharepoint_lawley_qa', key: 'drop_number' },
      { name: 'Mohadin QA', table: 'sharepoint_mohadin_qa', key: 'drop_number' },
    ];

    console.log('📊 Database Record Counts:\n');

    for (const { name, table, key } of tables) {
      try {
        // Use separate queries for each table
        let result;
        if (table === 'sharepoint_hld_pole') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_hld_pole`;
        } else if (table === 'sharepoint_hld_home') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_hld_home`;
        } else if (table === 'sharepoint_tracker_pole') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_tracker_pole`;
        } else if (table === 'sharepoint_tracker_home') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_tracker_home`;
        } else if (table === 'sharepoint_nokia_exp') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_nokia_exp`;
        } else if (table === 'sharepoint_1map_ins') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_1map_ins`;
        } else if (table === 'sharepoint_1map_pole') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_1map_pole`;
        } else if (table === 'sharepoint_lawley_qa') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_lawley_qa`;
        } else if (table === 'sharepoint_mohadin_qa') {
          result = await sql`SELECT COUNT(*) as total, MAX(sync_timestamp) as last_sync FROM sharepoint_mohadin_qa`;
        } else {
          throw new Error('Unknown table');
        }

        const total = result[0].total;
        const lastSync = result[0].last_sync
          ? new Date(result[0].last_sync).toLocaleString('en-ZA')
          : 'Never';

        console.log(`${name.padEnd(15)} : ${String(total).padStart(6)} records | Last sync: ${lastSync}`);
      } catch (err: any) {
        console.log(`${name.padEnd(15)} : ERROR - ${err.message}`);
      }
    }

    // Get latest sync activities
    console.log('\n📅 Recent Sync Activity (Last 5):\n');
    const recentSyncs = await sql`
      SELECT DISTINCT ON (table_name)
        table_name,
        sync_timestamp,
        updated_at
      FROM (
        SELECT 'HLD_Pole' as table_name, sync_timestamp, updated_at FROM sharepoint_hld_pole
        UNION ALL
        SELECT 'HLD_Home', sync_timestamp, updated_at FROM sharepoint_hld_home
        UNION ALL
        SELECT 'Tracker_Pole', sync_timestamp, updated_at FROM sharepoint_tracker_pole
        UNION ALL
        SELECT 'Tracker_Home', sync_timestamp, updated_at FROM sharepoint_tracker_home
        UNION ALL
        SELECT 'Nokia_Exp', sync_timestamp, updated_at FROM sharepoint_nokia_exp
        UNION ALL
        SELECT '1Map_Ins', sync_timestamp, updated_at FROM sharepoint_1map_ins
        UNION ALL
        SELECT '1Map_Pole', sync_timestamp, updated_at FROM sharepoint_1map_pole
        UNION ALL
        SELECT 'Lawley_QA', sync_timestamp, updated_at FROM sharepoint_lawley_qa
        UNION ALL
        SELECT 'Mohadin_QA', sync_timestamp, updated_at FROM sharepoint_mohadin_qa
      ) combined
      ORDER BY table_name, sync_timestamp DESC
    `;

    console.table(recentSyncs.map((r: any) => ({
      Table: r.table_name,
      'Last Sync': new Date(r.sync_timestamp).toLocaleString('en-ZA')
    })));

    console.log('\n=== ✅ Status Check Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

getAllCounts();
