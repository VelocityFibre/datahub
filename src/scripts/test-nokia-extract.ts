import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function testExtract() {
  try {
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);
    const worksheet = workbook.getWorksheet('Nokia_Exp');

    if (!worksheet) {
      console.log('❌ Nokia_Exp not found');
      return;
    }

    // Manual extraction test
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
      headers[colNumber - 1] = headerName;
    });

    console.log(`Headers: ${headers.join(', ')}\n`);

    let rowsWithDropNumber = 0;
    let totalDataRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      totalDataRows++;

      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          let value = cell.value;
          if (value && typeof value === 'object' && 'result' in value) {
            value = value.result;
          }
          rowData[header] = value;
        }
      });

      if (rowData['drop_number']) {
        rowsWithDropNumber++;
        if (rowsWithDropNumber <= 3) {
          console.log(`Row ${rowNumber}: drop_number = ${rowData['drop_number']}, status = ${rowData['status']}`);
        }
      }
    });

    console.log(`\nTotal data rows: ${totalDataRows}`);
    console.log(`Rows with drop_number: ${rowsWithDropNumber}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testExtract();
