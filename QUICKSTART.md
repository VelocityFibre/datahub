# QuickStart Guide - VelocityFibre DataHub

**Date:** 28 October 2025
**Status:** Setup Phase Complete - Ready for Migration

---

## 🎯 What's Been Set Up

### ✅ **Planning & Documentation**
- [x] SharePoint worksheets analyzed (19 worksheets)
- [x] Neon database structure reviewed (86 existing tables)
- [x] FF React app dependencies analyzed
- [x] Mapping strategy documented
- [x] SQL migrations created

### ✅ **Database Schema Created**
- [x] Raw tables SQL (10 tables)
- [x] Compatibility views SQL (7 views)
- [x] Migration documentation

### ⏳ **Next Steps**
- [ ] Run database migrations
- [ ] Build SharePoint sync connectors
- [ ] Test end-to-end sync
- [ ] Deploy to production

---

## 📁 Project Structure

```
VelocityFibre_DataHub/
├── docs/
│   ├── IMPLEMENTATION_PLAN.md        ← Full project plan
│   └── (other docs)
├── src/
│   ├── database/
│   │   └── migrations/
│   │       ├── 001_create_sharepoint_tables.sql    ← Raw tables
│   │       ├── 002_create_compatibility_views.sql  ← Views
│   │       └── README.md                           ← Migration guide
│   ├── config/
│   ├── connectors/
│   └── sync/
├── QUICKSTART.md                     ← This file
├── MAPPING_STRATEGY.md               ← Data mapping details
├── FF_APP_ANALYSIS.md                ← FF app impact analysis
├── PROJECT_MANAGER_SUMMARY.md        ← PM summary
└── .env.local                        ← Config (SharePoint credentials)
```

---

## 🚀 Next Steps - Run Migrations

### **Step 1: Connect to Neon Database**

```bash
# Option A: Using psql
psql "$DATABASE_URL"

# Option B: Use Neon Console
# Go to https://console.neon.tech → Your Project → SQL Editor
```

### **Step 2: Run Migration 001 (Create Tables)**

```bash
# If using psql:
\i src/database/migrations/001_create_sharepoint_tables.sql

# Or copy/paste the file content into Neon SQL Editor
```

**What this creates:**
- 10 raw tables (`sharepoint_hld_pole`, `sharepoint_hld_home`, etc.)
- 1 metadata table (`sharepoint_sync_log`)

### **Step 3: Run Migration 002 (Create Views)**

```bash
# If using psql:
\i src/database/migrations/002_create_compatibility_views.sql

# Or copy/paste into Neon SQL Editor
```

**What this creates:**
- 4 compatibility views (`sow_poles`, `sow_drops`, `sow_fibre`, `sow_onemap_mapping`)
- 3 reporting views (`pole_tracker_summary`, `drop_tracker_summary`, `project_progress_view`)

### **Step 4: Verify Migration Success**

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'sharepoint_%'
ORDER BY table_name;
-- Should return 10+ tables

-- Check views created
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE 'sow_%' OR table_name LIKE '%_summary')
ORDER BY table_name;
-- Should return 7 views
```

---

## 🧪 Quick Test

### **Test 1: Insert Sample Pole**

```sql
INSERT INTO sharepoint_hld_pole (
  label_1, type_1, subtyp_1, spec_1, dim1, dim2,
  status, lat, lon, pon_no, zone_no, address
) VALUES (
  'TEST.POLE.001',
  'Pole',
  'Creosote',
  'H4SANS754',
  '7m',
  '140-160mm',
  'approved',
  -26.1234,
  28.5678,
  1,
  1,
  '123 Test Street, Lawley'
);
```

### **Test 2: Query via View**

```sql
SELECT
  pole_number,
  pole_type,
  status,
  latitude,
  longitude,
  address
FROM sow_poles
WHERE pole_number = 'TEST.POLE.001';
```

**Expected result:**
- Should return the pole with **translated column names**
- `label_1` → `pole_number`
- `lat` → `latitude`
- `lon` → `longitude`

### **Test 3: Check FF App API (if running locally)**

```bash
# Start FF app
cd /home/louisdup/VF/Apps/FF_React
npm run dev

# Test API endpoint
curl http://localhost:3000/api/sow/poles?projectId=test
```

**Should work with no code changes!**

---

## 📋 Architecture Overview

```
SharePoint Excel (19 worksheets)
    ↓ [To Be Built: Sync Service]
Raw Tables: sharepoint_*
    ├─ sharepoint_hld_pole        (Design data)
    ├─ sharepoint_tracker_pole    (Status updates)
    └─ ... (8 more tables)
    ↓ [Views - Real-time Translation]
Compatibility Layer: sow_*, *_summary
    ├─ sow_poles ← Combines HLD + Tracker
    ├─ sow_drops ← Combines HLD + Nokia
    └─ ... (5 more views)
    ↓ [Existing APIs - No Changes]
FF React App + Power BI
```

---

## 🔑 Key Benefits

### **For Development:**
- ✅ Clear mapping: SharePoint column = DB column
- ✅ Easy debugging
- ✅ Maintainable code

### **For FF App:**
- ✅ Zero code changes needed
- ✅ Queries work exactly as before
- ✅ Views handle translation

### **For Business:**
- ✅ Automated data sync (when built)
- ✅ Real-time data updates
- ✅ Single source of truth

---

## 📖 Documentation Links

| Document | Purpose |
|----------|---------|
| `IMPLEMENTATION_PLAN.md` | Full project plan with timeline |
| `MAPPING_STRATEGY.md` | Detailed SharePoint → DB mappings |
| `FF_APP_ANALYSIS.md` | FF app impact & compatibility analysis |
| `PROJECT_MANAGER_SUMMARY.md` | Executive summary for PM |
| `src/database/migrations/README.md` | Migration guide & testing |

---

## 🎯 Current Status (28 Oct 2025)

### ✅ **Completed:**
1. ✅ Analysis & Planning
2. ✅ Database schema designed
3. ✅ SQL migrations created
4. ✅ Documentation complete

### ⏳ **In Progress:**
- Waiting for database migrations to be run

### 📅 **Next Up:**
1. Run migrations (you!)
2. Build sync connectors (development)
3. Test with SharePoint data
4. Deploy

---

## 💡 Quick Command Reference

```bash
# Connect to Neon
psql "$DATABASE_URL"

# Run migrations
\i src/database/migrations/001_create_sharepoint_tables.sql
\i src/database/migrations/002_create_compatibility_views.sql

# Check what was created
\dt sharepoint_*   # List tables
\dv sow_*          # List views

# Test a view
SELECT * FROM sow_poles LIMIT 5;

# Check sync log (after syncing)
SELECT * FROM sharepoint_sync_log ORDER BY sync_started_at DESC LIMIT 10;
```

---

## ❓ FAQ

**Q: Will this break our FF app?**
**A:** No. Views ensure backward compatibility. App queries `sow_poles` (which is now a view) and gets the same data format.

**Q: Can we rollback if needed?**
**A:** Yes. Drop views (doesn't affect data), keep old tables as backup.

**Q: How do we add more SharePoint worksheets later?**
**A:** Add new `sharepoint_*` table, create view if needed. Same pattern.

**Q: What if SharePoint column names change?**
**A:** Update raw table structure, adjust view mapping. FF app unaffected.

---

## 🚨 Troubleshooting

**Issue: Migration fails**
→ Check Neon connection, verify syntax, check permissions

**Issue: View returns no data**
→ Raw tables are empty (need to run sync first)

**Issue: FF app errors**
→ Check view column names match expected format

**Issue: Performance slow**
→ Check indexes exist, consider materialized views

---

## 📞 Next Actions

1. **Run the migrations** (Step 1 above)
2. **Test with sample data** (Step 2 above)
3. **Verify views work** (Step 3 above)
4. **Report back** - Ready to build sync connectors!

---

**Status:** ✅ Ready to Run Migrations
**Date:** 28 October 2025
**Estimated Time:** 5-10 minutes to run + test
