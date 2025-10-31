import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

/**
 * Inspect columns in Mohadin Activations sheet
 */
async function inspectMohadinColumns() {
  try {
    console.log('=== Mohadin Activations - Column Inspector ===\n');

    const workbook = await sharepointClient.getExcelFile(sharepointConfig.mohadinFileUrl);
    const worksheet = workbook.getWorksheet('Mohadin Activations');

    if (!worksheet) {
      console.error('❌ Mohadin Activations worksheet not found');
      process.exit(1);
    }

    console.log(`✅ Found worksheet: ${worksheet.name}`);
    console.log(`   Rows: ${worksheet.rowCount.toLocaleString()}`);
    console.log(`   Columns: ${worksheet.columnCount}\n`);

    // Extract headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;
      let header = '';

      if (value && typeof value === 'object' && 'text' in value) {
        header = value.text;
      } else if (value) {
        header = String(value);
      }

      headers.push(header);
    });

    console.log('📋 All Column Headers:\n');
    headers.forEach((header, index) => {
      if (header) {
        console.log(`${(index + 1).toString().padStart(3)}. ${header}`);
      }
    });

    // Search for date-related columns
    console.log('\n🔍 Date-related columns:\n');
    const dateColumns = headers.filter((h, i) =>
      h && (
        h.toLowerCase().includes('date') ||
        h.toLowerCase().includes('complete') ||
        h.toLowerCase().includes('timestamp')
      )
    ).map((h, idx) => ({ name: h, index: headers.indexOf(h) + 1 }));

    if (dateColumns.length > 0) {
      dateColumns.forEach(col => {
        console.log(`   Column ${col.index}: ${col.name}`);
      });
    } else {
      console.log('   ⚠️ No date/complete columns found');
    }

    console.log('\n=== ✅ Inspection Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

inspectMohadinColumns();
