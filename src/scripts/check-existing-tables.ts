import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Script to check existing tables in Neon database
 * This helps us understand what's already there before we start syncing
 */

async function checkExistingTables() {
  try {
    console.log('=== Neon Database - Existing Tables ===\n');

    // Get all tables in the public schema
    const tables = await sql`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      console.log('No tables found in the database.\n');
      return;
    }

    console.log(`Found ${tables.length} table(s):\n`);

    for (const table of tables) {
      console.log(`📊 Table: ${table.table_name}`);
      console.log('-'.repeat(80));

      // Get column details for this table
      const columns = await sql`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${table.table_name}
        ORDER BY ordinal_position
      `;

      console.log(`Columns (${columns.length}):`);
      columns.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });

      // Get row count
      try {
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        console.log(`\nRow count: ${countResult[0].count}`);
      } catch (error: any) {
        console.log(`\nRow count: Unable to fetch (${error.message})`);
      }

      // Get indexes
      const indexes = await sql`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = ${table.table_name}
        ORDER BY indexname
      `;

      if (indexes.length > 0) {
        console.log(`\nIndexes (${indexes.length}):`);
        indexes.forEach((idx: any) => {
          console.log(`  - ${idx.indexname}`);
        });
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

  } catch (error: any) {
    console.error('❌ Error checking database tables:', error.message);
    logger.error('Failed to check existing tables', { error: error.message });
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkExistingTables();
