import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function debug1MapPole() {
  try {
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);
    const worksheet = workbook.getWorksheet('1Map_Pole');

    if (!worksheet) {
      console.log('❌ 1Map_Pole not found');
      return;
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      let value = cell.value;
      if (value && typeof value === 'object' && 'result' in value) {
        value = value.result;
      }
      const headerName = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      headers[colNumber] = headerName;
    });

    console.log('First 20 headers:');
    for (let i = 1; i <= Math.min(20, headers.length); i++) {
      if (headers[i]) {
        console.log(`  ${i}. ${headers[i]}`);
      }
    }

    // Check first data row
    console.log('\nFirst data row (first 15 values):');
    const dataRow = worksheet.getRow(2);
    let count = 0;
    dataRow.eachCell((cell, colNumber) => {
      if (count < 15 && headers[colNumber]) {
        let value = cell.value;
        if (value && typeof value === 'object' && 'result' in value) {
          value = value.result;
        }
        console.log(`  ${headers[colNumber]}: ${value}`);
        count++;
      }
    });

    // Check if any row has data
    console.log('\nChecking for non-empty rows...');
    let nonEmptyCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      let hasData = false;
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          hasData = true;
        }
      });

      if (hasData) {
        nonEmptyCount++;
        if (nonEmptyCount <= 3) {
          console.log(`  Row ${rowNumber} has data`);
        }
      }
    });
    console.log(`Total non-empty rows: ${nonEmptyCount}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

debug1MapPole();
