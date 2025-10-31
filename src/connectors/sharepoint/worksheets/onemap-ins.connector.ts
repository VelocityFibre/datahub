import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * 1Map_Ins Worksheet Connector - OPTIMIZED
 * Syncs OneMap installation data (223 columns - storing key fields + full JSONB)
 */
export class OneMapInsConnector extends BaseWorksheetConnector {
  constructor() {
    super('1Map_Ins', 'sharepoint_1map_ins');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting 1Map_Ins data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      // Include rows with property_id or job_id
      if (rowData && (rowData['property_id'] || rowData['job_id'])) {
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} 1Map installation records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} 1Map installations (OPTIMIZED)`);

    // Get existing records by property_id
    const propertyIds = data
      .map(d => d.property_id)
      .filter(id => id !== null && id !== undefined);

    const existingRecords = await sql`
      SELECT property_id FROM sharepoint_1map_ins
      WHERE property_id = ANY(${propertyIds})
    `;

    const existingIds = new Set(existingRecords.map((r: any) => String(r.property_id)));
    const newRecords = data.filter(d => !existingIds.has(String(d.property_id)));
    const updateRecords = data.filter(d => existingIds.has(String(d.property_id)));

    logger.info(`Found ${existingIds.size} existing, ${newRecords.length} new`);

    // Batch insert new records - OPTIMIZED for large wide tables (223 columns)
    if (newRecords.length > 0) {
      logger.info(`Inserting ${newRecords.length} new 1Map installations...`);
      const batchSize = 25; // Reduced from 100 - very wide table

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);

        // Process sequentially to avoid memory issues with large JSONB
        for (const record of batch) {
          try {
            await sql`
              INSERT INTO sharepoint_1map_ins (
                property_id, onemap_nad_id, job_id,
                status, flow_name_groups, site,
                sections, pons, location_address,
                actual_device_location_latitude,
                actual_device_location_longitude,
                lst_mod_by, lst_mod_dt, date_status_changed,
                pole_number, drop_number,
                language, survey_date,
                project_id, raw_data, sync_timestamp
              ) VALUES (
                ${record.property_id || null},
                ${record._1map_nad_id || null},
                ${record.job_id || null},
                ${record.status || null},
                ${record.flow_name_groups || null},
                ${record.site || null},
                ${record.sections || null},
                ${record.pons || null},
                ${record.location_address || null},
                ${record.actual_device_location_latitude || null},
                ${record.actual_device_location_longitude || null},
                ${record.lst_mod_by || null},
                ${record.lst_mod_dt || null},
                ${record.date_status_changed || null},
                ${record.pole_number || null},
                ${record.drop_number || null},
                ${record.language || null},
                ${record.survey_date || null},
                ${projectId || null},
                ${JSON.stringify(record)},
                NOW()
              )
            `;
            inserted++;
          } catch (err: any) {
            logger.error(`Failed to insert 1Map record ${record.property_id}`, { error: err.message });
          }
        }

        // Report progress every 1000 records
        if (inserted % 1000 === 0 || inserted >= newRecords.length) {
          logger.info(`Progress: ${inserted} / ${newRecords.length} inserted`);
        }
      }

      logger.info(`Insert complete: ${inserted} new records added`);
    }

    // Batch update existing records - OPTIMIZED
    if (updateRecords.length > 0) {
      logger.info(`Updating ${updateRecords.length} existing 1Map installations...`);
      const updateBatchSize = 25; // Reduced for wide table

      for (let i = 0; i < updateRecords.length; i += updateBatchSize) {
        const batch = updateRecords.slice(i, i + updateBatchSize);

        // Process updates sequentially for stability
        for (const record of batch) {
          try {
            await sql`
              UPDATE sharepoint_1map_ins
              SET
                onemap_nad_id = ${record._1map_nad_id || null},
                job_id = ${record.job_id || null},
                status = ${record.status || null},
                flow_name_groups = ${record.flow_name_groups || null},
                site = ${record.site || null},
                sections = ${record.sections || null},
                pons = ${record.pons || null},
                location_address = ${record.location_address || null},
                actual_device_location_latitude = ${record.actual_device_location_latitude || null},
                actual_device_location_longitude = ${record.actual_device_location_longitude || null},
                lst_mod_by = ${record.lst_mod_by || null},
                lst_mod_dt = ${record.lst_mod_dt || null},
                date_status_changed = ${record.date_status_changed || null},
                pole_number = ${record.pole_number || null},
                drop_number = ${record.drop_number || null},
                language = ${record.language || null},
                survey_date = ${record.survey_date || null},
                raw_data = ${JSON.stringify(record)},
                sync_timestamp = NOW(),
                updated_at = NOW()
              WHERE property_id = ${record.property_id}
            `;
            updated++;
          } catch (err: any) {
            logger.error(`Failed to update 1Map record ${record.property_id}`, { error: err.message });
          }
        }

        // Report progress every 500 records
        if (updated % 500 === 0 || updated >= updateRecords.length) {
          logger.info(`Update progress: ${updated} / ${updateRecords.length}`);
        }
      }

      logger.info(`Update complete: ${updated} records updated`);
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  }
}

export const oneMapInsConnector = new OneMapInsConnector();

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== 1Map_Ins Sync (Standalone) ===\n');

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
      const result = await oneMapInsConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Speed: ${Math.round(result.records_processed / (duration / 1000))} records/second`);

      // Check database counts
      console.log('\n=== Database Status ===');
      const count = await sql`SELECT COUNT(*) as count FROM sharepoint_1map_ins`;
      console.log(`1Map_Ins records in database: ${count[0].count}`);

      // Sample recent records
      console.log('\n=== Recent Installations ===');
      const recent = await sql`
        SELECT property_id, status, pole_number, drop_number, site
        FROM sharepoint_1map_ins
        ORDER BY sync_timestamp DESC
        LIMIT 5
      `;
      recent.forEach((r: any) => {
        console.log(`  ${r.property_id}: ${r.status} - ${r.pole_number || 'N/A'} / ${r.drop_number || 'N/A'} (${r.site})`);
      });

      console.log('\n=== ✅ 1Map_Ins Sync Complete! ===\n');
      process.exit(0);

    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}
