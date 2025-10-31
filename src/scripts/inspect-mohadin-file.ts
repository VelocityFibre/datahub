import { sharepointClient } from '../connectors/sharepoint/client.js';

async function inspectMohadinFile() {
  try {
    const mohadinUrl = 'https://blitzfibre.sharepoint.com/:x:/s/Velocity_Manco/EYm7g0w6Y1dFgGB_m4YlBxgBeVJpoDXAYjdvK-ZfgHoOqA?e=PaRb5T';

    console.log('Fetching Mohadin workbook...\n');
    const workbook = await sharepointClient.getExcelFile(mohadinUrl);

    console.log(`Total worksheets: ${workbook.worksheets.length}\n`);
    console.log('Sheet names:\n');

    workbook.worksheets.forEach((sheet, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${sheet.name} (${sheet.rowCount} rows, ${sheet.columnCount} cols)`);
    });

    // Look for Mohadin Activations
    const mohadinSheet = workbook.worksheets.find(ws =>
      ws.name.toLowerCase().includes('mohadin') && ws.name.toLowerCase().includes('activ')
    );

    if (mohadinSheet) {
      console.log(`\n✅ Found: "${mohadinSheet.name}"`);
      console.log(`Rows: ${mohadinSheet.rowCount}`);
      console.log(`Columns: ${mohadinSheet.columnCount}\n`);

      // Extract headers
      const headerRow = mohadinSheet.getRow(1);
      console.log('Column headers:\n');

      headerRow.eachCell((cell, colNumber) => {
        const header = String(cell.value || '').trim();
        const colLetter = String.fromCharCode(64 + colNumber);
        console.log(`${colLetter.padStart(3)}. ${header}`);
      });

      // Get first data row to see structure
      console.log('\n\nFirst data row sample:\n');
      const dataRow = mohadinSheet.getRow(2);
      headerRow.eachCell((cell, colNumber) => {
        const header = String(cell.value || '').trim();
        const value = dataRow.getCell(colNumber).value;
        const colLetter = String.fromCharCode(64 + colNumber);
        console.log(`${colLetter.padStart(3)}. ${header.padEnd(40)} = ${value}`);
      });
    } else {
      console.log('\n❌ No "Mohadin Activations" sheet found');
    }

    console.log('\n');
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

inspectMohadinFile();
