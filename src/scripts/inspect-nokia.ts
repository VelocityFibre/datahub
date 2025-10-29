import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function inspectNokia() {
  try {
    console.log('Fetching workbook...\n');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    const worksheet = workbook.getWorksheet('Nokia_Exp');
    if (!worksheet) {
      console.log('❌ Nokia_Exp worksheet not found');
      return;
    }

    console.log(`📊 Nokia_Exp: ${worksheet.rowCount} rows, ${worksheet.columnCount} cols\n`);

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

    // Sample first 3 data rows
    console.log('\nFirst 3 data rows:');
    for (let i = 2; i <= 4; i++) {
      const dataRow = worksheet.getRow(i);
      console.log(`\nRow ${i}:`);
      dataRow.eachCell((cell, colNumber) => {
        const value = cell.value;
        let displayValue = value;
        if (typeof value === 'object' && value !== null) {
          if ('result' in value) {
            displayValue = value.result;
          } else {
            displayValue = JSON.stringify(value).substring(0, 60);
          }
        }
        const header = headerRow.getCell(colNumber).value;
        console.log(`  ${header}: ${displayValue}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspectNokia();
