import type { Worksheet } from 'exceljs';
import { BaseWorksheetConnector } from '../base-worksheet.connector.js';
import { sql } from '../../../database/client.js';
import { logger } from '../../../utils/logger.js';
import { sharepointClient } from '../client.js';
import { sharepointConfig } from '../../../config/sharepoint.config.js';

/**
 * HLD_Pole Worksheet Connector
 * Syncs pole infrastructure design data from SharePoint to sharepoint_hld_pole table
 */
export class HLDPoleConnector extends BaseWorksheetConnector {
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
   * Upsert poles to database
   * Strategy: Use label_1 as unique identifier
   */
  async upsertData(
    data: any[],
    projectId?: string
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    logger.info(`Upserting ${data.length} poles to ${this.tableName}`);

    for (const pole of data) {
      try {
        // Check if pole exists
        const existing = await sql`
          SELECT id FROM sharepoint_hld_pole
          WHERE label_1 = ${pole.label_1}
          LIMIT 1
        `;

        if (existing.length > 0) {
          // Update existing pole
          await sql`
            UPDATE sharepoint_hld_pole
            SET
              type_1 = ${pole.type_1 || null},
              subtyp_1 = ${pole.subtyp_1 || null},
              spec_1 = ${pole.spec_1 || null},
              dim1 = ${pole.dim1 || null},
              dim2 = ${pole.dim2 || null},
              cblcpty1 = ${pole.cblcpty1 || null},
              conntr1 = ${pole.conntr1 || null},
              status = ${pole.status || null},
              cmpownr = ${pole.cmpownr || null},
              lat = ${pole.lat || null},
              lon = ${pole.lon || null},
              address = ${pole.address || null},
              pon_no = ${pole.pon_no || null},
              zone_no = ${pole.zone_no || null},
              subplace = ${pole.subplace || null},
              mainplce = ${pole.mainplce || null},
              mun = ${pole.mun || null},
              datecrtd = ${pole.datecrtd || null},
              crtdby = ${pole.crtdby || null},
              date_edt = ${pole.date_edt || null},
              editby = ${pole.editby || null},
              comments = ${pole.comments || null},
              raw_data = ${JSON.stringify(pole)},
              sync_timestamp = NOW(),
              updated_at = NOW()
            WHERE label_1 = ${pole.label_1}
          `;
          updated++;
        } else {
          // Insert new pole
          await sql`
            INSERT INTO sharepoint_hld_pole (
              label_1, type_1, subtyp_1, spec_1, dim1, dim2,
              cblcpty1, conntr1, status, cmpownr,
              lat, lon, address,
              pon_no, zone_no, subplace, mainplce, mun,
              datecrtd, crtdby, date_edt, editby, comments,
              project_id, raw_data, sync_timestamp
            ) VALUES (
              ${pole.label_1},
              ${pole.type_1 || null},
              ${pole.subtyp_1 || null},
              ${pole.spec_1 || null},
              ${pole.dim1 || null},
              ${pole.dim2 || null},
              ${pole.cblcpty1 || null},
              ${pole.conntr1 || null},
              ${pole.status || null},
              ${pole.cmpownr || null},
              ${pole.lat || null},
              ${pole.lon || null},
              ${pole.address || null},
              ${pole.pon_no || null},
              ${pole.zone_no || null},
              ${pole.subplace || null},
              ${pole.mainplce || null},
              ${pole.mun || null},
              ${pole.datecrtd || null},
              ${pole.crtdby || null},
              ${pole.date_edt || null},
              ${pole.editby || null},
              ${pole.comments || null},
              ${projectId || null},
              ${JSON.stringify(pole)},
              NOW()
            )
          `;
          inserted++;
        }

        // Log progress every 100 records
        if ((inserted + updated) % 100 === 0) {
          logger.info(`Progress: ${inserted + updated} / ${data.length} poles processed`);
        }

      } catch (error: any) {
        logger.error(`Failed to upsert pole ${pole.label_1}`, {
          error: error.message,
          pole_label: pole.label_1
        });
        // Continue with next pole
      }
    }

    logger.info(`Upsert complete: ${inserted} inserted, ${updated} updated`);

    return { inserted, updated };
  }
}

// Export singleton instance
export const hldPoleConnector = new HLDPoleConnector();

// CLI execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('=== HLD_Pole Connector Test ===\n');

      // Fetch workbook from SharePoint
      console.log('Fetching Excel file from SharePoint...');
      const workbook = await sharepointClient.getExcelFile(
        sharepointConfig.lawleyFileUrl
      );

      console.log(`Found ${workbook.worksheets.length} worksheets\n`);

      // Run sync
      const result = await hldPoleConnector.sync(workbook);

      console.log('\n=== Sync Result ===');
      console.log(JSON.stringify(result, null, 2));

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

      process.exit(result.success ? 0 : 1);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
