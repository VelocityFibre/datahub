import { sql } from '../database/client.js';

async function checkActualColumns() {
  try {
    console.log('=== Checking Actual Columns from SharePoint ===\n');

    // Get a recent record to see all available columns
    const recent = await sql`
      SELECT
        drop_number,
        source,
        sync_timestamp,
        raw_data
      FROM sharepoint_lawley_qa
      WHERE source = 'activations'
      ORDER BY sync_timestamp DESC
      LIMIT 1
    `;

    if (recent.length === 0) {
      console.log('❌ No records found\n');
      process.exit(1);
    }

    console.log('Recent record from Activations sheet:');
    console.log(`Drop: ${recent[0].drop_number}`);
    console.log(`Synced: ${recent[0].sync_timestamp}`);
    console.log('\nAll available columns in raw_data:\n');

    const rawData = recent[0].raw_data as any;
    const keys = Object.keys(rawData).sort();

    keys.forEach((key, index) => {
      const value = rawData[key];
      const displayValue = value === null || value === undefined ? '(null)' :
                          typeof value === 'string' && value.length > 50 ? value.substring(0, 47) + '...' :
                          value;
      console.log(`${(index + 1).toString().padStart(3)}. ${key.padEnd(50)} = ${displayValue}`);
    });

    console.log(`\n📊 Total columns extracted: ${keys.length}\n`);

    // Check if these specific columns exist
    const searchColumns = ['zone_no', 'pon_no', 'zone', 'pon', 'pon_number', 'zone_number'];
    console.log('Looking for zone/pon related columns:');

    const found = keys.filter(k =>
      searchColumns.some(s => k.includes(s)) ||
      k.includes('zone') ||
      k.includes('pon')
    );

    if (found.length > 0) {
      console.log('✅ Found related columns:');
      found.forEach(f => {
        console.log(`   - ${f} = ${rawData[f]}`);
      });
    } else {
      console.log('❌ No zone/pon related columns found');
      console.log('\nColumn names containing numbers or references:');
      keys.filter(k => /\d+|no|num|id|ref/i.test(k)).forEach(k => {
        console.log(`   - ${k} = ${rawData[k]}`);
      });
    }

    console.log('\n=== ✅ Column Check Complete! ===\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  }
}

checkActualColumns();
