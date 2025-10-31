import { sharepointClient } from '../connectors/sharepoint/client.js';
import { sharepointConfig } from '../config/sharepoint.config.js';
import { sql } from '../database/client.js';

/**
 * Schema Change Detection Tool
 *
 * Detects new columns in SharePoint worksheets that aren't mapped to typed database columns.
 * Helps identify when manual schema updates are needed.
 */

interface ColumnAnalysis {
  worksheet: string;
  existingColumns: Set<string>;
  newColumns: string[];
  totalColumns: number;
}

async function detectSchemaChanges() {
  console.log('=== SharePoint Schema Change Detection ===\n');

  try {
    // Fetch workbook
    console.log('Fetching Excel file from SharePoint...');
    const workbook = await sharepointClient.getExcelFile(sharepointConfig.lawleyFileUrl);
    console.log(`✅ Downloaded (${workbook.worksheets.length} worksheets)\n`);

    // Get database table columns
    const tableColumns = await sql`
      SELECT
        column_name,
        table_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'sharepoint_%'
      ORDER BY table_name, ordinal_position
    `;

    const columnsByTable = new Map<string, Set<string>>();
    tableColumns.forEach((col: any) => {
      if (!columnsByTable.has(col.table_name)) {
        columnsByTable.set(col.table_name, new Set());
      }
      columnsByTable.get(col.table_name)!.add(col.column_name);
    });

    // Analyze each worksheet
    const worksheetMappings = [
      { sheetName: 'Lawley Activations', tableName: 'sharepoint_lawley_qa' },
      { sheetName: 'Lawley Historical', tableName: 'sharepoint_lawley_qa' },
      { sheetName: 'HLD_Pole', tableName: 'sharepoint_hld_pole' },
      { sheetName: 'HLD_Home', tableName: 'sharepoint_hld_home' },
      { sheetName: 'Tracker_Pole', tableName: 'sharepoint_tracker_pole' },
      { sheetName: 'Tracker_Home', tableName: 'sharepoint_tracker_home' },
      { sheetName: 'Nokia_Exp', tableName: 'sharepoint_nokia_exp' },
      { sheetName: '1Map_Ins', tableName: 'sharepoint_1map_ins' },
      { sheetName: '1Map_Pole', tableName: 'sharepoint_1map_pole' },
    ];

    const results: ColumnAnalysis[] = [];

    for (const mapping of worksheetMappings) {
      const worksheet = workbook.worksheets.find(ws => ws.name === mapping.sheetName);
      if (!worksheet) {
        console.log(`⚠️  Worksheet "${mapping.sheetName}" not found\n`);
        continue;
      }

      // Extract headers
      const headers: string[] = [];
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        const rawHeader = String(cell.value || '').trim();
        const normalized = rawHeader
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        if (normalized) headers.push(normalized);
      });

      // Compare with database
      const dbColumns = columnsByTable.get(mapping.tableName) || new Set();
      const newColumns = headers.filter(h =>
        !dbColumns.has(h) &&
        h !== 'id' &&
        h !== 'sync_timestamp' &&
        h !== 'raw_data' &&
        h !== 'created_at' &&
        h !== 'updated_at' &&
        h !== 'project_id' &&
        h !== 'source_file'
      );

      results.push({
        worksheet: mapping.sheetName,
        existingColumns: dbColumns,
        newColumns,
        totalColumns: headers.length
      });

      // Display results
      console.log(`📊 ${mapping.sheetName} → ${mapping.tableName}`);
      console.log(`   Total columns in Excel: ${headers.length}`);
      console.log(`   Typed columns in DB: ${dbColumns.size}`);

      if (newColumns.length > 0) {
        console.log(`   ⚠️  NEW UNMAPPED COLUMNS (${newColumns.length}):`);
        newColumns.forEach(col => console.log(`      - ${col}`));
        console.log('');
      } else {
        console.log(`   ✅ All columns mapped\n`);
      }
    }

    // Summary
    console.log('\n=== Summary ===\n');
    const totalNew = results.reduce((sum, r) => sum + r.newColumns.length, 0);

    if (totalNew === 0) {
      console.log('✅ No schema changes detected - all columns are mapped!\n');
    } else {
      console.log(`⚠️  Found ${totalNew} unmapped columns across ${results.filter(r => r.newColumns.length > 0).length} worksheets\n`);
      console.log('📝 Actions required:');
      console.log('   1. Review new columns to determine if they need typed database fields');
      console.log('   2. Create migration file: src/database/migrations/00X_add_columns.sql');
      console.log('   3. Update connector INSERT statements if needed');
      console.log('   4. Note: All data is ALREADY captured in raw_data JSONB field\n');
    }

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Detection failed:', error.message);
    process.exit(1);
  }
}

detectSchemaChanges();
