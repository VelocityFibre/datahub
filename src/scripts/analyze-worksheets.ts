import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';
import { logger } from '../utils/logger.js';

/**
 * Script to analyze all worksheets in the SharePoint Excel file
 * This helps us understand the structure before mapping to database tables
 */

async function analyzeWorksheets() {
  try {
    console.log('=== SharePoint Worksheets Analysis ===\n');

    const fileUrl = sharepointConfig.lawleyFileUrl;
    logger.info('Fetching Excel file from SharePoint', { fileUrl });

    const workbook = await sharepointClient.getExcelFile(fileUrl);

    console.log(`Total worksheets found: ${workbook.worksheets.length}\n`);
    console.log('='.repeat(80));

    // Analyze each worksheet
    for (const worksheet of workbook.worksheets) {
      console.log(`\n📊 Worksheet: "${worksheet.name}"`);
      console.log('-'.repeat(80));
      console.log(`Row count: ${worksheet.rowCount}`);
      console.log(`Column count: ${worksheet.columnCount}`);

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];

      headerRow.eachCell((cell, colNumber) => {
        headers.push(String(cell.value || '').trim());
      });

      console.log(`\nHeaders (${headers.filter(h => h).length} columns):`);
      headers.filter(h => h).forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });

      // Get sample data from first 3 rows (excluding header)
      console.log('\nSample data (first 3 rows):');
      let sampleCount = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (sampleCount >= 3) return;

        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            let value = cell.value;
            // Handle formula cells
            if (typeof value === 'object' && value !== null && 'formula' in value) {
              value = `[FORMULA: ${value.formula}]`;
            }
            rowData[header] = value;
          }
        });

        if (Object.keys(rowData).length > 0) {
          console.log(`  Row ${rowNumber}:`, JSON.stringify(rowData, null, 4).substring(0, 200) + '...');
          sampleCount++;
        }
      });

      console.log('\n' + '='.repeat(80));
    }

    console.log('\n\n📋 Worksheet Summary:');
    console.log('-'.repeat(80));
    workbook.worksheets.forEach((ws, index) => {
      console.log(`${index + 1}. ${ws.name} (${ws.rowCount} rows, ${ws.columnCount} cols)`);
    });

  } catch (error: any) {
    console.error('❌ Error analyzing worksheets:', error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeWorksheets();
