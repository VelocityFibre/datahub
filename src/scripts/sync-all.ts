import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';
import { hldPoleConnectorOptimized } from '../connectors/sharepoint/worksheets/hld-pole-optimized.connector.js';
import { hldHomeConnector } from '../connectors/sharepoint/worksheets/hld-home.connector.js';
import { trackerPoleConnector } from '../connectors/sharepoint/worksheets/tracker-pole.connector.js';
import { trackerHomeConnector } from '../connectors/sharepoint/worksheets/tracker-home.connector.js';
import { nokiaExpConnector } from '../connectors/sharepoint/worksheets/nokia-exp.connector.js';
import { oneMapInsConnector } from '../connectors/sharepoint/worksheets/onemap-ins.connector.js';
import { oneMapPoleConnector } from '../connectors/sharepoint/worksheets/onemap-pole.connector.js';
import { lawleyActivationsConnector } from '../connectors/sharepoint/worksheets/lawley-qa.connector.js';
import { mohadinActivationsConnector } from '../connectors/sharepoint/worksheets/mohadin-qa.connector.js';
import { logger } from '../utils/logger.js';
import { sql } from '../database/client.js';

/**
 * Master sync script - syncs all available worksheets
 * MEMORY OPTIMIZED: Processes one sheet at a time to avoid OOM on small VPS
 */
async function syncAll() {
  const startTime = Date.now();
  const results: any[] = [];

  try {
    console.log('=== VelocityFibre DataHub - Full Sync (Memory Optimized) ===\n');

    // Helper function to fetch workbook and release memory after each sync
    const syncWithMemoryManagement = async (
      connector: any,
      worksheetName: string,
      stepNum: number,
      totalSteps: number
    ) => {
      console.log(`📦 ${stepNum}/${totalSteps} - Syncing ${worksheetName}...`);

      // Fetch fresh workbook for this sheet only
      const workbook = await sharepointClient.getExcelFile(
        sharepointConfig.lawleyFileUrl
      );

      const result = await connector.sync(workbook);

      // Help garbage collector release memory
      workbook.worksheets.forEach((ws: any) => {
        ws.destroy && ws.destroy();
      });

      console.log(`✅ ${worksheetName}: ${result.records_processed} records (${result.records_inserted} inserted, ${result.records_updated} updated)`);
      console.log('');

      return { worksheet: worksheetName, ...result };
    };

    console.log('Starting memory-optimized sync...\n');
    console.log('='.repeat(80) + '\n');

    // 1. HLD_Pole (Foundation - Design Data)
    results.push(await syncWithMemoryManagement(hldPoleConnectorOptimized, 'HLD_Pole', 1, 9));

    // 2. HLD_Home (Foundation - Home Design Data)
    results.push(await syncWithMemoryManagement(hldHomeConnector, 'HLD_Home', 2, 9));

    // 3. Tracker_Pole (Status Updates)
    results.push(await syncWithMemoryManagement(trackerPoleConnector, 'Tracker_Pole', 3, 9));

    // 4. Tracker_Home (Connection Status)
    results.push(await syncWithMemoryManagement(trackerHomeConnector, 'Tracker_Home', 4, 9));

    // 5. Nokia_Exp (Activation Data)
    results.push(await syncWithMemoryManagement(nokiaExpConnector, 'Nokia_Exp', 5, 9));

    // 6. 1Map_Ins (OneMap Installation Data)
    results.push(await syncWithMemoryManagement(oneMapInsConnector, '1Map_Ins', 6, 9));

    // 7. 1Map_Pole (OneMap Pole Cross-Reference)
    results.push(await syncWithMemoryManagement(oneMapPoleConnector, '1Map_Pole', 7, 9));

    // 8. Lawley Activations (QA Photo Verification - Ongoing)
    results.push(await syncWithMemoryManagement(lawleyActivationsConnector, 'Lawley_Activations', 8, 9));

    // 9. Mohadin Activations (QA Photo Verification with Zone/PON - Different File)
    console.log('📦 9/9 - Syncing Mohadin Activations (QA with Zone/PON)...');
    const mohadinWorkbook = await sharepointClient.getExcelFile(
      sharepointConfig.mohadinFileUrl
    );
    const mohadinActivationsResult = await mohadinActivationsConnector.sync(mohadinWorkbook);
    results.push({ worksheet: 'Mohadin_Activations', ...mohadinActivationsResult });
    console.log(`✅ Mohadin Activations: ${mohadinActivationsResult.records_processed} records (${mohadinActivationsResult.records_inserted} inserted, ${mohadinActivationsResult.records_updated} updated)`);
    console.log('');

    // Release Mohadin workbook memory
    mohadinWorkbook.worksheets.forEach((ws: any) => {
      ws.destroy && ws.destroy();
    });

    console.log('='.repeat(80) + '\n');

    // Summary
    const totalDuration = Date.now() - startTime;
    const totalProcessed = results.reduce((sum, r) => sum + r.records_processed, 0);
    const totalInserted = results.reduce((sum, r) => sum + r.records_inserted, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.records_updated, 0);
    const successCount = results.filter(r => r.success).length;

    console.log('=== Sync Summary ===\n');
    console.log(`Total worksheets synced: ${successCount}/${results.length}`);
    console.log(`Total records processed: ${totalProcessed}`);
    console.log(`Total records inserted: ${totalInserted}`);
    console.log(`Total records updated: ${totalUpdated}`);
    console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Average speed: ${Math.round(totalProcessed / (totalDuration / 1000))} records/second`);
    console.log('');

    // Check database counts
    console.log('=== Database Status ===\n');
    const poleCount = await sql`SELECT COUNT(*) as count FROM sow_poles`;
    const homeCount = await sql`SELECT COUNT(*) as count FROM sow_drops`;

    console.log(`Poles in database: ${poleCount[0].count}`);
    console.log(`Homes in database: ${homeCount[0].count}`);
    console.log('');

    // Show failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('⚠️  Failed syncs:');
      failures.forEach(f => {
        console.log(`   - ${f.worksheet}: ${f.error}`);
      });
      console.log('');
    }

    console.log('=== ✅ Full Sync Complete! ===\n');
    process.exit(failures.length > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('\n❌ Full sync failed:', error.message);
    logger.error('Full sync failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

syncAll();
