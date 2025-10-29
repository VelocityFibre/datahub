import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * Nokia_Exp Worksheet Connector - OPTIMIZED
 * Syncs Nokia ONT activation and signal data
 */
export class NokiaExpConnector extends BaseWorksheetConnector {
  constructor() {
    super('Nokia_Exp', 'sharepoint_nokia_exp');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting Nokia_Exp data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      if (rowData && rowData['drop_number']) {
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} Nokia activation records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} Nokia activations (OPTIMIZED)`);

    // Get existing records
    const dropNumbers = data.map(d => d.drop_number);
    const existingRecords = await sql`
      SELECT drop_number FROM sharepoint_nokia_exp
      WHERE drop_number = ANY(${dropNumbers})
    `;

    const existingDrops = new Set(existingRecords.map((r: any) => r.drop_number));
    const newRecords = data.filter(d => !existingDrops.has(d.drop_number));
    const updateRecords = data.filter(d => existingDrops.has(d.drop_number));

    logger.info(`Found ${existingDrops.size} existing, ${newRecords.length} new`);

    // Batch insert new records
    if (newRecords.length > 0) {
      logger.info(`Inserting ${newRecords.length} new Nokia activations...`);
      const batchSize = 100;

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);

        const insertPromises = batch.map(record =>
          sql`
            INSERT INTO sharepoint_nokia_exp (
              drop_number, serial_number, timestamp,
              olt_address, ont_rx_sig_dbm, link_budget_ont_to_olt_db,
              olt_rx_sig_dbm, link_budget_olt_to_ont_db,
              status, latitude, longitude,
              current_ont_rx, team, date,
              project_id, raw_data, sync_timestamp
            ) VALUES (
              ${record.drop_number},
              ${record.serial_number || null},
              ${record.timestamp || null},
              ${record.olt_address || null},
              ${record.ont_rx_sig_dbm || null},
              ${record.link_budget_ont_olt_db || null},
              ${record.olt_rx_sig_dbm || null},
              ${record.link_budget_olt_ont_db || null},
              ${record.status || null},
              ${record.latitude || null},
              ${record.longitude || null},
              ${record.current_ont_rx || null},
              ${record.team || null},
              ${record.date || null},
              ${projectId || null},
              ${JSON.stringify(record)},
              NOW()
            )
          `.catch(err => {
            logger.error(`Failed to insert Nokia record ${record.drop_number}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(insertPromises);
        inserted += results.filter(r => r !== null).length;

        if ((i + batchSize) % 500 === 0 || (i + batchSize) >= newRecords.length) {
          logger.info(`Progress: ${inserted} / ${newRecords.length} inserted`);
        }
      }
    }

    // Batch update existing records
    if (updateRecords.length > 0) {
      logger.info(`Updating ${updateRecords.length} existing Nokia activations...`);
      const updateBatchSize = 50;

      for (let i = 0; i < updateRecords.length; i += updateBatchSize) {
        const batch = updateRecords.slice(i, i + updateBatchSize);

        const updatePromises = batch.map(record =>
          sql`
            UPDATE sharepoint_nokia_exp
            SET
              serial_number = ${record.serial_number || null},
              timestamp = ${record.timestamp || null},
              olt_address = ${record.olt_address || null},
              ont_rx_sig_dbm = ${record.ont_rx_sig_dbm || null},
              link_budget_ont_to_olt_db = ${record.link_budget_ont_olt_db || null},
              olt_rx_sig_dbm = ${record.olt_rx_sig_dbm || null},
              link_budget_olt_to_ont_db = ${record.link_budget_olt_ont_db || null},
              status = ${record.status || null},
              latitude = ${record.latitude || null},
              longitude = ${record.longitude || null},
              current_ont_rx = ${record.current_ont_rx || null},
              team = ${record.team || null},
              date = ${record.date || null},
              raw_data = ${JSON.stringify(record)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE drop_number = ${record.drop_number}
          `.catch(err => {
            logger.error(`Failed to update Nokia record ${record.drop_number}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(updatePromises);
        updated += results.filter(r => r !== null).length;

        if ((i + updateBatchSize) % 500 === 0 || (i + updateBatchSize) >= updateRecords.length) {
          logger.info(`Update progress: ${updated} / ${updateRecords.length}`);
        }
      }
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  }
}

export const nokiaExpConnector = new NokiaExpConnector();

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== Nokia_Exp Sync (Standalone) ===\n');

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
      const result = await nokiaExpConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Speed: ${Math.round(result.records_processed / (duration / 1000))} records/second`);

      // Check database counts
      console.log('\n=== Database Status ===');
      const count = await sql`SELECT COUNT(*) as count FROM sharepoint_nokia_exp`;
      console.log(`Nokia_Exp records in database: ${count[0].count}`);

      // Sample recent activations
      console.log('\n=== Recent Activations ===');
      const recent = await sql`
        SELECT drop_number, serial_number, status, ont_rx_sig_dbm, team
        FROM sharepoint_nokia_exp
        ORDER BY sync_timestamp DESC
        LIMIT 5
      `;
      recent.forEach((r: any) => {
        console.log(`  ${r.drop_number}: ${r.serial_number} - ${r.status} (${r.ont_rx_sig_dbm} dBm) - ${r.team}`);
      });

      console.log('\n=== ✅ Nokia_Exp Sync Complete! ===\n');
      process.exit(0);

    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}
