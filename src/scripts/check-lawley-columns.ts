import { sql } from '../database/client.js';

async function checkColumns() {
  try {
    console.log('Checking sharepoint_lawley_qa columns...\n');

    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sharepoint_lawley_qa'
      ORDER BY ordinal_position
    `;

    console.log('Column structure:');
    console.table(columns);

    // Check if zone_no and pon_no exist
    const hasZone = columns.some((c: any) => c.column_name === 'zone_no');
    const hasPon = columns.some((c: any) => c.column_name === 'pon_no');

    console.log(`\nzone_no column: ${hasZone ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`pon_no column: ${hasPon ? '✅ EXISTS' : '❌ MISSING'}`);

    if (!hasZone || !hasPon) {
      console.log('\n⚠️  Need to run migration: 003_add_lawley_qa_zone_pon.sql\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
