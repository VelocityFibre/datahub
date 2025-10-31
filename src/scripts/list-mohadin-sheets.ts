import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

/**
 * List all worksheets in the Mohadin SharePoint file
 */
async function listMohadinSheets() {
  try {
    console.log('=== Mohadin SharePoint File - Worksheet Inspector ===\n');
    console.log('Fetching workbook from SharePoint...');
    console.log(`URL: ${sharepointConfig.mohadinFileUrl}\n`);

    const workbook = await sharepointClient.getExcelFile(sharepointConfig.mohadinFileUrl);

    console.log(`✅ File downloaded (${workbook.worksheets.length} worksheets)\n`);
    console.log('📋 Available Worksheets:\n');

    workbook.worksheets.forEach((sheet, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${sheet.name}`);
      console.log(`    - Rows: ${sheet.rowCount.toLocaleString()}`);
      console.log(`    - Columns: ${sheet.columnCount}`);
      console.log(`    - Visible: ${sheet.state === 'visible' ? 'Yes' : 'No (Hidden)'}`);
      console.log('');
    });

    // Check for specific sheet names related to monitoring
    console.log('\n🔍 Searching for WhatsApp/Monitoring sheets...\n');
    const monitorSheets = workbook.worksheets.filter(s =>
      s.name.toLowerCase().includes('monitor') ||
      s.name.toLowerCase().includes('whatsapp') ||
      s.name.toLowerCase().includes('wa ') ||
      s.name.toLowerCase().includes('duplicate') ||
      s.name.toLowerCase().includes('copy')
    );

    if (monitorSheets.length > 0) {
      console.log('Found potential monitoring sheets:');
      monitorSheets.forEach(s => console.log(`  - ${s.name}`));
    } else {
      console.log('⚠️ No obvious monitoring/duplicate sheets found');
      console.log('   (Check worksheet names above for manual identification)');
    }

    console.log('\n=== ✅ Inspection Complete ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

listMohadinSheets();
