import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

/**
 * Find records that have completion fields populated
 */
async function findCompletedRecords() {
  try {
    console.log('=== Finding Completed Records in Mohadin Activations ===\n');

    const workbook = await sharepointClient.getExcelFile(sharepointConfig.mohadinFileUrl);
    const worksheet = workbook.getWorksheet('Mohadin Activations');

    if (!worksheet) {
      console.error('❌ Mohadin Activations worksheet not found');
      process.exit(1);
    }

    console.log('Scanning rows for populated completion fields...\n');

    const recordsWithData: any[] = [];
    let rowsScanned = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      if (rowsScanned >= 100) return; // Limit scan

      rowsScanned++;

      const dropNumber = row.getCell(2).value;
      const qaCompleted = row.getCell(19).value; // QA Completed | Loaded to SP
      const incomplete = row.getCell(21).value;
      const completed23 = row.getCell(23).value;
      const completed25 = row.getCell(25).value;
      const completed28 = row.getCell(28).value;

      if (qaCompleted || incomplete || completed23 || completed25 || completed28) {
        recordsWithData.push({
          row: rowNumber,
          dropNumber,
          qaCompleted,
          incomplete,
          completed23,
          completed25,
          completed28
        });
      }
    });

    console.log(`Scanned ${rowsScanned} rows\n`);
    console.log(`Found ${recordsWithData.length} records with completion data:\n`);

    if (recordsWithData.length > 0) {
      recordsWithData.slice(0, 10).forEach(r => {
        console.log(`Row ${r.row} - ${r.dropNumber}`);
        if (r.qaCompleted) console.log(`  QA Completed: ${r.qaCompleted}`);
        if (r.incomplete) console.log(`  Incomplete: ${r.incomplete}`);
        if (r.completed23) console.log(`  Completed (23): ${r.completed23}`);
        if (r.completed25) console.log(`  Completed (25): ${r.completed25}`);
        if (r.completed28) console.log(`  Completed (28): ${r.completed28}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No records found with completion data populated');
      console.log('   These fields may be:');
      console.log('   - Not yet in use');
      console.log('   - Formula/calculated fields');
      console.log('   - Part of a different sheet (duplicate for WA monitoring)');
    }

    // Check if there's a "Mohadin" duplicate sheet
    console.log('\n🔍 Checking for other Mohadin-related sheets...\n');
    const mohadinSheets = workbook.worksheets.filter(s =>
      s.name.toLowerCase().includes('mohadin')
    );

    console.log('Mohadin-related worksheets:');
    mohadinSheets.forEach(s => console.log(`  - ${s.name} (${s.rowCount} rows)`));

    console.log('\n=== ✅ Search Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findCompletedRecords();
