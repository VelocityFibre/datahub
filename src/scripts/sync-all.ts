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
 */
async function syncAll() {
  const startTime = Date.now();
  const results: any[] = [];

  try {
    console.log('=== VelocityFibre DataHub - Full Sync ===\n');
    console.log('Fetching Excel file from SharePoint...\n');

    // Fetch workbook once
    const workbook = await sharepointClient.getExcelFile(
      sharepointConfig.lawleyFileUrl
    );

    console.log(`✅ Downloaded file (${workbook.worksheets.length} worksheets)\n`);
    console.log('Starting sync for all connectors...\n');
    console.log('='.repeat(80) + '\n');

    // 1. HLD_Pole (Foundation - Design Data)
    console.log('📦 1/9 - Syncing HLD_Pole (Pole Design Data)...');
    const poleResult = await hldPoleConnectorOptimized.sync(workbook);
    results.push({ worksheet: 'HLD_Pole', ...poleResult });
    console.log(`✅ HLD_Pole: ${poleResult.records_processed} records (${poleResult.records_inserted} inserted, ${poleResult.records_updated} updated)`);
    console.log('');

    // 2. HLD_Home (Foundation - Home Design Data)
    console.log('📦 2/9 - Syncing HLD_Home (Home/Premises Design Data)...');
    const homeResult = await hldHomeConnector.sync(workbook);
    results.push({ worksheet: 'HLD_Home', ...homeResult });
    console.log(`✅ HLD_Home: ${homeResult.records_processed} records (${homeResult.records_inserted} inserted, ${homeResult.records_updated} updated)`);
    console.log('');

    // 3. Tracker_Pole (Status Updates)
    console.log('📦 3/9 - Syncing Tracker_Pole (Pole Installation Status)...');
    const trackerPoleResult = await trackerPoleConnector.sync(workbook);
    results.push({ worksheet: 'Tracker_Pole', ...trackerPoleResult });
    console.log(`✅ Tracker_Pole: ${trackerPoleResult.records_processed} records (${trackerPoleResult.records_inserted} inserted, ${trackerPoleResult.records_updated} updated)`);
    console.log('');

    // 4. Tracker_Home (Connection Status)
    console.log('📦 4/9 - Syncing Tracker_Home (Home Connection Status)...');
    const trackerHomeResult = await trackerHomeConnector.sync(workbook);
    results.push({ worksheet: 'Tracker_Home', ...trackerHomeResult });
    console.log(`✅ Tracker_Home: ${trackerHomeResult.records_processed} records (${trackerHomeResult.records_inserted} inserted, ${trackerHomeResult.records_updated} updated)`);
    console.log('');

    // 5. Nokia_Exp (Activation Data)
    console.log('📦 5/9 - Syncing Nokia_Exp (ONT Activation Data)...');
    const nokiaExpResult = await nokiaExpConnector.sync(workbook);
    results.push({ worksheet: 'Nokia_Exp', ...nokiaExpResult });
    console.log(`✅ Nokia_Exp: ${nokiaExpResult.records_processed} records (${nokiaExpResult.records_inserted} inserted, ${nokiaExpResult.records_updated} updated)`);
    console.log('');

    // 6. 1Map_Ins (OneMap Installation Data)
    console.log('📦 6/9 - Syncing 1Map_Ins (OneMap Installation Data)...');
    const oneMapInsResult = await oneMapInsConnector.sync(workbook);
    results.push({ worksheet: '1Map_Ins', ...oneMapInsResult });
    console.log(`✅ 1Map_Ins: ${oneMapInsResult.records_processed} records (${oneMapInsResult.records_inserted} inserted, ${oneMapInsResult.records_updated} updated)`);
    console.log('');

    // 7. 1Map_Pole (OneMap Pole Cross-Reference)
    console.log('📦 7/9 - Syncing 1Map_Pole (OneMap Pole Cross-Reference)...');
    const oneMapPoleResult = await oneMapPoleConnector.sync(workbook);
    results.push({ worksheet: '1Map_Pole', ...oneMapPoleResult });
    console.log(`✅ 1Map_Pole: ${oneMapPoleResult.records_processed} records (${oneMapPoleResult.records_inserted} inserted, ${oneMapPoleResult.records_updated} updated)`);
    console.log('');

    // 8. Lawley Activations (QA Photo Verification - Ongoing)
    console.log('📦 8/9 - Syncing Lawley Activations (QA Photo Verification)...');
    const lawleyActivationsResult = await lawleyActivationsConnector.sync(workbook);
    results.push({ worksheet: 'Lawley_Activations', ...lawleyActivationsResult });
    console.log(`✅ Lawley Activations: ${lawleyActivationsResult.records_processed} records (${lawleyActivationsResult.records_inserted} inserted, ${lawleyActivationsResult.records_updated} updated)`);
    console.log('');

    // 9. Mohadin Activations (QA Photo Verification with Zone/PON - Different File)
    console.log('📦 9/9 - Syncing Mohadin Activations (QA with Zone/PON)...');
    console.log('Fetching Mohadin Excel file from SharePoint...');
    const mohadinWorkbook = await sharepointClient.getExcelFile(
      sharepointConfig.mohadinFileUrl
    );
    const mohadinActivationsResult = await mohadinActivationsConnector.sync(mohadinWorkbook);
    results.push({ worksheet: 'Mohadin_Activations', ...mohadinActivationsResult });
    console.log(`✅ Mohadin Activations: ${mohadinActivationsResult.records_processed} records (${mohadinActivationsResult.records_inserted} inserted, ${mohadinActivationsResult.records_updated} updated)`);
    console.log('');

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
