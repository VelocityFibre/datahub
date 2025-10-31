import { sql } from '../database/client.js';

/**
 * Check sync health and report status
 * Use this to monitor if syncs are running properly
 */
async function checkSyncHealth() {
  try {
    console.log('=== VelocityFibre DataHub - Sync Health Check ===\n');
    console.log(`Run Time: ${new Date().toLocaleString('en-ZA')}\n`);

    const tables = [
      { name: 'HLD_Pole', table: 'sharepoint_hld_pole', expected: 4000 },
      { name: 'HLD_Home', table: 'sharepoint_hld_home', expected: 23000 },
      { name: 'Tracker_Pole', table: 'sharepoint_tracker_pole', expected: 4900 },
      { name: 'Tracker_Home', table: 'sharepoint_tracker_home', expected: 23000 },
      { name: 'Nokia_Exp', table: 'sharepoint_nokia_exp', expected: 1700 },
      { name: '1Map_Ins', table: 'sharepoint_1map_ins', expected: 21000 },
      { name: '1Map_Pole', table: 'sharepoint_1map_pole', expected: 5300 },
      { name: 'Lawley_QA', table: 'sharepoint_lawley_qa', expected: 1500 },
      { name: 'Mohadin_QA', table: 'sharepoint_mohadin_qa', expected: 300 },
    ];

    const results: any[] = [];
    let allHealthy = true;

    console.log('📊 Table Status:\n');

    for (const { name, table, expected } of tables) {
      try {
        const [stats] = await sql`
          SELECT
            COUNT(*) as total,
            MAX(sync_timestamp) as last_sync,
            MAX(updated_at) as last_update
          FROM ${sql(table)}
        `;

        const total = parseInt(stats.total);
        const lastSync = stats.last_sync ? new Date(stats.last_sync) : null;
        const hoursAgo = lastSync
          ? Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60))
          : null;

        const health = {
          name,
          total,
          lastSync: lastSync ? lastSync.toLocaleString('en-ZA') : 'Never',
          hoursAgo,
          status: 'UNKNOWN'
        };

        // Determine health status
        if (!lastSync) {
          health.status = '❌ NEVER_SYNCED';
          allHealthy = false;
        } else if (hoursAgo > 24) {
          health.status = '⚠️  STALE';
          allHealthy = false;
        } else if (total < expected * 0.5) {
          health.status = '⚠️  LOW_COUNT';
          allHealthy = false;
        } else {
          health.status = '✅ HEALTHY';
        }

        results.push(health);

        const hoursStr = hoursAgo !== null ? `${hoursAgo}h ago` : 'Never';
        console.log(`${health.status.padEnd(15)} ${name.padEnd(15)} : ${String(total).padStart(6)} records | Last: ${hoursStr}`);

      } catch (err: any) {
        console.log(`❌ ERROR      ${name.padEnd(15)} : ${err.message}`);
        allHealthy = false;
      }
    }

    // Check for failed syncs
    console.log('\n🔍 Recent Failures:\n');
    const staleSheets = results.filter(r => r.status.includes('STALE') || r.status.includes('NEVER'));

    if (staleSheets.length > 0) {
      staleSheets.forEach(s => {
        console.log(`   ⚠️  ${s.name}: Last synced ${s.hoursAgo}h ago (${s.lastSync})`);
      });
    } else {
      console.log('   ✅ No stale syncs detected');
    }

    // Overall health
    console.log('\n=== Overall Status ===\n');
    if (allHealthy) {
      console.log('✅ ALL SYSTEMS HEALTHY');
      console.log('   All tables synced within last 24 hours');
    } else {
      console.log('⚠️  ISSUES DETECTED');
      console.log('   Some tables are stale or have errors');
      console.log('   Check logs: tail -f logs/datahub.log');
      console.log('   Check errors: tail -f logs/error.log');
      process.exit(1);  // Exit with error code for monitoring
    }

    console.log('');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Health check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSyncHealth();
