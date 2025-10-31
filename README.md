# VelocityFibre DataHub

Central data hub for syncing data from multiple sources to a centralized Neon PostgreSQL database.

## Overview

This project serves as the central data pipeline for VelocityFibre, enabling:
- Data extraction from multiple sources (SharePoint, etc.)
- Centralized storage in Neon PostgreSQL
- API access for Power BI analytics
- Integration with FibreFlow Next.js application

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- SharePoint credentials (Client ID, Secret, Tenant ID)
- Neon database access (already configured)

### Installation

```bash
# Install dependencies
npm install

# Create logs directory
mkdir -p logs
```

### Configuration

1. **Edit `.env.local`** with your SharePoint credentials:

```env
# SharePoint Configuration (REQUIRED)
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here
```

The Neon database URL is already configured.

### Getting SharePoint Credentials

To access SharePoint files, you need to register an app in Azure AD:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Name: `VelocityFibre DataHub`
5. Supported account types: **Single tenant**
6. Click **Register**
7. Copy the **Application (client) ID** → `SHAREPOINT_CLIENT_ID`
8. Copy the **Directory (tenant) ID** → `SHAREPOINT_TENANT_ID`
9. Go to **Certificates & secrets** > **New client secret**
10. Copy the secret value → `SHAREPOINT_CLIENT_SECRET`
11. Go to **API permissions** > **Add a permission**
12. Choose **Microsoft Graph** > **Application permissions**
13. Add: `Sites.Read.All`, `Files.Read.All`
14. Click **Grant admin consent**

## Usage

### Initialize Database Schema

```bash
# This creates the necessary tables
npm run dev
```

### Run Lawley Data Sync

```bash
# Extract data from SharePoint and sync to Neon
npm run sync:lawley
```

### View Logs

```bash
# View main log
tail -f logs/datahub.log

# View errors only
tail -f logs/error.log
```

## Project Structure

```
VelocityFibre_DataHub/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.config.ts
│   │   └── sharepoint.config.ts
│   ├── connectors/          # Data source connectors
│   │   └── sharepoint/
│   │       ├── auth.ts      # SharePoint authentication
│   │       ├── client.ts    # SharePoint Graph API client
│   │       └── lawley.connector.ts  # Lawley project connector
│   ├── sync/                # Synchronization services
│   │   └── lawley.sync.ts
│   ├── database/            # Database utilities
│   │   ├── client.ts        # Neon client
│   │   └── schemas/
│   │       └── lawley.schema.ts
│   ├── utils/               # Shared utilities
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   └── validators.ts
│   └── index.ts             # Main entry point
├── .env.local               # Environment variables
├── package.json
├── tsconfig.json
└── claude.md                # Detailed architecture docs
```

## Data Flow

1. **Extract**: Lawley connector fetches Excel file from SharePoint
2. **Transform**: Data is parsed and structured
3. **Load**: Data is inserted into Neon database
4. **API**: Power BI and FibreFlow can query the data

## Database Schema

### `lawley_project` Table

Stores Lawley project data from SharePoint.

```sql
id              SERIAL PRIMARY KEY
source_file     VARCHAR(500)
extracted_at    TIMESTAMP WITH TIME ZONE
synced_at       TIMESTAMP WITH TIME ZONE
data            JSONB              -- Flexible structure for now
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### `sync_log` Table

Tracks all sync operations for monitoring.

```sql
id                  SERIAL PRIMARY KEY
source              VARCHAR(100)
target              VARCHAR(100)
status              VARCHAR(50)
records_processed   INTEGER
records_failed      INTEGER
error_message       TEXT
started_at          TIMESTAMP WITH TIME ZONE
completed_at        TIMESTAMP WITH TIME ZONE
duration_ms         INTEGER
```

## Troubleshooting

### SharePoint Authentication Fails

**Error**: `Failed to authenticate with SharePoint`

**Solution**:
1. Verify your credentials in `.env.local`
2. Ensure the app has correct permissions in Azure AD
3. Check that admin consent was granted

### Database Connection Fails

**Error**: `Failed to connect to Neon database`

**Solution**:
1. Check your internet connection
2. Verify `NEON_DATABASE_URL` in `.env.local`
3. Ensure Neon database is active

### SharePoint File Not Found

**Error**: `Failed to fetch file from SharePoint`

**Solution**:
1. Verify the file URL in `.env.local`
2. Ensure the app has access to the SharePoint site
3. Check if the file still exists at the specified URL

## Next Steps

### 1. Test First Sync

Once SharePoint credentials are configured:

```bash
npm install
npm run sync:lawley
```

This will:
- Connect to SharePoint
- Download the Lawley Excel file
- Parse the data
- Create database tables
- Insert data into Neon

### 2. Analyze Data Structure

After first sync, review the data:

```bash
# Connect to Neon database
psql "$NEON_DATABASE_URL"

# View sample data
SELECT data FROM lawley_project LIMIT 5;

# See all columns in the data
SELECT DISTINCT jsonb_object_keys(data) FROM lawley_project;
```

### 3. Refine Schema

Based on the actual data structure, we can:
- Create proper columns instead of JSONB
- Add indexes for better query performance
- Create views for common queries

### 4. Set Up API Endpoints

Create API endpoints for Power BI to consume the data.

### 5. Schedule Automatic Syncs

Set up cron jobs or scheduled tasks to sync data automatically.

## Automated Syncing

### Cron Job Setup

The DataHub includes automatic syncing via cron jobs that run **every 6 hours** (00:00, 06:00, 12:00, 18:00).

**Install cron job:**
```bash
./setup-cron.sh
```

**Check cron status:**
```bash
crontab -l
```

**View sync logs:**
```bash
tail -f logs/cron-sync.log
```

### Synced Worksheets

The automated sync (`npm run sync`) includes all 9 worksheets:

| # | Worksheet | Description | Table |
|---|-----------|-------------|-------|
| 1 | HLD_Pole | Pole design data | `sow_poles` |
| 2 | HLD_Home | Home/premises design | `sow_drops` |
| 3 | Tracker_Pole | Pole installation status | `sharepoint_tracker_pole` |
| 4 | Tracker_Home | Home connection status | `sharepoint_tracker_home` |
| 5 | Nokia_Exp | ONT activation data | `sharepoint_nokia_exp` |
| 6 | 1Map_Ins | OneMap installation data | `sharepoint_1map_ins` |
| 7 | 1Map_Pole | OneMap pole cross-reference | `sharepoint_1map_pole` |
| 8 | **Lawley Activations** | **QA photo verification** | `sharepoint_lawley_qa` |
| 9 | **Mohadin Activations** | **QA with Zone/PON** | `sharepoint_lawley_qa` |

### Manual Sync Commands

**Full sync (all 9 worksheets):**
```bash
npm run sync
```

**Individual worksheet syncs:**
```bash
npm run sync:hld-pole            # Pole design data
npm run sync:hld-home            # Home design data
npm run sync:tracker-pole        # Pole installation status
npm run sync:tracker-home        # Home connection status
npm run sync:nokia-exp           # ONT activation data
npm run sync:1map-ins            # OneMap installation data
npm run sync:1map-pole           # OneMap pole cross-reference
npm run sync:lawley-activations  # QA photo verification (recurring)
npm run sync:lawley-historical   # QA historical bulk load (one-time)
npm run sync:mohadin-activations # Mohadin QA with Zone/PON (recurring)
```

### Lawley QA Photo Verification

The Lawley QA sync tracks photo verification for 12-step quality assurance:

**Database:** `sharepoint_lawley_qa`

**Current Status:**
- Historical records: 1,514 (pre-Sept 23, 2025)
- Activations records: 354 (post-Sept 23, 2025)
- Total unique drops: 1,868

**Note:** The `lawley-historical` sync is a one-time bulk load. Only `lawley-activations` runs on the automated schedule.

## Schema Change Management

### When SharePoint Columns Change

The DataHub automatically captures **ALL** columns from SharePoint in the `raw_data` JSONB field, even if not mapped to typed database columns. This means:

✅ **New columns are safe** - Already stored in raw_data
✅ **Syncs won't break** - No code changes needed
✅ **Data is queryable** - Use JSON operators: `raw_data->>'column_name'`

### Monthly Schema Check

Run this command **monthly** to detect new unmapped columns:

```bash
npm run detect:schema-changes
```

This shows:
- Total columns per worksheet
- Which columns have typed database fields
- Which columns are new/unmapped (but still in raw_data)

**Action:** Only promote columns to typed fields if they're frequently filtered/joined.

### Adding New Typed Columns

When SharePoint adds important columns (like zone_no, pon_no), follow these steps:

#### 1. Run Migration

```bash
npm run migrate
```

This applies all pending migrations in `src/database/migrations/`.

#### 2. Sync New Data

```bash
# For Lawley Activations
npm run sync:lawley-activations

# Or run full sync
npm run sync
```

#### 3. Verify Columns Populated

```sql
-- Connect to database
psql "$DATABASE_URL"

-- Check new columns
SELECT zone_no, pon_no, drop_number
FROM sharepoint_lawley_qa
WHERE zone_no IS NOT NULL
LIMIT 10;
```

### Creating New Migrations

When promoting a column from raw_data to typed field:

1. **Create migration file**: `src/database/migrations/00X_description.sql`
   ```sql
   ALTER TABLE sharepoint_lawley_qa
   ADD COLUMN IF NOT EXISTS new_column INTEGER;

   CREATE INDEX IF NOT EXISTS idx_table_column
   ON sharepoint_lawley_qa(new_column);
   ```

2. **Update connector**: Add to INSERT statement in connector file
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

3. **Run migration and sync** (steps above)

See `SCHEMA_CHANGE_STRATEGY.md` for detailed guidelines.

## API Development (Next Phase)

Power BI endpoints will be created at:

- `GET /api/powerbi/lawley/summary` - Project summary
- `GET /api/powerbi/lawley/data` - Full dataset
- `GET /api/powerbi/lawley/metrics` - Key metrics

## Support

For issues or questions, refer to:
- `claude.md` - Detailed architecture documentation
- `logs/datahub.log` - Application logs
- GitHub Issues (if applicable)

## License

MIT
