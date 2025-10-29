import { sql } from '../database/client.js';

async function fixColumn() {
  try {
    console.log('Altering completed_photos column to TEXT...');
    await sql`
      ALTER TABLE sharepoint_lawley_qa
      ALTER COLUMN completed_photos TYPE TEXT
    `;
    console.log('✅ Column altered successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixColumn();
