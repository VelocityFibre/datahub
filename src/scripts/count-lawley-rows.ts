import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function countLawleyRows() {
  try {
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    const activationsSheet = workbook.getWorksheet('Lawley Activations');
    const historicalSheet = workbook.getWorksheet('Lawley Historical');

    console.log('=== Counting Actual Data Rows ===\n');

    // Count Activations
    let activationsCount = 0;
    activationsSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Check if row has drop_number (col 2)
      const dropNumber = row.getCell(2).value;
      if (dropNumber && String(dropNumber).trim() !== '') {
        activationsCount++;
        if (activationsCount <= 3) {
          console.log(`Activations row ${rowNumber}: ${dropNumber}`);
        }
      }
    });

    console.log(`\n✅ Lawley Activations: ${activationsCount} actual data rows\n`);

    // Count Historical
    let historicalCount = 0;
    historicalSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const dropNumber = row.getCell(2).value;
      if (dropNumber && String(dropNumber).trim() !== '' && !String(dropNumber).includes('before')) {
        historicalCount++;
        if (historicalCount <= 3) {
          console.log(`Historical row ${rowNumber}: ${dropNumber}`);
        }
      }
    });

    console.log(`\n✅ Lawley Historical: ${historicalCount} actual data rows\n`);
    console.log(`📊 Total combined: ${activationsCount + historicalCount} records\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

countLawleyRows();
