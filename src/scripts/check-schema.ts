import { sql } from '../database/client.js';

async function checkSchema() {
  try {
    console.log('=== Checking sharepoint_lawley_qa schema ===\n');

    const lawleyColumns = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sharepoint_lawley_qa'
      ORDER BY ordinal_position
    `;

    console.log('Columns:');
    console.table(lawleyColumns);

    console.log('\n=== Checking if zone_no and pon_no exist ===');
    const hasZonePon = lawleyColumns.some((c: any) => c.column_name === 'zone_no');
    console.log(`Has zone_no: ${hasZonePon}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
