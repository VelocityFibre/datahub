import { sql } from '../database/client.js';

(async () => {
  const result = await sql`SELECT COUNT(*) as count FROM sharepoint_1map_ins`;
  console.log('1Map_Ins records:', result[0].count);
  process.exit(0);
})();
