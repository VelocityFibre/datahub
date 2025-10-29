# VelocityFibre DataHub - Implementation Plan

**Date:** 28 October 2025
**Status:** In Progress
**Approach:** Option A - Clean Architecture with Views

---

## 📋 Project Overview

**Goal:** Automated synchronization of 19 SharePoint worksheets to Neon database with zero disruption to FF React app.

**Architecture Decision:** Clean tables + Compatibility views
- Raw tables mirror SharePoint structure exactly
- Views provide translation layer for FF app compatibility
- No code changes required in FF React app

---

## 🏗️ Architecture

```
SharePoint Excel (19 Worksheets)
    ↓ [Microsoft Graph API]
Sync Service (Node.js/TypeScript)
    ↓ [Automated Hourly/Daily]
Raw Tables: sharepoint_* (19 tables)
    ↓ [Database Views]
Compatibility Layer: sow_*, etc.
    ↓ [Existing APIs - No Changes]
FF React App + Power BI
```

---

## 📊 Tables to Create

### **Raw Tables (Mirror SharePoint Exactly)**

1. `sharepoint_hld_pole` ← HLD_Pole worksheet (4,472 rows, 96 cols)
2. `sharepoint_hld_home` ← HLD_Home worksheet (23,709 rows, 28 cols)
3. `sharepoint_tracker_pole` ← Tracker_Pole worksheet (23,709 rows, 16 cols)
4. `sharepoint_tracker_home` ← Tracker_Home worksheet (25,710 rows, 20 cols)
5. `sharepoint_tracker_stringing` ← Tracker Stringing worksheet (235 rows, 16 cols)
6. `sharepoint_jdw_exp` ← JDW_Exp worksheet (687 rows, 13 cols)
7. `sharepoint_1map_ins` ← 1Map_Ins worksheet (21,605 rows, 223 cols)
8. `sharepoint_1map_pole` ← 1Map_Pole worksheet (5,395 rows, 129 cols)
9. `sharepoint_nokia_exp` ← Nokia_Exp worksheet (5,348 rows, 14 cols)
10. `sharepoint_pon_tracker` ← PON_Tracker worksheet (339 rows, 119 cols)
11. `sharepoint_daily_progress` ← Daily Progress worksheet (408 rows, 13 cols)
12. `sharepoint_progress_summary` ← Progress Summary worksheet (79 rows, 26 cols)
13. `sharepoint_qa` ← QA worksheet (215 rows, 18 cols)
14. `sharepoint_optical_detail` ← Optical Detail worksheet (219 rows, 17 cols)
15. `sharepoint_ab_pole` ← AB_Pole worksheet
16. `sharepoint_hld_cable` ← HLD_Cable worksheet
17. `sharepoint_index` ← Index worksheet (13 rows, 3 cols)
18. `sharepoint_selectlist` ← SelectList worksheet (160 rows, 2 cols)
19. `sharepoint_sec_pon` ← SEC_PON worksheet (21 rows, 2 cols)

### **Compatibility Views (For FF App)**

- `sow_poles` → Translates `sharepoint_hld_pole` + `sharepoint_tracker_pole`
- `sow_drops` → Translates `sharepoint_hld_home` + `sharepoint_tracker_home`
- `sow_fibre` → Translates `sharepoint_jdw_exp` + `sharepoint_tracker_stringing`
- `sow_onemap_mapping` → Maps `sharepoint_1map_pole` to poles

### **Metadata Tables**

- `sharepoint_sync_log` → Track sync operations
- `sharepoint_sync_status` → Current sync state per worksheet

---

## 🔑 Key Column Mappings

### **Poles: sharepoint_hld_pole → sow_poles view**

| SharePoint Column | Raw Table Column | View Column | FF App Expects |
|------------------|------------------|-------------|----------------|
| `label_1` | `label_1` | `pole_number` | `poleNumber` |
| `lat` | `lat` | `latitude` | `gpsCoordinates.latitude` |
| `lon` | `lon` | `longitude` | `gpsCoordinates.longitude` |
| `type_1` | `type_1` | `pole_type` | `poleType` |
| `spec_1` | `spec_1` | `pole_spec` | - |
| `dim1` | `dim1` | `height` | `poleHeight` |
| `dim2` | `dim2` | `diameter` | - |
| `status` | `status` | `status` | `status` |
| `cmpownr` | `cmpownr` | `owner` | - |
| `pon_no` | `pon_no` | `pon_no` | `pon` |
| `zone_no` | `zone_no` | `zone_no` | `zone` |
| `address` | `address` | `address` | `address` |
| `mainplce`/`mun` | `municipality` | `municipality` | `municipality` |

### **Homes: sharepoint_hld_home → sow_drops view**

| SharePoint Column | Raw Table Column | View Column | FF App Expects |
|------------------|------------------|-------------|----------------|
| `label` | `label` | `drop_number` | `dropNumber` |
| `lat` | `lat` | `latitude` | `latitude` |
| `lon` | `lon` | `longitude` | `longitude` |
| `strtfeat` | `strtfeat` | `pole_number` | `poleNumber` |
| `address` | `address` | `address` | `address` |
| `pon_no` | `pon_no` | `pon_no` | - |
| `zone_no` | `zone_no` | `zone_no` | - |

---

## 📅 Implementation Timeline

### **Phase 1: Foundation (Day 1-2) - 28 Oct 2025**

**Tasks:**
- [x] Analyze SharePoint worksheets
- [x] Review Neon database structure
- [x] Analyze FF app dependencies
- [x] Create mapping documentation
- [ ] Create SQL schema for all raw tables
- [ ] Create compatibility views
- [ ] Test view compatibility with existing APIs

**Deliverables:**
- SQL migration scripts
- Documentation
- Test queries

### **Phase 2: Sync Service (Day 2-3)**

**Tasks:**
- [ ] Enhance SharePoint authentication
- [ ] Build generic worksheet connector
- [ ] Create individual sheet parsers (19 total)
- [ ] Implement sync logging
- [ ] Error handling and retry logic

**Deliverables:**
- Working sync service
- Logs and monitoring

### **Phase 3: Testing (Day 3-4)**

**Tasks:**
- [ ] Test HLD_Pole sync (pilot)
- [ ] Test Tracker_Pole sync (status updates)
- [ ] Verify data integrity
- [ ] Test FF app with new views
- [ ] Validate all 19 worksheets

**Deliverables:**
- Test reports
- Data validation results
- FF app compatibility confirmation

### **Phase 4: Deployment (Day 4-5)**

**Tasks:**
- [ ] Deploy to production database
- [ ] Run initial full sync
- [ ] Monitor sync performance
- [ ] Document for team
- [ ] Set up scheduled syncs (cron)

**Deliverables:**
- Production deployment
- Monitoring dashboard
- Team documentation

---

## 🔄 Data Flow Strategy

### **Foundation Data (Design/Planning) - Run First**
1. `sharepoint_hld_pole` → Base pole inventory
2. `sharepoint_hld_home` → Base home/premises
3. `sharepoint_jdw_exp` → Fiber segments

### **Status Tracking (Updates) - Run After Foundation**
4. `sharepoint_tracker_pole` → Update pole installation status
5. `sharepoint_tracker_home` → Update connection status
6. `sharepoint_tracker_stringing` → Update stringing progress

### **External Systems (Cross-reference) - Run After Status**
7. `sharepoint_1map_pole` + `sharepoint_1map_ins` → Cross-reference mapping
8. `sharepoint_nokia_exp` → Activation data

### **Aggregates/Reports (Last)**
9. `sharepoint_pon_tracker` → Zone metrics
10. `sharepoint_daily_progress` / `sharepoint_progress_summary` → Progress reports

---

## ⚙️ Sync Configuration

### **Sync Frequency**
- **Foundation data** (HLD tables): Daily (low change frequency)
- **Tracker data**: Hourly (active updates)
- **External systems**: Every 4 hours
- **Reports/Aggregates**: Every 6 hours

### **Sync Strategy**
- **Upsert** based on unique identifiers:
  - Poles: `label_1` (pole number)
  - Homes: `label` (home/drop ID)
  - Use `sync_timestamp` to track last update

### **Conflict Resolution**
- **Source of Truth Hierarchy**:
  1. HLD tables = Design/specification truth
  2. Tracker tables = Status/progress truth
  3. External systems = Cross-reference only

- **Update Rules**:
  - Never overwrite design specs from status updates
  - Always update status from tracker tables
  - Log conflicts for manual review

---

## 🛡️ Error Handling

### **Sync Failures**
- Retry failed worksheets 3 times with exponential backoff
- Log failures to `sharepoint_sync_log`
- Alert on consecutive failures (3+ in a row)
- Fallback: Manual trigger available

### **Data Validation**
- Required fields check before insert
- Data type validation
- Range checks (lat/lon bounds, dates, etc.)
- Foreign key validation (project_id exists)

### **Monitoring**
- Sync success/failure rates
- Row counts per table
- Sync duration tracking
- Data quality metrics

---

## 📁 Project Structure

```
VelocityFibre_DataHub/
├── docs/
│   ├── IMPLEMENTATION_PLAN.md (this file)
│   ├── MAPPING_STRATEGY.md
│   ├── FF_APP_ANALYSIS.md
│   └── PROJECT_MANAGER_SUMMARY.md
├── src/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── sharepoint.config.ts
│   ├── connectors/
│   │   └── sharepoint/
│   │       ├── auth.ts
│   │       ├── client.ts
│   │       └── worksheets/
│   │           ├── hld-pole.connector.ts
│   │           ├── hld-home.connector.ts
│   │           ├── tracker-pole.connector.ts
│   │           └── ... (16 more)
│   ├── database/
│   │   ├── client.ts
│   │   ├── migrations/
│   │   │   ├── 001_create_sharepoint_tables.sql
│   │   │   ├── 002_create_compatibility_views.sql
│   │   │   └── 003_create_sync_metadata.sql
│   │   └── schemas/
│   │       └── sharepoint.schema.ts
│   ├── sync/
│   │   ├── sync-engine.ts
│   │   ├── sync-scheduler.ts
│   │   └── worksheets/
│   │       └── sync-[worksheet].ts (19 files)
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
├── scripts/
│   ├── analyze-worksheets.ts
│   ├── check-existing-tables.ts
│   └── test-sync.ts
└── .env.local
```

---

## ✅ Success Criteria

1. ✅ All 19 SharePoint worksheets sync successfully
2. ✅ FF React app displays updated data (no code changes)
3. ✅ Sync runs reliably (>95% success rate)
4. ✅ Data integrity validated (row counts match SharePoint)
5. ✅ Sync completes within reasonable time (<30 min for full sync)
6. ✅ Views provide correct data format for FF app
7. ✅ Logging and monitoring in place
8. ✅ Team can understand and maintain the system

---

## 🔧 Technology Stack

- **Runtime**: Node.js 18+ / TypeScript
- **Database**: Neon PostgreSQL (serverless)
- **Database Client**: `@neondatabase/serverless` (direct SQL)
- **SharePoint Access**: `axios` + Microsoft Graph API
- **Excel Parsing**: `exceljs`
- **Scheduling**: `node-cron`
- **Logging**: `winston`
- **Validation**: `zod`

---

## 📝 Notes & Decisions

### **Why Database Views?**
- Zero code changes in FF app
- Clear separation: raw data vs app data
- Easy to modify mappings without touching app
- Can create multiple views for different consumers (Power BI, APIs)

### **Why Mirror SharePoint Structure?**
- Eliminates confusion (Excel column = DB column)
- Easy debugging ("This field comes from HLD_Pole.label_1")
- Simple sync code (no transformation logic)
- Future-proof (easy to add new SharePoint columns)

### **Why Not Use Existing Tables?**
- Column name mismatches (label_1 vs pole_number)
- Would require complex mapping in sync code
- Harder to maintain
- Creates technical debt

---

## 🚀 Next Actions

**Immediate (Today - 28 Oct 2025):**
1. Create SQL schema for all raw tables
2. Create compatibility views
3. Test views with existing FF app APIs

**Tomorrow:**
1. Build sync service core
2. Implement first 3 worksheet connectors
3. Test end-to-end sync

**Day 3:**
1. Complete remaining 16 worksheet connectors
2. Full data validation
3. Performance testing

---

## 📞 Contacts & Resources

- **Database**: Neon PostgreSQL (gwc.azure)
- **SharePoint**: blitzfibre.sharepoint.com/sites/Velocity_Manco
- **FF App**: /home/louisdup/VF/Apps/FF_React
- **DataHub**: /home/louisdup/VF/VelocityFibre_DataHub

---

## 🔄 Change Log

| Date | Change | By |
|------|--------|-----|
| 28 Oct 2025 | Initial implementation plan created | Development Team |
| 28 Oct 2025 | Architecture decision: Clean tables + Views | Development Team |
| 28 Oct 2025 | Started Phase 1: Foundation work | Development Team |

---

**Status:** ✅ Plan Approved - Implementation In Progress
**Next Review:** 30 Oct 2025
