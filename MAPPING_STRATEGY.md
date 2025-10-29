# SharePoint to Neon Database Mapping Strategy

## Overview
This document maps SharePoint Excel worksheets to existing Neon database tables to ensure data flows correctly to the FF (FibreFlow) app.

## SharePoint Worksheets Found (19 total)

### Key Worksheets Identified by User:
1. **HLD_Home** (23,709 rows, 28 cols) - High Level Design home/premises data
2. **HLD_Pole** (4,472 rows, 96 cols) - High Level Design pole infrastructure
3. **JDW_Exp** (687 rows, 13 cols) - JDW Export (Fibre data)
4. **1Map_Ins** (21,605 rows, 223 cols) - OneMap Installation data
5. **1Map_Pole** (5,395 rows, 129 cols) - OneMap Pole data
6. **Nokia_Exp** (5,348 rows, 14 cols) - Nokia Export (activation/connection data)
7. **Daily Progress** / **Progress Summary** - Progress tracking (formulas to copy)

### Additional Worksheets:
8. **Tracker_Pole** (23,709 rows, 16 cols) - Pole tracking/status
9. **Tracker_Home** (25,710 rows, 20 cols) - Home tracking/status
10. **Tracker Stringing** (235 rows, 16 cols) - Stringing/fiber installation
11. **PON_Tracker** (339 rows, 119 cols) - PON (Passive Optical Network) tracking
12. **QA** (215 rows, 18 cols) - Quality Assurance checkpoints

## Existing Neon Tables (Relevant to SOW/Project)

Based on the database scan, relevant tables include:

### Pole-Related Tables:
- `sow_poles` - Main pole inventory/status
  - Fields: pole_number, latitude, longitude, status, pole_type, pole_spec, height, diameter, owner, pon_no, zone_no, address, municipality, etc.

### Home/Drop-Related Tables:
- `sow_drops` - Home drops/premises connections
  - Fields: project_id, drop_number, pole_number, status, installation_date, customer_name, address, etc.

### Fiber/Stringing Tables:
- `sow_fibre` - Fiber cable segments
  - Fields: segment_id, cable_size, layer, distance, pon_no, zone_no, string_completed, date_completed, contractor, status, etc.

### Mapping Tables:
- `sow_onemap_mapping` - Maps SOW poles to OneMap poles
  - Fields: sow_pole_number, onemap_pole_number, match_type, confidence_score, distance_meters

### Import Tracking:
- `sow_import_status` - Tracks import operations
- `sow_import_history` - Historical import records

## Proposed Mapping Strategy

### 1. HLD_Home → sow_drops
**Purpose**: Home/premises design data

**Mapping**:
- `label` → `drop_number`
- `lat` → `latitude`
- `lon` → `longitude`
- `strtfeat` → `pole_number` (start pole)
- `address` → `address`
- `pon_no` → `pon_no`
- `zone_no` → `zone_no`
- Additional fields → `raw_data` (JSONB)

### 2. HLD_Pole → sow_poles (SOURCE)
**Purpose**: High-level design pole data

**Mapping**:
- `label_1` → `pole_number`
- `type_1` → `pole_type`
- `spec_1` → `pole_spec`
- `dim1` → `height`
- `dim2` → `diameter`
- `status` → `status`
- `cmpownr` → `owner`
- `lat` → `latitude`
- `lon` → `longitude`
- `pon_no` → `pon_no`
- `zone_no` → `zone_no`
- `address` → `address`
- `mainplce` / `mun` → `municipality`
- `datecrtd` → `created_date`
- `crtdby` → `created_by`
- `comments` → `comments`
- Additional fields → `raw_data` (JSONB)

### 3. Tracker_Pole → sow_poles (STATUS UPDATE)
**Purpose**: Update pole installation status/dates

**Mapping**:
- `label_1` → `pole_number` (lookup key)
- `Pole Install Date` → Update status tracking
- `Pole Install Contractor` → Update contractor info
- `1Map Pole Install` → Cross-reference with OneMap data
- Additional status fields → Update existing record

### 4. JDW_Exp → sow_fibre
**Purpose**: Fiber/cable export data

**Mapping**:
- Needs column analysis to determine exact mapping
- Likely maps to: segment_id, cable_size, distance, etc.

### 5. 1Map_Ins → sow_onemap_mapping + Updates
**Purpose**: OneMap installation data - cross-reference

**Mapping**:
- Maps to both pole and home tables for status updates
- Used for verification and mapping between systems

### 6. 1Map_Pole → sow_onemap_mapping
**Purpose**: OneMap pole data - cross-reference

**Mapping**:
- Pole label → `onemap_pole_number`
- Cross-reference with HLD_Pole via mapping table

### 7. Nokia_Exp → sow_drops (CONNECTION STATUS)
**Purpose**: Nokia activation/connection export

**Mapping**:
- Updates connection status in sow_drops
- Tracks activation dates and connection info
- Likely contains customer activation data

### 8. Tracker_Home → sow_drops (STATUS UPDATE)
**Purpose**: Home connection tracking/status

**Mapping**:
- Updates existing sow_drops records with tracking info
- Connection dates, status changes

### 9. Tracker Stringing → sow_fibre (STATUS UPDATE)
**Purpose**: Fiber stringing progress

**Mapping**:
- Updates sow_fibre with completion status
- Stringing dates, completion percentages

### 10. PON_Tracker → Zone/PON Status
**Purpose**: PON zone tracking and metrics

**Mapping**:
- Aggregated data - may need separate table or update metadata
- Links to pon_no in various tables

## Data Flow Strategy

### Phase 1: Foundation Data (Design/Planning)
1. **HLD_Pole** → `sow_poles` (Base pole inventory)
2. **HLD_Home** → `sow_drops` (Base home/premises)
3. **JDW_Exp** → `sow_fibre` (Fiber segments)

### Phase 2: External System Integration
4. **1Map_Pole** + **1Map_Ins** → `sow_onemap_mapping` (Cross-reference)
5. **Nokia_Exp** → Update `sow_drops` (Activation data)

### Phase 3: Status Tracking/Updates
6. **Tracker_Pole** → Update `sow_poles` (Installation status)
7. **Tracker_Home** → Update `sow_drops` (Connection status)
8. **Tracker Stringing** → Update `sow_fibre` (Stringing progress)
9. **PON_Tracker** → Aggregate metrics

### Phase 4: Progress/Reporting
10. **Daily Progress** / **Progress Summary** → Calculated views/reports

## Critical Considerations

### 1. Data Integrity
- **Primary Keys**: Each SharePoint row must map to unique database record
- **Lookups**: Use pole_number, drop_number as consistent identifiers
- **Deduplication**: Check for existing records before insert

### 2. Sync Strategy
- **Initial Load**: Full import of foundation data (HLD tables)
- **Incremental Updates**: Update status from Tracker tables
- **Delta Detection**: Compare timestamps to avoid unnecessary updates

### 3. Conflict Resolution
- **Data Source Priority**:
  1. HLD (design) = Source of truth for specs
  2. Tracker = Source of truth for status
  3. External systems (OneMap, Nokia) = Cross-reference only

### 4. Formula Handling
- SharePoint formulas (e.g., `[FORMULA: SUMIFS(...)]`) cannot be synced directly
- Options:
  1. Recalculate in database with SQL
  2. Sync only calculated values (not formulas)
  3. Create database views for calculations

## Next Steps

### Immediate Actions:
1. ✅ Analyze all worksheet structures (DONE)
2. ✅ Identify existing database tables (DONE)
3. 🔄 Create detailed column mapping for each worksheet
4. ⏳ Implement multi-sheet connector
5. ⏳ Create sync logic with conflict resolution
6. ⏳ Test data integrity end-to-end

### Questions to Resolve:
1. **Which data takes priority** when there are conflicts?
   - Example: HLD_Pole says status="Pending" but Tracker_Pole says "Installed"

2. **How to handle formulas** in Daily Progress/Progress Summary?
   - Sync values only, or recreate logic in database?

3. **Unique identifiers** - Confirm primary keys:
   - Poles: `label_1` / `pole_number`?
   - Homes: `label` / `drop_number`?
   - Ensure consistency across sheets

4. **Update frequency** - How often to sync each sheet?
   - Foundation data (HLD): Daily/Weekly?
   - Status trackers: Hourly/Real-time?
   - External systems: On-demand?

5. **Data validation** - Required fields, ranges, formats?
   - Ensure data quality before inserting

## Column Mapping Template

For each worksheet, we need to create detailed mappings:

```typescript
interface ColumnMapping {
  sharepoint_column: string;
  database_table: string;
  database_column: string;
  data_type: string;
  transformation?: string; // e.g., "uppercase", "parse_date", "trim"
  default_value?: any;
  required: boolean;
  validation?: string;
}
```

---

**Status**: Draft - Requires user confirmation and detailed column analysis

**Last Updated**: 2025-10-28
