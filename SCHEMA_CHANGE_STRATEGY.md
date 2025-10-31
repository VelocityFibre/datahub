# SharePoint Schema Change Strategy

## Overview

This document explains how we handle changes to SharePoint worksheets (new columns, renamed columns, etc.) without breaking our sync system.

## Current Architecture

### Data Storage (2-Layer Approach)

1. **Typed Columns** - Frequently queried fields with proper database types
2. **raw_data (JSONB)** - Complete backup of all SharePoint data

```sql
CREATE TABLE sharepoint_lawley_qa (
  -- Typed columns for fast queries
  zone_no INTEGER,
  pon_no INTEGER,
  drop_number VARCHAR(255),

  -- Full backup (includes ALL columns)
  raw_data JSONB,
  ...
);
```

### Auto-Extraction

The `BaseWorksheetConnector.extractHeaders()` method automatically:
- Extracts ALL column headers from Excel
- Normalizes to snake_case (e.g., "Zone No" → "zone_no")
- Stores complete row data in `raw_data` JSONB

**This means new columns are ALWAYS captured, even if not mapped to typed fields.**

## When New Columns Are Added

### Immediate Impact: ✅ None

New columns are automatically:
- Extracted by `extractHeaders()`
- Stored in `raw_data` JSONB
- Available for querying via JSON operators

Example query for unmapped column:
```sql
SELECT raw_data->>'new_column_name' as new_column
FROM sharepoint_lawley_qa;
```

### When to Promote to Typed Column

Only create typed columns when:
1. **Frequent filtering** - Used in WHERE clauses often
2. **Joins** - Needed for table relationships
3. **Aggregations** - Used in GROUP BY, SUM, AVG, etc.
4. **Performance** - JSON queries are too slow

## Handling Schema Changes

### Option A: Leave in raw_data (RECOMMENDED for most cases)

**Pros:**
- Zero code changes needed
- Data is already captured
- Simple queries via JSON operators

**Cons:**
- Slower queries (negligible for small datasets)
- Less type safety

**When to use:**
- Infrequently queried columns
- Text/comment fields
- One-time analysis needs

### Option B: Promote to Typed Column

**Steps:**

1. **Create Migration File**
   ```sql
   -- src/database/migrations/00X_add_new_column.sql
   ALTER TABLE sharepoint_lawley_qa
   ADD COLUMN IF NOT EXISTS new_column INTEGER;

   CREATE INDEX IF NOT EXISTS idx_lawley_new_column
   ON sharepoint_lawley_qa(new_column);
   ```

2. **Update Connector Insert Statement**
   ```typescript
   // src/connectors/sharepoint/worksheets/lawley-qa.connector.ts
   INSERT INTO sharepoint_lawley_qa (
     zone_no, pon_no, new_column,  // Add here
     ...
   ) VALUES (
     ${record.zone_no || null},
     ${record.pon_no || null},
     ${record.new_column || null},  // Add here
     ...
   )
   ```

3. **Run Migration**
   ```bash
   npm run migrate
   ```

4. **Sync Data**
   ```bash
   npm run sync:lawley-activations:activations
   ```

## Detection Tools

### Detect New Columns

Run this script to find unmapped columns:
```bash
npx tsx src/scripts/detect-schema-changes.ts
```

Output shows:
- Total columns per worksheet
- Which columns are typed in database
- Which columns are new/unmapped

## Real-World Example: zone_no & pon_no

**Scenario:** "Mohadin Activations" sheet added columns C (zone_no) and D (pon_no)

**Steps Taken:**
1. Created `003_add_lawley_qa_zone_pon.sql` migration
2. Updated `lawley-qa.connector.ts` INSERT statement
3. Ran migration to add columns
4. Next sync will populate new fields

**Why promote these?**
- Frequently used for filtering (WHERE zone_no = 5)
- Used for joins with other tables (poles, homes)
- Critical for network assignment queries

## Best Practices

### ✅ DO

- Use `detect-schema-changes.ts` monthly to check for drift
- Store ALL data in `raw_data` JSONB (already happening)
- Promote columns to typed only when needed
- Document reason in migration comments
- Create indexes for filtered/joined columns

### ❌ DON'T

- Create typed columns "just in case"
- Remove old columns (add, never delete)
- Skip raw_data backup
- Auto-generate schema without review
- Mix data types (use NULL for missing values)

## Column Naming Conventions

SharePoint → Database mapping:
- `Zone No` → `zone_no`
- `PON-Number` → `pon_number`
- `Drop #` → `drop`
- `Date & Time` → `date_time`

Rule: Lowercase, underscores, remove special chars

## Future Enhancements

Considered but NOT implemented (too complex):

1. **Auto-migration on detect** - Risky, no review
2. **Fully dynamic schema** - Loss of type safety
3. **Column versioning** - Overkill for current needs

## Summary

**For 99% of new columns:** Do nothing, they're already in `raw_data`

**For critical filtering/join columns:** Follow Option B promotion steps

**Monthly check:** Run `detect-schema-changes.ts` to stay informed
