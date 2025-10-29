-- ============================================================================
-- VelocityFibre DataHub - SharePoint Raw Tables Migration
-- ============================================================================
-- Date: 28 October 2025
-- Purpose: Create raw tables that mirror SharePoint worksheet structure
-- Approach: Store SharePoint data exactly as-is for clarity and maintainability
-- ============================================================================

-- ============================================================================
-- 1. HLD_POLE - High Level Design Pole Infrastructure
-- ============================================================================
-- Source: SharePoint HLD_Pole worksheet (4,472 rows, 96 columns)
-- Purpose: Store pole design specifications from SharePoint

CREATE TABLE IF NOT EXISTS sharepoint_hld_pole (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Identification (Columns 1-8)
  label_1 VARCHAR(255),        -- Primary pole label/number
  type_1 VARCHAR(100),          -- Pole type (e.g., "Pole")
  subtyp_1 VARCHAR(100),        -- Pole subtype (e.g., "Creosote")
  spec_1 VARCHAR(100),          -- Specification (e.g., "H4SANS754")
  dim1 VARCHAR(50),             -- Dimension 1 - Height (e.g., "7m")
  dim2 VARCHAR(50),             -- Dimension 2 - Diameter (e.g., "140-160mm")
  cblcpty1 VARCHAR(50),         -- Cable capacity
  conntr1 VARCHAR(100),         -- Contractor

  -- Status & Ownership
  status VARCHAR(100),          -- Status (e.g., "Permission not granted")
  cmpownr VARCHAR(255),         -- Company owner

  -- Additional Equipment/Features (Columns 11-73)
  label_2 VARCHAR(255),
  type_2 VARCHAR(100),
  subtyp_2 VARCHAR(100),
  spec_2 VARCHAR(100),
  dim1_2 VARCHAR(50),
  dim2_2 VARCHAR(50),
  cblcpty2 VARCHAR(50),
  conntr2 VARCHAR(100),
  featno1 VARCHAR(50),

  label_3 VARCHAR(255),
  type_3 VARCHAR(100),
  subtyp3 VARCHAR(100),
  spec_3 VARCHAR(100),
  dim1_3 VARCHAR(50),
  dim2_3 VARCHAR(50),
  cblcpty3 VARCHAR(50),
  conntr3 VARCHAR(100),
  featno2 VARCHAR(50),

  label_4 VARCHAR(255),
  type_4 VARCHAR(100),
  subtyp4 VARCHAR(100),
  spec_4 VARCHAR(100),
  dim1_4 VARCHAR(50),
  dim2_4 VARCHAR(50),
  cblcpty4 VARCHAR(50),
  conntr4 VARCHAR(100),
  featno3 VARCHAR(50),

  label_5 VARCHAR(255),
  type_5 VARCHAR(100),
  subtyp5 VARCHAR(100),
  spec_5 VARCHAR(100),
  dim1_5 VARCHAR(50),
  dim2_5 VARCHAR(50),
  cblcpty5 VARCHAR(50),
  conntr5 VARCHAR(100),
  featno4 VARCHAR(50),

  label_6 VARCHAR(255),
  type_6 VARCHAR(100),
  subtyp6 VARCHAR(100),
  spec_6 VARCHAR(100),
  dim1_6 VARCHAR(50),
  dim2_6 VARCHAR(50),
  cblcpty6 VARCHAR(50),
  conntr6 VARCHAR(100),
  featno5 VARCHAR(50),

  label_7 VARCHAR(255),
  type_7 VARCHAR(100),
  subtyp7 VARCHAR(100),
  spec_7 VARCHAR(100),
  dim1_7 VARCHAR(50),
  dim2_7 VARCHAR(50),
  cblcpty7 VARCHAR(50),
  conntr7 VARCHAR(100),
  featno6 VARCHAR(50),

  label_8 VARCHAR(255),
  type_8 VARCHAR(100),
  subtyp_8 VARCHAR(100),
  spec_8 VARCHAR(100),
  dim1_8 VARCHAR(50),
  dim2_8 VARCHAR(50),
  cblcpty8 VARCHAR(50),
  conntr8 VARCHAR(100),
  featno7 VARCHAR(50),

  -- Location Details
  strtfeat VARCHAR(255),        -- Start feature
  endfeat VARCHAR(255),         -- End feature
  lat NUMERIC(10, 8),           -- Latitude
  lon NUMERIC(11, 8),           -- Longitude
  sg21 VARCHAR(100),            -- SG21 reference
  sg26 VARCHAR(100),            -- SG26 reference
  address TEXT,                 -- Physical address

  -- Network Assignment
  pon_no INTEGER,               -- PON number
  zone_no INTEGER,              -- Zone number
  subplace VARCHAR(255),        -- Sub-place
  mainplce VARCHAR(255),        -- Main place
  mun VARCHAR(255),             -- Municipality
  stackref VARCHAR(255),        -- Stack reference

  -- Audit Fields
  datecrtd TIMESTAMP,           -- Date created in SharePoint
  crtdby VARCHAR(255),          -- Created by
  date_edt TIMESTAMP,           -- Date edited
  editby VARCHAR(255),          -- Edited by
  comments TEXT,                -- Comments

  -- Custom Fields
  NUM1 NUMERIC,
  NUM2 NUMERIC,
  NUM3 NUMERIC,
  ALPHA VARCHAR(255),
  "Pole Plant" VARCHAR(255),    -- Quoted because of space

  -- Metadata
  project_id UUID,              -- Link to projects table (if applicable)
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB,               -- Full row as JSON backup

  -- Standard Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for HLD_Pole
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_label ON sharepoint_hld_pole(label_1);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_pon_zone ON sharepoint_hld_pole(pon_no, zone_no);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_location ON sharepoint_hld_pole(lat, lon);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_sync ON sharepoint_hld_pole(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_pole_project ON sharepoint_hld_pole(project_id);

-- ============================================================================
-- 2. HLD_HOME - High Level Design Home/Premises
-- ============================================================================
-- Source: SharePoint HLD_Home worksheet (23,709 rows, 28 columns)
-- Purpose: Store home/premises design data

CREATE TABLE IF NOT EXISTS sharepoint_hld_home (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Identification
  label VARCHAR(255),           -- Home/drop identifier
  type VARCHAR(100),            -- Type
  subtyp VARCHAR(100),          -- Subtype
  spec VARCHAR(100),            -- Specification
  dim1 VARCHAR(50),             -- Dimension 1
  dim2 VARCHAR(50),             -- Dimension 2
  cblcpty VARCHAR(50),          -- Cable capacity
  conntr VARCHAR(100),          -- Contractor
  ntwrkptn VARCHAR(255),        -- Network pattern
  cmpownr VARCHAR(255),         -- Company owner

  -- Connection Points
  strtfeat VARCHAR(255),        -- Start feature (pole)
  endfeat VARCHAR(255),         -- End feature

  -- Location
  lat NUMERIC(10, 8),           -- Latitude
  lon NUMERIC(11, 8),           -- Longitude
  sg21 VARCHAR(100),
  sg26 VARCHAR(100),
  address TEXT,

  -- Network Assignment
  pon_no INTEGER,
  zone_no INTEGER,
  subplace VARCHAR(255),
  mainplce VARCHAR(255),
  mun VARCHAR(255),

  -- Audit
  datecrtd TIMESTAMP,
  crtdby VARCHAR(255),
  date_edt TIMESTAMP,
  editby VARCHAR(255),
  comments TEXT,

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for HLD_Home
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_label ON sharepoint_hld_home(label);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_pole ON sharepoint_hld_home(strtfeat);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_pon_zone ON sharepoint_hld_home(pon_no, zone_no);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_location ON sharepoint_hld_home(lat, lon);
CREATE INDEX IF NOT EXISTS idx_sharepoint_hld_home_sync ON sharepoint_hld_home(sync_timestamp DESC);

-- ============================================================================
-- 3. TRACKER_POLE - Pole Installation Tracking
-- ============================================================================
-- Source: SharePoint Tracker_Pole worksheet (23,709 rows, 16 columns)
-- Purpose: Track pole installation status and dates

CREATE TABLE IF NOT EXISTS sharepoint_tracker_pole (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  label_1 VARCHAR(255),         -- Pole label (foreign key to HLD_Pole)
  pon_no INTEGER,
  zone_no INTEGER,

  -- Installation Tracking
  "Pole Permission Date" DATE,
  "1Map Pole Install" VARCHAR(255),
  "Pole Install Date" DATE,
  "Pole Install Max date" DATE,
  "Pole Install Contractor" VARCHAR(255),
  "Pole Install Rate" NUMERIC,
  "Pole Install Paid Date" DATE,

  -- Data Quality
  "Duplications" VARCHAR(255),
  "Source" VARCHAR(255),
  "1Map" VARCHAR(255),
  "Before" VARCHAR(255),
  "During" VARCHAR(255),
  "After" VARCHAR(255),

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Tracker_Pole
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_pole_label ON sharepoint_tracker_pole(label_1);
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_pole_pon_zone ON sharepoint_tracker_pole(pon_no, zone_no);
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_pole_install_date ON sharepoint_tracker_pole("Pole Install Date");
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_pole_sync ON sharepoint_tracker_pole(sync_timestamp DESC);

-- ============================================================================
-- 4. TRACKER_HOME - Home Connection Tracking
-- ============================================================================
-- Source: SharePoint Tracker_Home worksheet (25,710 rows, 20 columns)
-- Purpose: Track home connection status

CREATE TABLE IF NOT EXISTS sharepoint_tracker_home (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification (columns will be determined from actual data structure)
  -- Storing as JSONB initially for flexibility
  home_label VARCHAR(255),

  -- Will be populated based on actual SharePoint structure
  connection_status VARCHAR(255),
  connection_date DATE,

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,      -- Store full row here
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Tracker_Home
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_home_label ON sharepoint_tracker_home(home_label);
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_home_sync ON sharepoint_tracker_home(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_home_raw_data ON sharepoint_tracker_home USING gin(raw_data);

-- ============================================================================
-- 5. TRACKER_STRINGING - Fiber Stringing Progress
-- ============================================================================
-- Source: SharePoint Tracker Stringing worksheet (235 rows, 16 columns)

CREATE TABLE IF NOT EXISTS sharepoint_tracker_stringing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  "Scope" VARCHAR(255),
  section_number INTEGER,

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_tracker_stringing_sync ON sharepoint_tracker_stringing(sync_timestamp DESC);

-- ============================================================================
-- 6. JDW_EXP - JDW Fiber Export
-- ============================================================================
-- Source: SharePoint JDW_Exp worksheet (687 rows, 13 columns)

CREATE TABLE IF NOT EXISTS sharepoint_jdw_exp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  segment_id VARCHAR(255),
  cable_info TEXT,

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_jdw_exp_segment ON sharepoint_jdw_exp(segment_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_jdw_exp_sync ON sharepoint_jdw_exp(sync_timestamp DESC);

-- ============================================================================
-- 7. 1MAP_INS - OneMap Installation Data
-- ============================================================================
-- Source: SharePoint 1Map_Ins worksheet (21,605 rows, 223 columns)

CREATE TABLE IF NOT EXISTS sharepoint_1map_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  installation_id VARCHAR(255),
  pole_reference VARCHAR(255),

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,      -- Store all 223 columns here
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_id ON sharepoint_1map_ins(installation_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_pole ON sharepoint_1map_ins(pole_reference);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_sync ON sharepoint_1map_ins(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_ins_raw_data ON sharepoint_1map_ins USING gin(raw_data);

-- ============================================================================
-- 8. 1MAP_POLE - OneMap Pole Data
-- ============================================================================
-- Source: SharePoint 1Map_Pole worksheet (5,395 rows, 129 columns)

CREATE TABLE IF NOT EXISTS sharepoint_1map_pole (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  onemap_pole_id VARCHAR(255),
  sow_pole_reference VARCHAR(255),

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,      -- Store all 129 columns here
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_id ON sharepoint_1map_pole(onemap_pole_id);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_sow_ref ON sharepoint_1map_pole(sow_pole_reference);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_sync ON sharepoint_1map_pole(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sharepoint_1map_pole_raw_data ON sharepoint_1map_pole USING gin(raw_data);

-- ============================================================================
-- 9. NOKIA_EXP - Nokia Activation Export
-- ============================================================================
-- Source: SharePoint Nokia_Exp worksheet (5,348 rows, 14 columns)

CREATE TABLE IF NOT EXISTS sharepoint_nokia_exp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  home_reference VARCHAR(255),
  activation_date DATE,
  activation_status VARCHAR(255),

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_home ON sharepoint_nokia_exp(home_reference);
CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_date ON sharepoint_nokia_exp(activation_date);
CREATE INDEX IF NOT EXISTS idx_sharepoint_nokia_exp_sync ON sharepoint_nokia_exp(sync_timestamp DESC);

-- ============================================================================
-- 10. PON_TRACKER - PON Zone Tracking
-- ============================================================================
-- Source: SharePoint PON_Tracker worksheet (339 rows, 119 columns)

CREATE TABLE IF NOT EXISTS sharepoint_pon_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pon_number INTEGER,
  zone_number INTEGER,
  tracking_date DATE,

  -- Metadata
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_pon_tracker_pon_zone ON sharepoint_pon_tracker(pon_number, zone_number);
CREATE INDEX IF NOT EXISTS idx_sharepoint_pon_tracker_sync ON sharepoint_pon_tracker(sync_timestamp DESC);

-- ============================================================================
-- METADATA TABLES - Track Sync Operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sharepoint_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_name VARCHAR(100) NOT NULL,
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL,      -- 'running', 'success', 'failed', 'partial'
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  file_url VARCHAR(500),
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_worksheet ON sharepoint_sync_log(worksheet_name, sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_status ON sharepoint_sync_log(status, sync_started_at DESC);

-- ============================================================================
-- Comments & Documentation
-- ============================================================================

COMMENT ON TABLE sharepoint_hld_pole IS 'Raw data from SharePoint HLD_Pole worksheet - pole design specifications';
COMMENT ON TABLE sharepoint_hld_home IS 'Raw data from SharePoint HLD_Home worksheet - home/premises design';
COMMENT ON TABLE sharepoint_tracker_pole IS 'Raw data from SharePoint Tracker_Pole worksheet - pole installation tracking';
COMMENT ON TABLE sharepoint_tracker_home IS 'Raw data from SharePoint Tracker_Home worksheet - home connection tracking';
COMMENT ON TABLE sharepoint_tracker_stringing IS 'Raw data from SharePoint Tracker Stringing worksheet - fiber stringing progress';
COMMENT ON TABLE sharepoint_jdw_exp IS 'Raw data from SharePoint JDW_Exp worksheet - fiber export data';
COMMENT ON TABLE sharepoint_1map_ins IS 'Raw data from SharePoint 1Map_Ins worksheet - OneMap installation data';
COMMENT ON TABLE sharepoint_1map_pole IS 'Raw data from SharePoint 1Map_Pole worksheet - OneMap pole data';
COMMENT ON TABLE sharepoint_nokia_exp IS 'Raw data from SharePoint Nokia_Exp worksheet - Nokia activation data';
COMMENT ON TABLE sharepoint_pon_tracker IS 'Raw data from SharePoint PON_Tracker worksheet - PON zone tracking';
COMMENT ON TABLE sharepoint_sync_log IS 'Logging table for SharePoint sync operations';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Created: 28 October 2025
-- Tables: 10 raw tables + 1 metadata table
-- Next: Create compatibility views in migration 002
-- ============================================================================
