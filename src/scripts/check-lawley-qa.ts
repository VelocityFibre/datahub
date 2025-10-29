import { sql } from '../database/client.js';

async function checkLawleyQA() {
  try {
    const bySource = await sql`
      SELECT source, COUNT(*) as count
      FROM sharepoint_lawley_qa
      GROUP BY source
    `;

    const total = await sql`
      SELECT COUNT(*) as total
      FROM sharepoint_lawley_qa
    `;

    console.log('\n📊 Lawley QA Sync Results:');
    console.log('─'.repeat(40));
    console.log('Records by source:', bySource);
    console.log('Total records:', total[0].total);

    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLawleyQA();
