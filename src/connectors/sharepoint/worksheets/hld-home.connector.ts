import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';

/**
 * HLD_Home Worksheet Connector - OPTIMIZED
 * Syncs home/premises design data from SharePoint
 */
export class HLDHomeConnector extends BaseWorksheetConnector {
  constructor() {
    super('HLD_Home', 'sharepoint_hld_home');
  }

  async extractData(worksheet: Worksheet): Promise<any[]> {
    const headers = this.extractHeaders(worksheet);
    const data: any[] = [];

    logger.info(`Extracting HLD_Home data with ${headers.length} columns`);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData = this.extractRowData(row, headers);

      if (rowData && rowData['label']) {
        data.push(rowData);
      }
    });

    logger.info(`Extracted ${data.length} homes from HLD_Home worksheet`);
    return data;
  }

  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} homes (OPTIMIZED)`);

    // Get existing records
    const homeLabels = data.map(h => h.label);
    const existingHomes = await sql`
      SELECT label FROM sharepoint_hld_home
      WHERE label = ANY(${homeLabels})
    `;

    const existingLabels = new Set(existingHomes.map((h: any) => h.label));
    const newHomes = data.filter(h => !existingLabels.has(h.label));
    const updateHomes = data.filter(h => existingLabels.has(h.label));

    logger.info(`Found ${existingLabels.size} existing, ${newHomes.length} new homes`);

    // Batch insert new records
    if (newHomes.length > 0) {
      logger.info(`Inserting ${newHomes.length} new homes...`);
      const batchSize = 100;

      for (let i = 0; i < newHomes.length; i += batchSize) {
        const batch = newHomes.slice(i, i + batchSize);

        const insertPromises = batch.map(home =>
          sql`
            INSERT INTO sharepoint_hld_home (
              label, type, subtyp, spec, dim1, dim2,
              cblcpty, conntr, ntwrkptn, cmpownr,
              strtfeat, endfeat, lat, lon, address,
              pon_no, zone_no, subplace, mainplce, mun,
              datecrtd, crtdby, date_edt, editby, comments,
              project_id, raw_data, sync_timestamp
            ) VALUES (
              ${home.label},
              ${home.type || null},
              ${home.subtyp || null},
              ${home.spec || null},
              ${home.dim1 || null},
              ${home.dim2 || null},
              ${home.cblcpty || null},
              ${home.conntr || null},
              ${home.ntwrkptn || null},
              ${home.cmpownr || null},
              ${home.strtfeat || null},
              ${home.endfeat || null},
              ${home.lat || null},
              ${home.lon || null},
              ${home.address || null},
              ${home.pon_no || null},
              ${home.zone_no || null},
              ${home.subplace || null},
              ${home.mainplce || null},
              ${home.mun || null},
              ${home.datecrtd || null},
              ${home.crtdby || null},
              ${home.date_edt || null},
              ${home.editby || null},
              ${home.comments || null},
              ${projectId || null},
              ${JSON.stringify(home)},
              NOW()
            )
          `.catch(err => {
            logger.error(`Failed to insert home ${home.label}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(insertPromises);
        const successfulInserts = results.filter(r => r !== null).length;
        inserted += successfulInserts;

        if ((i + batchSize) % 1000 === 0 || (i + batchSize) >= newHomes.length) {
          logger.info(`Progress: ${inserted} / ${newHomes.length} homes inserted`);
        }
      }
    }

    // Batch update existing records
    if (updateHomes.length > 0) {
      logger.info(`Updating ${updateHomes.length} existing homes...`);
      const updateBatchSize = 50;

      for (let i = 0; i < updateHomes.length; i += updateBatchSize) {
        const batch = updateHomes.slice(i, i + updateBatchSize);

        const updatePromises = batch.map(home =>
          sql`
            UPDATE sharepoint_hld_home
            SET
              type = ${home.type || null},
              subtyp = ${home.subtyp || null},
              strtfeat = ${home.strtfeat || null},
              lat = ${home.lat || null},
              lon = ${home.lon || null},
              address = ${home.address || null},
              pon_no = ${home.pon_no || null},
              zone_no = ${home.zone_no || null},
              mainplce = ${home.mainplce || null},
              mun = ${home.mun || null},
              raw_data = ${JSON.stringify(home)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE label = ${home.label}
          `.catch(err => {
            logger.error(`Failed to update home ${home.label}`, { error: err.message });
            return null;
          })
        );

        const results = await Promise.all(updatePromises);
        updated += results.filter(r => r !== null).length;

        if ((i + updateBatchSize) % 500 === 0 || (i + updateBatchSize) >= updateHomes.length) {
          logger.info(`Update progress: ${updated} / ${updateHomes.length}`);
        }
      }
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  }
}

export const hldHomeConnector = new HLDHomeConnector();
