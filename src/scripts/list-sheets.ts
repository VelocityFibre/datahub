import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';

async function listSheets() {
  try {
    console.log('Fetching workbook...\n');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);

    console.log(`Total worksheets: ${workbook.worksheets.length}\n`);
    console.log('Sheet names:\n');

    workbook.worksheets.forEach((sheet, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${sheet.name}`);
    });

    console.log('\n');
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listSheets();
