import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

/**
 * Sample first few rows of Mohadin Activations to see date/complete fields
 */
async function sampleMohadinData() {
  try {
    console.log('=== Mohadin Activations - Data Sample ===\n');

    const workbook = await sharepointClient.getExcelFile(sharepointConfig.mohadinFileUrl);
    const worksheet = workbook.getWorksheet('Mohadin Activations');

    if (!worksheet) {
      console.error('❌ Mohadin Activations worksheet not found');
      process.exit(1);
    }

    console.log('Sampling first 5 data rows (rows 2-6):\n');

    // Get header row
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

    // Focus on key columns
    const columnsToShow = [
      { index: 1, name: 'Date' },
      { index: 2, name: 'Drop Number' },
      { index: 15, name: 'Completed Photos' },
      { index: 19, name: 'QA Completed | Loaded to SP' },
      { index: 21, name: 'Incomplete' },
      { index: 22, name: 'Resubmitted' },
      { index: 23, name: 'Completed (23)' },
      { index: 24, name: 'Resubmission Time' },
      { index: 25, name: 'Completed (25)' },
      { index: 26, name: 'Resubmitted (26)' },
      { index: 27, name: 'Resubmission Time (27)' },
      { index: 28, name: 'Completed (28)' },
    ];

    for (let rowNum = 2; rowNum <= 6; rowNum++) {
      const row = worksheet.getRow(rowNum);

      console.log(`\n--- Row ${rowNum} ---`);

      columnsToShow.forEach(col => {
        const cell = row.getCell(col.index);
        let value = cell.value;

        if (value && typeof value === 'object' && value !== null) {
          if ('result' in value) value = (value as any).result;
          else if ('text' in value) value = (value as any).text;
        }

        // Format dates nicely
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }

        console.log(`  ${col.name.padEnd(30)}: ${value !== null && value !== undefined ? value : '(empty)'}`);
      });
    }

    console.log('\n=== ✅ Sample Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

sampleMohadinData();
