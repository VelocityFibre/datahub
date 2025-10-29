import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';
import { sharepointClient } from '../client.js';
import { sharepointConfig } from '../../../config/sharepoint.config.js';

/**
 * HLD_Pole Worksheet Connector - OPTIMIZED with Batch Inserts
 * Syncs pole infrastructure design data from SharePoint to sharepoint_hld_pole table
 */
export class HLDPoleConnectorOptimized extends BaseWorksheetConnector {
  constructor() {
    super('HLD_Pole', 'sharepoint_hld_pole');
  }

  /**
   * Extract data from HLD_Pole worksheet
   */
  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting HLD_Pole data with ${headers.length} columns`);

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = this.extractRowData(row, headers);

      if (rowData && rowData['label_1']) {
        // Only include rows with a pole label
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} poles from HLD_Pole worksheet`);

    return data;
  }

  /**
   * Upsert poles to database - OPTIMIZED with batch operations
   * Strategy: Check existing in batch, then insert new in batch
   */
  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} poles to ${this.tableName} (OPTIMIZED)`);

    // Step 1: Get all existing pole labels in one query
    const poleLabels = data.map(p => p.label_1);
    const existingPoles = await sql`
      SELECT label_1
      FROM sharepoint_hld_pole
      WHERE label_1 = ANY(${poleLabels})
    `;

    const existingLabels = new Set(existingPoles.map((p: any) => p.label_1));
    logger.info(`Found ${existingLabels.size} existing poles, ${data.length - existingLabels.size} new poles`);

    // Step 2: Separate new vs existing
    const newPoles = data.filter(p => !existingLabels.has(p.label_1));
    const updatePoles = data.filter(p => existingLabels.has(p.label_1));

    // Step 3: Batch insert new poles
    if (newPoles.length > 0) {
      logger.info(`Inserting ${newPoles.length} new poles in batches...`);
      const batchSize = 100;

      for (let i = 0; i < newPoles.length; i += batchSize) {
        const batch = newPoles.slice(i, i + batchSize);

        try {
          // Batch insert - insert multiple poles in parallel
          const insertPromises = batch.map(pole =>
            sql`
              INSERT INTO sharepoint_hld_pole (
                label_1, type_1, subtyp_1, spec_1, dim1, dim2,
                status, cmpownr, lat, lon, address,
                pon_no, zone_no, mainplce, mun,
                project_id, raw_data, sync_timestamp
              ) VALUES (
                ${pole.label_1},
                ${pole.type_1 || null},
                ${pole.subtyp_1 || null},
                ${pole.spec_1 || null},
                ${pole.dim1 || null},
                ${pole.dim2 || null},
                ${pole.status || null},
                ${pole.cmpownr || null},
                ${pole.lat || null},
                ${pole.lon || null},
                ${pole.address || null},
                ${pole.pon_no || null},
                ${pole.zone_no || null},
                ${pole.mainplce || null},
                ${pole.mun || null},
                ${projectId || null},
                ${JSON.stringify(pole)},
                NOW()
              )
            `.catch(err => {
              logger.error(`Failed to insert pole ${pole.label_1}`, { error: err.message });
              return null;
            })
          );

          // Wait for all inserts in this batch to complete
          const results = await Promise.all(insertPromises);

          // Count successful inserts
          const successfulInserts = results.filter(r => r !== null).length;
          inserted += successfulInserts;

          if (successfulInserts < batch.length) {
            logger.warn(`Batch had ${batch.length - successfulInserts} failures`);
          }

          logger.info(`Batch insert progress: ${inserted} / ${newPoles.length} new poles inserted`);

        } catch (error: any) {
          logger.error(`Batch insert failed`, {
            error: error.message,
            batchStart: i,
            batchSize: batch.length
          });
        }
      }
    }

    // Step 4: Batch update existing poles
    if (updatePoles.length > 0) {
      logger.info(`Updating ${updatePoles.length} existing poles in batches...`);
      const updateBatchSize = 50; // Smaller batch for updates

      for (let i = 0; i < updatePoles.length; i += updateBatchSize) {
        const batch = updatePoles.slice(i, i + updateBatchSize);

        // Run updates in parallel within batch
        const updatePromises = batch.map(pole =>
          sql`
            UPDATE sharepoint_hld_pole
            SET
              type_1 = ${pole.type_1 || null},
              subtyp_1 = ${pole.subtyp_1 || null},
              spec_1 = ${pole.spec_1 || null},
              dim1 = ${pole.dim1 || null},
              dim2 = ${pole.dim2 || null},
              status = ${pole.status || null},
              cmpownr = ${pole.cmpownr || null},
              lat = ${pole.lat || null},
              lon = ${pole.lon || null},
              address = ${pole.address || null},
              pon_no = ${pole.pon_no || null},
              zone_no = ${pole.zone_no || null},
              mainplce = ${pole.mainplce || null},
              mun = ${pole.mun || null},
              raw_data = ${JSON.stringify(pole)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE label_1 = ${pole.label_1}
          `.catch(err => {
            logger.error(`Failed to update pole ${pole.label_1}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(updatePromises);
        const successfulUpdates = results.filter(r => r !== null).length;
        updated += successfulUpdates;

        logger.info(`Update progress: ${updated} / ${updatePoles.length} poles updated`);
      }
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);

    return { inserted, updated };
  }
}

// Export singleton instance
export const hldPoleConnectorOptimized = new HLDPoleConnectorOptimized();

// CLI execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== HLD_Pole Connector Test (OPTIMIZED) ===\n');

      // Fetch workbook from SharePoint
      console.log('Fetching Excel file from SharePoint...');
      const workbook = await sharepointClient.getExcelFile(
        sharepointConfig.lawleyFileUrl
      );

      console.log(`Found ${workbook.worksheets.length} worksheets\n`);

      // Run sync
      const startTime = Date.now();
      const result = await hldPoleConnectorOptimized.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Speed: ${Math.round(result.records_processed / (duration / 1000))} poles/second`);

      // Query view to verify
      console.log('\n=== Sample from sow_poles view ===');
      const samplePoles = await sql`
        SELECT
          pole_number,
          pole_type,
          status,
          latitude,
          longitude,
          pon_no,
          zone_no
        FROM sow_poles
        ORDER BY created_at DESC
        LIMIT 5
      `;

      console.log(JSON.stringify(samplePoles, null, 2));

      // Get total count
      const countResult = await sql`SELECT COUNT(*) as count FROM sow_poles`;
      console.log(`\nTotal poles in database: ${countResult[0].count}`);

      process.exit(result.success ? 0 : 1);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
