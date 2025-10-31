# DataHub Operations Quick Reference

## Daily Operations

### Run Full Sync
```bash
npm run sync
```
Syncs all 8 worksheets from SharePoint to database.

### Run Individual Sync
```bash
npm run sync:lawley-activations    # QA photos (most frequent)
npm run sync:hld-pole              # Pole design
npm run sync:hld-home              # Home design
npm run sync:tracker-pole          # Pole status
npm run sync:tracker-home          # Home status
npm run sync:nokia-exp             # Activations
npm run sync:1map-ins              # OneMap installations
npm run sync:1map-pole             # OneMap poles
```

### Check Sync Status
```bash
npm run check:status               # View recent sync logs
tail -f logs/datahub.log          # Watch live logs
tail -f logs/error.log            # Watch errors
```

## Monthly Maintenance

### Detect Schema Changes
```bash
npm run detect:schema-changes
```
**Run this monthly** to check if SharePoint added new columns.

**Output shows:**
- ✅ Columns already mapped to database
- ⚠️ New columns (stored in raw_data but not typed)

**Action:** Review new columns and promote important ones to typed fields.

## When SharePoint Adds New Columns

### Step 1: Run Migration
```bash
npm run migrate
```
Applies pending migrations from `src/database/migrations/`.

### Step 2: Sync Data
```bash
# For specific worksheet
npm run sync:lawley-activations

# Or sync everything
npm run sync
```

### Step 3: Verify Data
```bash
# Connect to database
psql "$DATABASE_URL"

# Check new columns populated
SELECT zone_no, pon_no, drop_number
FROM sharepoint_lawley_qa
WHERE zone_no IS NOT NULL
LIMIT 10;

# Exit database
\q
```

## Creating New Migrations

When you need to promote a column from `raw_data` to typed field:

### 1. Create Migration File
```bash
# Create file: src/database/migrations/00X_add_new_columns.sql
```

```sql
ALTER TABLE sharepoint_lawley_qa
ADD COLUMN IF NOT EXISTS new_column_name INTEGER;

CREATE INDEX IF NOT EXISTS idx_lawley_new_column
ON sharepoint_lawley_qa(new_column_name);

COMMENT ON COLUMN sharepoint_lawley_qa.new_column_name
IS 'Description of what this column contains';
```

### 2. Update Connector
Edit: `src/connectors/sharepoint/worksheets/lawley-qa.connector.ts`

Add to INSERT statement:
```typescript
INSERT INTO sharepoint_lawley_qa (
  zone_no, pon_no, new_column_name,  // ← Add here
  ...
) VALUES (
  ${record.zone_no || null},
  ${record.pon_no || null},
  ${record.new_column_name || null},  // ← Add here
  ...
)
```

### 3. Test
```bash
# Run migration
npm run migrate

# Test sync
npm run sync:lawley-activations

# Verify in database
psql "$DATABASE_URL" -c "SELECT new_column_name FROM sharepoint_lawley_qa LIMIT 5;"
```

## Database Access

### Connect to Database
```bash
psql "$DATABASE_URL"
```

### Common Queries
```sql
-- View all tables
\dt

-- Describe table structure
\d sharepoint_lawley_qa

-- Count records
SELECT COUNT(*) FROM sharepoint_lawley_qa;

-- View recent syncs
SELECT worksheet_name, status, records_processed, sync_started_at
FROM sharepoint_sync_log
ORDER BY sync_started_at DESC
LIMIT 10;

-- Check for unmapped data in raw_data
SELECT DISTINCT jsonb_object_keys(raw_data)
FROM sharepoint_lawley_qa
LIMIT 20;

-- Query unmapped column
SELECT
  drop_number,
  raw_data->>'unmapped_column_name' as unmapped_value
FROM sharepoint_lawley_qa
LIMIT 10;
```

## Troubleshooting

### Sync Fails
```bash
# Check logs
tail -100 logs/error.log

# Check database connection
psql "$DATABASE_URL" -c "SELECT NOW();"

# Test SharePoint connection
npm run analyze:worksheets
```

### Migration Fails
```bash
# Check current schema
psql "$DATABASE_URL" -c "\d sharepoint_lawley_qa"

# Manually run migration
psql "$DATABASE_URL" -f src/database/migrations/003_add_lawley_qa_zone_pon.sql
```

### Column Not Populating
```bash
# Check if data exists in raw_data
psql "$DATABASE_URL" -c "SELECT raw_data->>'column_name' FROM sharepoint_lawley_qa LIMIT 5;"

# If yes, connector needs update
# If no, column name might be different in SharePoint
npm run detect:schema-changes
```

## Automated Syncs

### View Cron Schedule
```bash
crontab -l
```

Current schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)

### View Cron Logs
```bash
tail -f logs/cron-sync.log
```

### Disable Automated Syncs
```bash
crontab -e
# Comment out the line with: npm run sync
```

### Re-enable Automated Syncs
```bash
crontab -e
# Uncomment the line with: npm run sync
```

## Emergency Procedures

### Stop All Running Syncs
```bash
pkill -f "tsx src/scripts/sync"
```

### Clear Failed Sync Locks
```sql
-- Connect to database
psql "$DATABASE_URL"

-- View stuck syncs
SELECT * FROM sharepoint_sync_log
WHERE status = 'running'
AND sync_started_at < NOW() - INTERVAL '1 hour';

-- Mark as failed
UPDATE sharepoint_sync_log
SET status = 'failed',
    error_message = 'Manually terminated',
    sync_completed_at = NOW()
WHERE status = 'running'
AND sync_started_at < NOW() - INTERVAL '1 hour';
```

### Rebuild Database (DESTRUCTIVE)
```bash
# ⚠️ WARNING: This deletes all data
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Recreate tables
npm run migrate

# Re-sync all data
npm run sync
```

## Performance Monitoring

### Check Database Size
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Sync Performance
```sql
SELECT
  worksheet_name,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  COUNT(*) as sync_count
FROM sharepoint_sync_log
WHERE status = 'success'
AND sync_started_at > NOW() - INTERVAL '7 days'
GROUP BY worksheet_name
ORDER BY avg_duration_ms DESC;
```

### Find Slow Queries
```sql
-- Enable query stats (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Reference Links

- **Full Documentation**: `README.md`
- **Schema Strategy**: `SCHEMA_CHANGE_STRATEGY.md`
- **Architecture**: `claude.md`
- **Migrations**: `src/database/migrations/`
- **Connectors**: `src/connectors/sharepoint/worksheets/`
