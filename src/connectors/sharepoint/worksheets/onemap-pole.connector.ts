import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * 1Map_Pole Worksheet Connector - OPTIMIZED
 * Syncs OneMap pole cross-reference data (129 columns - storing key fields + full JSONB)
 */
export class OneMapPoleConnector extends BaseWorksheetConnector {
  constructor() {
    super('1Map_Pole', 'sharepoint_1map_pole');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting 1Map_Pole data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      // Include rows with onemapfid, label, property_id, pole_number, or job_id
      if (rowData && (rowData['onemapfid'] || rowData['label'] || rowData['property_id'] || rowData['pole_number'] || rowData['job_id'])) {
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} 1Map pole records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} 1Map poles (OPTIMIZED)`);

    // Get existing records by onemapfid (primary key for this sheet)
    const onemapfids = data
      .map(d => d.onemapfid || d.property_id)
      .filter(id => id !== null && id !== undefined);

    let existingIds = new Set<string>();

    if (onemapfids.length > 0) {
      const existingRecords = await sql`
        SELECT property_id FROM sharepoint_1map_pole
        WHERE property_id = ANY(${onemapfids})
      `;
      existingIds = new Set(existingRecords.map((r: any) => String(r.property_id)));
    }

    const newRecords = data.filter(d => !existingIds.has(String(d.onemapfid || d.property_id)));
    const updateRecords = data.filter(d => existingIds.has(String(d.onemapfid || d.property_id)));

    logger.info(`Found ${existingIds.size} existing, ${newRecords.length} new`);

    // Batch insert new records
    if (newRecords.length > 0) {
      logger.info(`Inserting ${newRecords.length} new 1Map poles...`);
      const batchSize = 100;

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);

        const insertPromises = batch.map(record =>
          sql`
            INSERT INTO sharepoint_1map_pole (
              property_id, onemap_nad_id, job_id,
              status, flow_name_groups, site,
              sections, pons, location_address,
              actual_device_location_latitude,
              actual_device_location_longitude,
              lst_mod_by, lst_mod_dt, date_status_changed,
              pole_number, language, survey_date,
              project_id, raw_data, sync_timestamp
            ) VALUES (
              ${record.onemapfid || record.property_id || null},
              ${record._1map_nad_id || null},
              ${record.job_id || null},
              ${record.status || null},
              ${record.flow_name_groups || null},
              ${record.site || null},
              ${record.sections || null},
              ${record.pons || null},
              ${record.location_address || null},
              ${record.planned_location_latitude || record.actual_device_location_latitude || null},
              ${record.planned_location_longitude || record.actual_device_location_longitude || null},
              ${record.lst_mod_by || null},
              ${record.lst_mod_dt || null},
              ${record.date_status_changed || null},
              ${record.label || record.pole_number || null},
              ${record.language || null},
              ${record.survey_date || null},
              ${projectId || null},
              ${JSON.stringify(record)},
              NOW()
            )
          `.catch(err => {
            logger.error(`Failed to insert 1Map pole ${record.onemapfid || record.label}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(insertPromises);
        inserted += results.filter(r => r !== null).length;

        if ((i + batchSize) % 1000 === 0 || (i + batchSize) >= newRecords.length) {
          logger.info(`Progress: ${inserted} / ${newRecords.length} inserted`);
        }
      }
    }

    // Batch update existing records
    if (updateRecords.length > 0) {
      logger.info(`Updating ${updateRecords.length} existing 1Map poles...`);
      const updateBatchSize = 50;

      for (let i = 0; i < updateRecords.length; i += updateBatchSize) {
        const batch = updateRecords.slice(i, i + updateBatchSize);

        const updatePromises = batch.map(record =>
          sql`
            UPDATE sharepoint_1map_pole
            SET
              onemap_nad_id = ${record._1map_nad_id || null},
              job_id = ${record.job_id || null},
              status = ${record.status || null},
              flow_name_groups = ${record.flow_name_groups || null},
              site = ${record.site || null},
              sections = ${record.sections || null},
              pons = ${record.pons || null},
              location_address = ${record.location_address || null},
              actual_device_location_latitude = ${record.planned_location_latitude || record.actual_device_location_latitude || null},
              actual_device_location_longitude = ${record.planned_location_longitude || record.actual_device_location_longitude || null},
              lst_mod_by = ${record.lst_mod_by || null},
              lst_mod_dt = ${record.lst_mod_dt || null},
              date_status_changed = ${record.date_status_changed || null},
              pole_number = ${record.label || record.pole_number || null},
              language = ${record.language || null},
              survey_date = ${record.survey_date || null},
              raw_data = ${JSON.stringify(record)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE property_id = ${record.onemapfid || record.property_id}
          `.catch(err => {
            logger.error(`Failed to update 1Map pole ${record.onemapfid || record.property_id}`, { error: err.message });
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

export const oneMapPoleConnector = new OneMapPoleConnector();

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== 1Map_Pole Sync (Standalone) ===\n');

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
      const result = await oneMapPoleConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Speed: ${Math.round(result.records_processed / (duration / 1000))} records/second`);

      // Check database counts
      console.log('\n=== Database Status ===');
      const count = await sql`SELECT COUNT(*) as count FROM sharepoint_1map_pole`;
      console.log(`1Map_Pole records in database: ${count[0].count}`);

      // Sample recent records
      console.log('\n=== Recent Poles ===');
      const recent = await sql`
        SELECT property_id, status, pole_number, site
        FROM sharepoint_1map_pole
        ORDER BY sync_timestamp DESC
        LIMIT 5
      `;
      recent.forEach((r: any) => {
        console.log(`  ${r.property_id}: ${r.pole_number || 'N/A'} - ${r.status} (${r.site})`);
      });

      console.log('\n=== ✅ 1Map_Pole Sync Complete! ===\n');
      process.exit(0);

    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}
