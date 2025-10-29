import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * Tracker_Pole Worksheet Connector - OPTIMIZED
 * Syncs pole installation tracking/status data
 */
export class TrackerPoleConnector extends BaseWorksheetConnector {
  constructor() {
    super('Tracker_Pole', 'sharepoint_tracker_pole');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting Tracker_Pole data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      if (rowData && rowData['label_1']) {
        // Store all data in raw_data JSONB for flexibility
        data.push({
          label_1: rowData['label_1'],
          pon_no: rowData['pon_no'],
          zone_no: rowData['zone_no'],
          raw_data: rowData
        });
      }
    });

    logger.info(`Extracted ${data.length} tracker pole records`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} tracker poles (OPTIMIZED)`);

    // Get existing records
    const poleLabels = data.map(p => p.label_1);
    const existingPoles = await sql`
      SELECT label_1 FROM sharepoint_tracker_pole
      WHERE label_1 = ANY(${poleLabels})
    `;

    const existingLabels = new Set(existingPoles.map((p: any) => p.label_1));
    const newPoles = data.filter(p => !existingLabels.has(p.label_1));
    const updatePoles = data.filter(p => existingLabels.has(p.label_1));

    logger.info(`Found ${existingLabels.size} existing, ${newPoles.length} new`);

    // Batch insert new records
    if (newPoles.length > 0) {
      logger.info(`Inserting ${newPoles.length} new tracker poles...`);
      const batchSize = 100;

      for (let i = 0; i < newPoles.length; i += batchSize) {
        const batch = newPoles.slice(i, i + batchSize);

        const insertPromises = batch.map(pole =>
          sql`
            INSERT INTO sharepoint_tracker_pole (
              label_1, pon_no, zone_no, project_id, raw_data, sync_timestamp
            ) VALUES (
              ${pole.label_1},
              ${pole.pon_no || null},
              ${pole.zone_no || null},
              ${projectId || null},
              ${JSON.stringify(pole.raw_data)},
              NOW()
            )
          `.catch(err => {
            logger.error(`Failed to insert tracker pole ${pole.label_1}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(insertPromises);
        inserted += results.filter(r => r !== null).length;

        if ((i + batchSize) % 500 === 0) {
          logger.info(`Progress: ${inserted} / ${newPoles.length} inserted`);
        }
      }
    }

    // Batch update existing records
    if (updatePoles.length > 0) {
      logger.info(`Updating ${updatePoles.length} existing tracker poles...`);
      const updateBatchSize = 50;

      for (let i = 0; i < updatePoles.length; i += updateBatchSize) {
        const batch = updatePoles.slice(i, i + updateBatchSize);

        const updatePromises = batch.map(pole =>
          sql`
            UPDATE sharepoint_tracker_pole
            SET
              pon_no = ${pole.pon_no || null},
              zone_no = ${pole.zone_no || null},
              raw_data = ${JSON.stringify(pole.raw_data)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE label_1 = ${pole.label_1}
          `.catch(err => {
            logger.error(`Failed to update tracker pole ${pole.label_1}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(updatePromises);
        updated += results.filter(r => r !== null).length;

        if ((i + updateBatchSize) % 500 === 0) {
          logger.info(`Update progress: ${updated} / ${updatePoles.length}`);
        }
      }
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  }
}

export const trackerPoleConnector = new TrackerPoleConnector();
