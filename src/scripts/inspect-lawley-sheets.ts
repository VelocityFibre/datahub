import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function inspectLawleySheets() {
  try {
    console.log('Fetching workbook from SharePoint...\n');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    console.log('=== All Worksheets ===\n');
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.name} (${sheet.rowCount} rows, ${sheet.columnCount} cols)`);
    });

    // Look for Lawley-related sheets
    console.log('\n=== Lawley-Related Sheets ===\n');
    const lawleySheets = workbook.worksheets.filter(sheet =>
      sheet.name.toLowerCase().includes('lawley') ||
      sheet.name.toLowerCase().includes('activation') ||
      sheet.name.toLowerCase().includes('historical')
    );

    if (lawleySheets.length === 0) {
      console.log('No sheets with "lawley", "activation", or "historical" in the name found.');
      console.log('\nSearching for sheets that might contain activation data...\n');

      // Check sheets that might have activation data
      for (const sheet of workbook.worksheets) {
        if (sheet.rowCount > 100) { // Skip small reference sheets
          const headerRow = sheet.getRow(1);
          let hasActivationColumns = false;

          headerRow.eachCell((cell) => {
            const value = String(cell.value || '').toLowerCase();
            if (value.includes('activation') || value.includes('customer') || value.includes('date')) {
              hasActivationColumns = true;
            }
          });

          if (hasActivationColumns) {
            console.log(`Potential: ${sheet.name} (${sheet.rowCount} rows)`);
          }
        }
      }
    } else {
      for (const sheet of lawleySheets) {
        console.log(`\n📊 Sheet: "${sheet.name}"`);
        console.log(`Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}\n`);

        // Get headers
        const headerRow = sheet.getRow(1);
        console.log('Headers (first 20):');
        let colCount = 0;
        headerRow.eachCell((cell, colNumber) => {
          if (colCount < 20) {
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              value = value.result;
            }
            console.log(`  ${colNumber}. ${value}`);
            colCount++;
          }
        });

        // Sample first data row
        console.log('\nFirst data row (first 10 values):');
        const dataRow = sheet.getRow(2);
        let cellCount = 0;
        dataRow.eachCell((cell, colNumber) => {
          if (cellCount < 10) {
            const header = headerRow.getCell(colNumber).value;
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              value = value.result;
            }
            console.log(`  ${header}: ${value}`);
            cellCount++;
          }
        });

        console.log('\n' + '='.repeat(80));
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspectLawleySheets();
