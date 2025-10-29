import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function inspectTrackerHome() {
  try {
    console.log('Fetching workbook...\n');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    const worksheet = workbook.getWorksheet('Tracker_Home');
    if (!worksheet) {
      console.log('❌ Tracker_Home worksheet not found');
      return;
    }

    console.log(`📊 Tracker_Home: ${worksheet.rowCount} rows, ${worksheet.columnCount} cols\n`);

    // Get header row
    const headerRow = worksheet.getRow(1);
    console.log('Headers:');
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value;
      const displayValue = typeof value === 'object' && value !== null
        ? JSON.stringify(value).substring(0, 50)
        : value;
      console.log(`  ${colNumber}. ${displayValue}`);
    });

    // Sample first data row
    console.log('\nFirst data row:');
    const dataRow = worksheet.getRow(2);
    dataRow.eachCell((cell, colNumber) => {
      const value = cell.value;
      const displayValue = typeof value === 'object' && value !== null
        ? JSON.stringify(value).substring(0, 80)
        : value;
      console.log(`  Col ${colNumber}: ${displayValue}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspectTrackerHome();
