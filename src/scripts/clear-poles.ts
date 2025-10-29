import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

async function clearPoles() {
  try {
    console.log('Clearing existing poles from sharepoint_hld_pole...');

    const result = await sql`DELETE FROM sharepoint_hld_pole`;
    console.log(`✅ Deleted all poles`);

    const count = await sql`SELECT COUNT(*) as count FROM sharepoint_hld_pole`;
    console.log(`Current count: ${count[0].count}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    logger.error('Failed to clear poles', { error: error.message });
    process.exit(1);
  }
}

clearPoles();
