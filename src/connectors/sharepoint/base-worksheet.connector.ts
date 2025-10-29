import type { Workbook, Worksheet } from 'exceljs';
import { logger } from '../../utils/logger.js';
import { sql } from '../../database/client.js';

/**
 * Base class for SharePoint worksheet connectors
 * All worksheet-specific connectors extend this class
 */
export abstract class BaseWorksheetConnector {
  protected worksheetName: string;
  protected tableName: string;

  constructor(worksheetName: string, tableName: string) {
    this.worksheetName = worksheetName;
    this.tableName = tableName;
  }

  /**
   * Extract data from worksheet
   * Subclasses must implement this to parse worksheet-specific structure
   */
  abstract extractData(worksheet: Worksheet): Promise<any[]>;

  /**
   * Insert or update data in database
   * Subclasses can override for custom upsert logic
   */
  abstract upsertData(data: any[], projectId?: string): Promise<{ inserted: number; updated: number }>;

  /**
   * Main sync method - coordinates extraction and database operations
   */
  async sync(workbook: Workbook, projectId?: string): Promise<{
    success: boolean;
    records_processed: number;
    records_inserted: number;
    records_updated: number;
    error?: string;
  }> {
    const syncId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`Starting sync for worksheet: ${this.worksheetName}`, {
        syncId,
        worksheetName: this.worksheetName,
        tableName: this.tableName,
        projectId
      });

      // Log sync start
      await sql`
        INSERT INTO sharepoint_sync_log (
          id, worksheet_name, sync_started_at, status, file_url
        ) VALUES (
          ${syncId},
          ${this.worksheetName},
          ${new Date()},
          'running',
          ${process.env.SHAREPOINT_LAWLEY_FILE_URL || ''}
        )
      `;

      // Find worksheet
      const worksheet = workbook.worksheets.find(
        ws => ws.name === this.worksheetName
      );

      if (!worksheet) {
        throw new Error(`Worksheet "${this.worksheetName}" not found in workbook`);
      }

      logger.info(`Found worksheet: ${this.worksheetName}`, {
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount
      });

      // Extract data
      const data = await this.extractData(worksheet);
      logger.info(`Extracted ${data.length} rows from ${this.worksheetName}`);

      // Upsert to database
      const result = await this.upsertData(data, projectId);

      const duration = Date.now() - startTime;

      // Log sync success
      await sql`
        UPDATE sharepoint_sync_log
        SET
          sync_completed_at = ${new Date()},
          status = 'success',
          records_processed = ${data.length},
          records_inserted = ${result.inserted},
          records_updated = ${result.updated},
          duration_ms = ${duration}
        WHERE id = ${syncId}
      `;

      logger.info(`Sync completed for ${this.worksheetName}`, {
        syncId,
        duration_ms: duration,
        records_processed: data.length,
        records_inserted: result.inserted,
        records_updated: result.updated
      });

      return {
        success: true,
        records_processed: data.length,
        records_inserted: result.inserted,
        records_updated: result.updated
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error(`Sync failed for ${this.worksheetName}`, {
        syncId,
        error: error.message,
        stack: error.stack
      });

      // Log sync failure
      try {
        await sql`
          UPDATE sharepoint_sync_log
          SET
            sync_completed_at = ${new Date()},
            status = 'failed',
            error_message = ${error.message},
            duration_ms = ${duration}
          WHERE id = ${syncId}
        `;
      } catch (logError) {
        logger.error('Failed to log sync failure', { logError });
      }

      return {
        success: false,
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
        error: error.message
      };
    }
  }

  /**
   * Helper: Extract headers from first row
   */
  protected extractHeaders(worksheet: Worksheet): string[] {
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      const rawHeader = String(cell.value || '').trim();
      // Normalize to snake_case for consistency
      const normalized = rawHeader
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      headers[colNumber] = normalized;
    });

    return headers;
  }

  /**
   * Helper: Parse cell value to appropriate type
   */
  protected parseCellValue(cellValue: any): any {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    // Handle formula results
    if (typeof cellValue === 'object' && 'result' in cellValue) {
      return this.parseCellValue(cellValue.result);
    }

    // Handle dates
    if (cellValue instanceof Date) {
      // Check if date is valid
      if (isNaN(cellValue.getTime())) {
        return null; // Return null for invalid dates
      }
      return cellValue.toISOString();
    }

    // Handle rich text
    if (typeof cellValue === 'object' && 'richText' in cellValue) {
      return cellValue.richText.map((t: any) => t.text).join('');
    }

    // Handle hyperlinks
    if (typeof cellValue === 'object' && 'text' in cellValue) {
      return cellValue.text;
    }

    return cellValue;
  }

  /**
   * Helper: Extract row data using headers
   */
  protected extractRowData(row: any, headers: string[]): Record<string, any> | null {
    const rowData: Record<string, any> = {};
    let hasData = false;

    row.eachCell((cell: any, colNumber: number) => {
      const header = headers[colNumber]; // headers array is 1-based to match Excel colNumber
      if (header) {
        const value = this.parseCellValue(cell.value);
        rowData[header] = value;
        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
        }
      }
    });

    return hasData ? rowData : null;
  }
}
