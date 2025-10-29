import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * Lawley QA Worksheet Connector - APPEND-ONLY
 * Syncs QA photo verification data from both Historical and Activations sheets
 *
 * Single table approach:
 * - Historical: One-time bulk load (1,515 records before Sept 23, 2025)
 * - Activations: Recurring sync (359+ records after Sept 23, 2025)
 * - Append-only: Never updates, only inserts NEW records
 */
export class LawleyQAConnector extends BaseWorksheetConnector {
  private source: 'historical' | 'activations';

  constructor(worksheetName: string, source: 'historical' | 'activations') {
    super(worksheetName, 'sharepoint_lawley_qa');
    this.source = source;
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting ${this.worksheetName} data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      // Skip if no drop_number or if it's a header row
      if (rowData && rowData['drop_number']) {
        const dropNumber = String(rowData['drop_number']).trim();

        // Skip header-like rows
        if (dropNumber.startsWith('DR') || dropNumber.match(/^\d+$/)) {
          // Add source tracking
          rowData._source = this.source;
          data.push(rowData);
        }
      }
    });

    logger.info(`Extracted ${data.length} ${this.source} QA records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    const updated = 0; // Append-only: never updates

    logger.info(`Inserting ${data.length} ${this.source} QA records (APPEND-ONLY)`);

    // Get existing drop numbers to avoid duplicates
    const dropNumbers = data.map(d => d.drop_number);
    const existingRecords = await sql`
      SELECT drop_number FROM sharepoint_lawley_qa
      WHERE drop_number = ANY(${dropNumbers})
    `;

    const existingSet = new Set(existingRecords.map((r: any) => r.drop_number));
    const newRecords = data.filter(d => !existingSet.has(d.drop_number));

    logger.info(`Found ${existingSet.size} existing, ${newRecords.length} new records`);

    if (newRecords.length === 0) {
      logger.info('No new records to insert');
      return { inserted: 0, updated: 0 };
    }

    // Batch insert new records only
    logger.info(`Inserting ${newRecords.length} new QA records...`);
    const batchSize = 100;

    for (let i = 0; i < newRecords.length; i += batchSize) {
      const batch = newRecords.slice(i, i + batchSize);

      const insertPromises = batch.map(record =>
        sql`
          INSERT INTO sharepoint_lawley_qa (
            date, drop_number, source,
            step_1_property_frontage,
            step_2_location_on_wall,
            step_3_outside_cable_span,
            step_4_home_entry_outside,
            step_5_home_entry_inside,
            step_6_fibre_entry_to_ont,
            step_7_work_area_completion,
            step_8_ont_barcode,
            step_9_mini_ups_serial,
            step_10_powermeter_before_activation,
            step_11_active_broadband_light,
            step_12_customer_signature,
            completed_photos,
            outstanding_photos,
            user_name,
            outstanding_photos_loaded_1map,
            qa_completed_loaded_sp,
            comment,
            project_id, raw_data, sync_timestamp
          ) VALUES (
            ${record.date || null},
            ${record.drop_number},
            ${record._source},
            ${record.step_1_property_frontage_house_street_number_visible || null},
            ${record.step_2_location_on_wall_before_install || null},
            ${record.step_3_outside_cable_span_pole_pigtail_screw || null},
            ${record.step_4_home_entry_point_outside || null},
            ${record.step_5_home_entry_point_inside || null},
            ${record.step_6_fibre_entry_to_ont_after_install || null},
            ${record.step_7_overall_work_area_after_completion || null},
            ${record.step_8_ont_barcode_scan_barcode_photo_of_label || null},
            ${record.step_9_mini_ups_serial_number_gizzu || null},
            ${record.step_10_powermeter_at_ont_before_activation || null},
            ${record.step_11_active_broadband_light || null},
            ${record.step_12_customer_signature || null},
            ${record.completed_photos || null},
            ${record.x_outstanding_photos || null},
            ${record.user || null},
            ${record.outstanding_photos_loaded_onto_1map || null},
            ${record.qa_completed_loaded_to_sp || null},
            ${record.comment || null},
            ${projectId || null},
            ${JSON.stringify(record)},
            NOW()
          )
        `.catch(err => {
          logger.error(`Failed to insert QA record ${record.drop_number}`, { error: err.message });
          return null;
        })
      );

      const results = await Promise.all(insertPromises);
      inserted += results.filter(r => r !== null).length;

      if ((i + batchSize) % 500 === 0 || (i + batchSize) >= newRecords.length) {
        logger.info(`Progress: ${inserted} / ${newRecords.length} inserted`);
      }
    }

    logger.info(`Insert complete: ${inserted} new records added`);
    return { inserted, updated: 0 };
  }
}

// Export instances
export const lawleyHistoricalConnector = new LawleyQAConnector('Lawley Historical', 'historical');
export const lawleyActivationsConnector = new LawleyQAConnector('Lawley Activations', 'activations');

// Standalone execution for Historical (one-time)
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'historical') {
  (async () => {
    try {
      console.log('=== Lawley Historical QA - One-Time Bulk Load ===\n');

      const { sharepointClient } = await import('../client.js');
      const { sharepointConfig } = await import('../../../config/sharepoint.config.js');
      const { sql } = await import('../../../database/client.js');

      console.log('Fetching workbook from SharePoint...');
      const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

      const startTime = Date.now();
      const result = await lawleyHistoricalConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);

      const count = await sql`SELECT COUNT(*) as count FROM sharepoint_lawley_qa WHERE source = 'historical'`;
      console.log(`\n✅ Historical QA records in database: ${count[0].count}`);

      console.log('\n=== ✅ Lawley Historical Bulk Load Complete! ===\n');
      process.exit(0);
    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}

// Standalone execution for Activations (recurring)
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'activations') {
  (async () => {
    try {
      console.log('=== Lawley Activations QA - Recurring Sync ===\n');

      const { sharepointClient } = await import('../client.js');
      const { sharepointConfig } = await import('../../../config/sharepoint.config.js');
      const { sql } = await import('../../../database/client.js');

      console.log('Fetching workbook from SharePoint...');
      const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

      const startTime = Date.now();
      const result = await lawleyActivationsConnector.sync(workbook);
      const duration = Date.now() - startTime;

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal time: ${(duration / 1000).toFixed(1)}s`);

      const counts = await sql`
        SELECT
          source,
          COUNT(*) as count
        FROM sharepoint_lawley_qa
        GROUP BY source
        ORDER BY source
      `;

      console.log('\n=== Database Status ===');
      counts.forEach((c: any) => {
        console.log(`${c.source}: ${c.count} records`);
      });

      const total = await sql`SELECT COUNT(*) as count FROM sharepoint_lawley_qa`;
      console.log(`Total: ${total[0].count} records`);

      console.log('\n=== ✅ Lawley Activations Sync Complete! ===\n');
      process.exit(0);
    } catch (error: any) {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    }
  })();
}
