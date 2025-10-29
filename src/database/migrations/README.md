# Database Migrations

**Date:** 28 October 2025
**Status:** Ready to Deploy

---

## 📋 Migration Overview

This directory contains SQL migrations to set up the SharePoint → Neon database sync architecture.

### **Files:**

1. `001_create_sharepoint_tables.sql` - Raw tables that mirror SharePoint
2. `002_create_compatibility_views.sql` - Views for FF app compatibility

---

## 🚀 How to Run Migrations

### **Option 1: Using psql (Recommended)**

```bash
# Connect to Neon database
psql "$DATABASE_URL"

# Run migrations in order
\i src/database/migrations/001_create_sharepoint_tables.sql
\i src/database/migrations/002_create_compatibility_views.sql

# Verify tables created
\dt sharepoint_*

# Verify views created
\dv sow_*
```

### **Option 2: Using Node.js Script**

```bash
# Create and run migration script
npm run migrate
```

### **Option 3: Copy/Paste in Neon Console**

1. Go to https://console.neon.tech
2. Select your project
3. Go to SQL Editor
4. Copy/paste content of `001_create_sharepoint_tables.sql`
5. Run
6. Copy/paste content of `002_create_compatibility_views.sql`
7. Run

---

## 📊 What Gets Created

### **Migration 001: Raw Tables (10 tables)**

**Foundation Tables (Design Data):**
- `sharepoint_hld_pole` - Pole infrastructure design (4,472 rows expected)
- `sharepoint_hld_home` - Home/premises design (23,709 rows expected)

**Status Tracking Tables:**
- `sharepoint_tracker_pole` - Pole installation tracking
- `sharepoint_tracker_home` - Home connection tracking
- `sharepoint_tracker_stringing` - Fiber stringing progress

**Integration Tables:**
- `sharepoint_jdw_exp` - Fiber export data
- `sharepoint_1map_ins` - OneMap installation data (21,605 rows)
- `sharepoint_1map_pole` - OneMap pole data (5,395 rows)
- `sharepoint_nokia_exp` - Nokia activation data (5,348 rows)
- `sharepoint_pon_tracker` - PON zone tracking

**Metadata:**
- `sharepoint_sync_log` - Track sync operations

### **Migration 002: Compatibility Views (7 views)**

**Core Views (FF App Compatibility):**
- `sow_poles` - Translates SharePoint poles → FF app format
- `sow_drops` - Translates SharePoint homes → FF app format
- `sow_fibre` - Translates fiber data → FF app format
- `sow_onemap_mapping` - Maps SOW ↔ OneMap poles

**Reporting Views (Power BI):**
- `pole_tracker_summary` - Aggregated pole metrics by PON/zone
- `drop_tracker_summary` - Aggregated drop metrics by PON/zone
- `project_progress_view` - Overall project progress

---

## 🧪 Testing After Migration

### **Test 1: Verify Tables Created**

```sql
-- Should return 10 tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'sharepoint_%'
ORDER BY table_name;
```

### **Test 2: Verify Views Created**

```sql
-- Should return 7 views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE 'sow_%' OR table_name LIKE '%_summary' OR table_name LIKE '%_progress%')
ORDER BY table_name;
```

### **Test 3: Check View Structure**

```sql
-- Verify sow_poles view has expected columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sow_poles'
ORDER BY ordinal_position;

-- Should include: pole_number, latitude, longitude, status, pole_type, etc.
```

### **Test 4: Insert Test Data**

```sql
-- Insert a test pole
INSERT INTO sharepoint_hld_pole (
  label_1, type_1, lat, lon, status, pon_no, zone_no
) VALUES (
  'TEST.POLE.001', 'Pole', -26.1234, 28.5678, 'approved', 1, 1
);

-- Query via view
SELECT * FROM sow_poles WHERE pole_number = 'TEST.POLE.001';

-- Should return the pole with translated column names
```

### **Test 5: Verify FF App Compatibility**

```bash
# Test FF app API
curl http://localhost:3000/api/sow/poles?projectId=test

# Should work without any code changes
```

---

## 📐 Architecture Diagram

```
SharePoint Excel (19 Worksheets)
    ↓
[Sync Service - To Be Built]
    ↓
Raw Tables (sharepoint_*)
  - sharepoint_hld_pole
  - sharepoint_hld_home
  - sharepoint_tracker_pole
  - ... (10 tables total)
    ↓
Views (sow_*, *_summary, *_progress)
  - sow_poles
  - sow_drops
  - sow_fibre
  - ... (7 views total)
    ↓
FF App APIs (No Changes)
  - /api/sow/poles.ts
  - /api/poles/index.ts
  - ... etc
    ↓
React Components (No Changes)
```

---

## 🔑 Key Design Decisions

### **Why Raw Tables?**
- Mirror SharePoint structure exactly
- No confusion: Excel column `label_1` = DB column `label_1`
- Easy to debug sync issues
- Simple sync code (no transformation logic)

### **Why Views?**
- **Zero code changes** in FF app
- Translation layer: SharePoint names → App names
- Easy to modify mappings
- Can create multiple views for different consumers

### **Column Mapping Examples:**

| SharePoint Table | Column | View | Column |
|-----------------|--------|------|--------|
| sharepoint_hld_pole | label_1 | → sow_poles | pole_number |
| sharepoint_hld_pole | lat | → sow_poles | latitude |
| sharepoint_hld_pole | lon | → sow_poles | longitude |
| sharepoint_hld_pole | type_1 | → sow_poles | pole_type |

---

## 🛠️ Rollback Plan

If something goes wrong:

```sql
-- Drop views (safe - doesn't affect data)
DROP VIEW IF EXISTS project_progress_view;
DROP VIEW IF EXISTS drop_tracker_summary;
DROP VIEW IF EXISTS pole_tracker_summary;
DROP VIEW IF EXISTS sow_onemap_mapping;
DROP VIEW IF EXISTS sow_fibre;
DROP VIEW IF EXISTS sow_drops;
DROP VIEW IF EXISTS sow_poles;

-- Drop tables (only if needed - will lose synced data)
DROP TABLE IF EXISTS sharepoint_sync_log;
DROP TABLE IF EXISTS sharepoint_pon_tracker;
DROP TABLE IF EXISTS sharepoint_nokia_exp;
DROP TABLE IF EXISTS sharepoint_1map_pole;
DROP TABLE IF EXISTS sharepoint_1map_ins;
DROP TABLE IF EXISTS sharepoint_jdw_exp;
DROP TABLE IF EXISTS sharepoint_tracker_stringing;
DROP TABLE IF EXISTS sharepoint_tracker_home;
DROP TABLE IF EXISTS sharepoint_tracker_pole;
DROP TABLE IF EXISTS sharepoint_hld_home;
DROP TABLE IF EXISTS sharepoint_hld_pole;
```

**Note:** Keep old `sow_*` tables as backup until confident new system works.

---

## 📝 Next Steps After Migration

1. ✅ Run migrations
2. ✅ Verify tables and views created
3. ✅ Test view queries
4. ⏳ Build SharePoint sync connectors
5. ⏳ Run first sync to populate tables
6. ⏳ Test FF app with new views
7. ⏳ Deploy to production

---

## 🔐 Security Notes

- Views inherit permissions from underlying tables
- Grant SELECT only on views to app users
- Keep raw tables restricted to sync service
- Monitor for unauthorized access

---

## 📊 Performance Considerations

### **Indexes Created:**
- Primary keys on all tables (id)
- Foreign key indexes (project_id, pole references, etc.)
- Lookup indexes (pole_number, label, etc.)
- Location indexes (lat/lon for spatial queries)
- Sync timestamp indexes (for change tracking)

### **View Performance:**
- Views are computed on-the-fly (negligible overhead)
- Indexes on underlying tables still work
- Consider materialized views if performance issues arise

---

## 📞 Support

**Issues?**
- Check logs: `sharepoint_sync_log` table
- Verify SharePoint authentication
- Check raw table data: `SELECT * FROM sharepoint_hld_pole LIMIT 5`
- Test views: `SELECT * FROM sow_poles LIMIT 5`

**Documentation:**
- Main project: `/home/louisdup/VF/VelocityFibre_DataHub/`
- Implementation plan: `docs/IMPLEMENTATION_PLAN.md`
- FF app analysis: `FF_APP_ANALYSIS.md`

---

**Status:** ✅ Migrations Ready
**Created:** 28 October 2025
**Last Updated:** 28 October 2025
