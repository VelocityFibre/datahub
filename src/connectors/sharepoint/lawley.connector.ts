import { sharepointClient } from './client.js';
import { sharepointConfig } from '../../config/sharepoint.config.js';
import { logger } from '../../utils/logger.js';
import { ConnectionError } from '../../utils/error-handler.js';
import type { Worksheet, Row } from 'exceljs';

export interface LawleyData {
  rawData: Record<string, any>[];
  metadata: {
    source: string;
    extractedAt: string;
    rowCount: number;
    columns: string[];
  };
}

/**
 * Lawley Project SharePoint Connector
 */
export class LawleyConnector {
  private fileUrl: string;

  constructor() {
    this.fileUrl = sharepointConfig.lawleyFileUrl;
  }

  /**
   * Extract data from Lawley SharePoint file
   */
  async extractData(): Promise<LawleyData> {
    try {
      logger.info('Starting Lawley data extraction', { fileUrl: this.fileUrl });

      if (!this.fileUrl) {
        throw new ConnectionError(
          'Lawley file URL not configured in environment variables',
          'SharePoint'
        );
      }

      // Get Excel file from SharePoint
      const workbook = await sharepointClient.getExcelFile(this.fileUrl);

      // Get first worksheet (adjust if needed)
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new ConnectionError('No worksheets found in Excel file', 'SharePoint');
      }

      logger.info('Processing worksheet', {
        name: worksheet.name,
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount,
      });

      // Extract data from worksheet
      const data = this.extractWorksheetData(worksheet);

      return {
        rawData: data,
        metadata: {
          source: this.fileUrl,
          extractedAt: new Date().toISOString(),
          rowCount: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
        },
      };
    } catch (error: any) {
      logger.error('Lawley data extraction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract data from worksheet into structured format
   */
  private extractWorksheetData(worksheet: Worksheet): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value).trim();
    });

    logger.debug('Extracted headers', { headers });

    // Process data rows (starting from row 2)
    worksheet.eachRow((row: Row, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, any> = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const value = this.parseCellValue(cell.value);
          rowData[header] = value;
          if (value !== null && value !== undefined && value !== '') {
            hasData = true;
          }
        }
      });

      // Only add row if it has at least some data
      if (hasData) {
        rows.push(rowData);
      }
    });

    logger.info(`Extracted ${rows.length} data rows from worksheet`);

    return rows;
  }

  /**
   * Parse cell value to appropriate JavaScript type
   */
  private parseCellValue(cellValue: any): any {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    // Handle formula results
    if (typeof cellValue === 'object' && 'result' in cellValue) {
      return this.parseCellValue(cellValue.result);
    }

    // Handle dates
    if (cellValue instanceof Date) {
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
   * Get sample data for schema analysis
   */
  async getSampleData(rowLimit: number = 10): Promise<LawleyData> {
    const fullData = await this.extractData();

    return {
      rawData: fullData.rawData.slice(0, rowLimit),
      metadata: {
        ...fullData.metadata,
        rowCount: Math.min(rowLimit, fullData.rawData.length),
      },
    };
  }
}

// Export singleton instance
export const lawleyConnector = new LawleyConnector();

// CLI execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      logger.info('=== Lawley Connector Test ===');
      const data = await lawleyConnector.getSampleData(5);
      console.log('\nMetadata:', JSON.stringify(data.metadata, null, 2));
      console.log('\nSample Data:', JSON.stringify(data.rawData, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
