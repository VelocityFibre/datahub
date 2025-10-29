import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function debugHeaders() {
  try {
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);
    const worksheet = workbook.getWorksheet('Nokia_Exp');

    if (!worksheet) {
      console.log('❌ Nokia_Exp not found');
      return;
    }

    // Extract headers using base connector logic
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell, colNumber) => {
      let value = cell.value;

      // Handle formulas
      if (value && typeof value === 'object' && 'result' in value) {
        value = value.result;
      }

      const headerName = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      headers[colNumber - 1] = headerName;
      console.log(`Col ${colNumber}: "${cell.value}" => "${headerName}"`);
    });

    // Check first data row
    console.log('\nFirst data row values:');
    const dataRow = worksheet.getRow(2);
    dataRow.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      console.log(`  ${header}: ${cell.value}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

debugHeaders();
