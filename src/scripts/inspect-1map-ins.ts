import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function inspect1MapIns() {
  try {
    console.log('Fetching workbook...\n');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    const worksheet = workbook.getWorksheet('1Map_Ins');
    if (!worksheet) {
      console.log('❌ 1Map_Ins worksheet not found');
      return;
    }

    console.log(`📊 1Map_Ins: ${worksheet.rowCount} rows, ${worksheet.columnCount} cols\n`);

    // Get header row
    const headerRow = worksheet.getRow(1);
    console.log('Headers (first 30):');
    let headerCount = 0;
    headerRow.eachCell((cell, colNumber) => {
      if (headerCount < 30) {
        const value = cell.value;
        const displayValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value).substring(0, 50)
          : value;
        console.log(`  ${colNumber}. ${displayValue}`);
        headerCount++;
      }
    });

    console.log(`\nTotal columns: ${headerCount}`);

    // Sample first data row (key fields only)
    console.log('\nFirst data row (first 15 columns):');
    const dataRow = worksheet.getRow(2);
    let cellCount = 0;
    dataRow.eachCell((cell, colNumber) => {
      if (cellCount < 15) {
        const header = headerRow.getCell(colNumber).value;
        let value = cell.value;
        if (typeof value === 'object' && value !== null && 'result' in value) {
          value = value.result;
        }
        console.log(`  ${header}: ${value}`);
        cellCount++;
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspect1MapIns();
