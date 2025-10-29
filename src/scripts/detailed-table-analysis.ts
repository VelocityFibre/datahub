import { sql } from '../database/client.js';
import { logger } from '../utils/logger.js';

/**
 * Detailed analysis of relevant tables for SharePoint mapping
 */

async function analyzeRelevantTables() {
  try {
    console.log('=== Detailed Neon Database Analysis for SharePoint Mapping ===\n');

    // Get all table names first
    const allTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`Total tables in database: ${allTables.length}\n`);

    // Focus on SOW and relevant tables
    const relevantPatterns = ['sow_', 'pole', 'drop', 'home', 'fiber', 'fibre', 'pon', 'project', 'tracker'];

    const relevantTables = allTables.filter((t: any) =>
      relevantPatterns.some(pattern => t.table_name.toLowerCase().includes(pattern))
    );

    console.log(`Relevant tables for mapping: ${relevantTables.length}\n`);
    console.log('='.repeat(100) + '\n');

    for (const table of relevantTables) {
      const tableName = table.table_name;
      console.log(`\n📊 TABLE: ${tableName.toUpperCase()}`);
      console.log('='.repeat(100));

      // Get column details
      const columns = await sql`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      console.log(`\nColumns (${columns.length}):`);
      console.log('-'.repeat(100));

      columns.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` | DEFAULT: ${col.column_default.substring(0, 50)}` : '';
        console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });

      // Get sample data
      try {
        const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 3`;
        const samples = await sql.unsafe(sampleQuery);

        if (samples.length > 0) {
          console.log(`\nSample Data (${samples.length} rows):`);
          console.log('-'.repeat(100));
          samples.forEach((row: any, idx: number) => {
            console.log(`\nRow ${idx + 1}:`);
            Object.keys(row).slice(0, 10).forEach(key => {
              let value = row[key];
              if (value !== null && typeof value === 'object') {
                value = JSON.stringify(value).substring(0, 100) + '...';
              } else if (value !== null && typeof value === 'string' && value.length > 100) {
                value = value.substring(0, 100) + '...';
              }
              console.log(`  ${key}: ${value}`);
            });
            if (Object.keys(row).length > 10) {
              console.log(`  ... (${Object.keys(row).length - 10} more fields)`);
            }
          });
        } else {
          console.log('\n⚠️  No data in this table (empty)');
        }
      } catch (error: any) {
        console.log(`\n⚠️  Could not fetch sample data: ${error.message}`);
      }

      // Get row count
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
        const countResult = await sql.unsafe(countQuery);
        console.log(`\n📈 Total Rows: ${countResult[0].count}`);
      } catch (error: any) {
        console.log(`\n⚠️  Could not count rows: ${error.message}`);
      }

      // Get indexes
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = ${tableName}
        ORDER BY indexname
      `;

      if (indexes.length > 0) {
        console.log(`\n🔑 Indexes (${indexes.length}):`);
        indexes.forEach((idx: any) => {
          console.log(`  - ${idx.indexname}`);
        });
      }

      console.log('\n' + '='.repeat(100));
    }

    // List all other tables for reference
    const otherTables = allTables.filter((t: any) =>
      !relevantPatterns.some(pattern => t.table_name.toLowerCase().includes(pattern))
    );

    console.log('\n\n📋 OTHER TABLES (for reference):');
    console.log('-'.repeat(100));
    otherTables.forEach((t: any, idx: number) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${t.table_name}`);
    });

  } catch (error: any) {
    console.error('❌ Error analyzing database:', error.message);
    logger.error('Failed to analyze database', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run analysis
analyzeRelevantTables();
