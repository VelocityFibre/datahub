import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * Tracker_Home Worksheet Connector - OPTIMIZED
 * Syncs home connection tracking/status data
 */
export class TrackerHomeConnector extends BaseWorksheetConnector {
  constructor() {
    super('Tracker_Home', 'sharepoint_tracker_home');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const data: any[] = [];

    logger.info(`Extracting Tracker_Home data`);

    // NOTE: Row 2 contains the actual headers, not row 1
    const headerRow = worksheet.getRow(2);
    const headers: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value;
      const headerName = typeof value === 'string'
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        : `col_${colNumber}`;
      headers[colNumber - 1] = headerName;
    });

    logger.info(`Found ${headers.length} columns`);

    // Data starts at row 3
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip formula row and header row

      const rowData: any = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (!header) return;

        let value = cell.value;

        // Extract actual values from formulas
        if (value && typeof value === 'object' && 'result' in value) {
          value = value.result;
        }

        if (value !== null && value !== undefined && value !== '') {
          rowData[header] = value;
          hasData = true;
        }
      });

      // Only include rows with a label (home identifier)
      if (hasData && rowData['label']) {
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} home tracker records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} home trackers (OPTIMIZED)`);

    // Get existing records
    const homeLabels = data.map(h => h.label);
    const existingHomes = await sql`
      SELECT label FROM sharepoint_tracker_home
      WHERE label = ANY(${homeLabels})
    `;

    const existingLabels = new Set(existingHomes.map((h: any) => h.label));
    const newHomes = data.filter(h => !existingLabels.has(h.label));
    const updateHomes = data.filter(h => existingLabels.has(h.label));

    logger.info(`Found ${existingLabels.size} existing, ${newHomes.length} new`);

    // Batch insert new records - OPTIMIZED for large datasets
    if (newHomes.length > 0) {
      logger.info(`Inserting ${newHomes.length} new home trackers...`);
      const batchSize = 50; // Reduced from 100 for memory efficiency

      for (let i = 0; i < newHomes.length; i += batchSize) {
        const batch = newHomes.slice(i, i + batchSize);

        // Process batch sequentially to avoid memory issues
        for (const home of batch) {
          try {
            await sql`
              INSERT INTO sharepoint_tracker_home (
                label, pon_no, zone_no,
                home_sign_up_date, home_all_dates, home_drop_date,
                home_install_complete_date, home_connected_date,
                drop_install_status,
                hld_pon, ops_pon, pon_optical_status,
                project_id, raw_data, sync_timestamp
              ) VALUES (
                ${home.label},
                ${home.pon_no || null},
                ${home.zone_no || null},
                ${home.home_sign_up_date || null},
                ${home.home_all_dates || null},
                ${home.home_drop_date || null},
                ${home.home_install_complete_date || null},
                ${home.home_connected_date || null},
                ${home.drop_install || null},
                ${home.hld_pon || null},
                ${home.ops_pon || null},
                ${home.pon_optical_status || null},
                ${projectId || null},
                ${JSON.stringify(home)},
                NOW()
              )
            `;
            inserted++;
          } catch (err: any) {
            logger.error(`Failed to insert home tracker ${home.label}`, { error: err.message });
          }
        }

        // Report progress every 500 records
        if (inserted % 500 === 0 || inserted >= newHomes.length) {
          logger.info(`Progress: ${inserted} / ${newHomes.length} inserted`);
        }
      }

      logger.info(`Insert complete: ${inserted} new records added`);
    }

    // Batch update existing records - OPTIMIZED
    if (updateHomes.length > 0) {
      logger.info(`Updating ${updateHomes.length} existing home trackers...`);
      const updateBatchSize = 50;

      for (let i = 0; i < updateHomes.length; i += updateBatchSize) {
        const batch = updateHomes.slice(i, i + updateBatchSize);

        // Process updates sequentially for stability
        for (const home of batch) {
          try {
            await sql`
              UPDATE sharepoint_tracker_home
              SET
                pon_no = ${home.pon_no || null},
                zone_no = ${home.zone_no || null},
                home_sign_up_date = ${home.home_sign_up_date || null},
                home_all_dates = ${home.home_all_dates || null},
                home_drop_date = ${home.home_drop_date || null},
                home_install_complete_date = ${home.home_install_complete_date || null},
                home_connected_date = ${home.home_connected_date || null},
                drop_install_status = ${home.drop_install || null},
                hld_pon = ${home.hld_pon || null},
                ops_pon = ${home.ops_pon || null},
                pon_optical_status = ${home.pon_optical_status || null},
                raw_data = ${JSON.stringify(home)},
                sync_timestamp = NOW(),
                updated_at = NOW()
              WHERE label = ${home.label}
            `;
            updated++;
          } catch (err: any) {
            logger.error(`Failed to update home tracker ${home.label}`, { error: err.message });
          }
        }

        // Report progress every 500 records
        if (updated % 500 === 0 || updated >= updateHomes.length) {
          logger.info(`Update progress: ${updated} / ${updateHomes.length}`);
        }
      }

      logger.info(`Update complete: ${updated} records updated`);
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  }
}

export const trackerHomeConnector = new TrackerHomeConnector();

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== Tracker_Home Sync (Standalone) ===\n');

      const { sharepointClient } = await import('../client.js');
      const { sharepointConfig } = await import('../../../config/sharepoint.config.js');
      const { sql } = await import('../../../database/client.js');

      console.log('Fetching workbook from SharePoint...');
      const workbook = await sharepointClient.getExcelFile(
        sharepointConfig.lawleyFileUrl
      );

      console.log(`Found ${workbook.worksheets.length} worksheets\n`);

      // Run sync
      const startTime = Date.now();
      const result = await trackerHomeConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Speed: ${Math.round(result.records_processed / (duration / 1000))} records/second`);

      // Check database counts
      console.log('\n=== Database Status ===');
      const count = await sql`SELECT COUNT(*) as count FROM sharepoint_tracker_home`;
      console.log(`Tracker_Home records in database: ${count[0].count}`);

      console.log('\n=== ✅ Tracker_Home Sync Complete! ===\n');
      process.exit(0);

    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}
