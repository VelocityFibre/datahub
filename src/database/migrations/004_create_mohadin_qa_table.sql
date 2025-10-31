-- ============================================================================
-- Create separate Mohadin QA table
-- ============================================================================
-- Date: 30 October 2025
-- Purpose: Create dedicated table for Mohadin Activations QA tracking
-- Reason: Mohadin and Lawley are separate projects and need separate tables
-- ============================================================================

-- Create sharepoint_mohadin_qa table
CREATE TABLE IF NOT EXISTS sharepoint_mohadin_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP,
  drop_number VARCHAR(255),
  source VARCHAR(50),
  zone_no INTEGER,
  pon_no INTEGER,
  step_1_property_frontage BOOLEAN,
  step_2_location_on_wall BOOLEAN,
  step_3_outside_cable_span BOOLEAN,
  step_4_home_entry_outside BOOLEAN,
  step_5_home_entry_inside BOOLEAN,
  step_6_fibre_entry_to_ont BOOLEAN,
  step_7_work_area_completion BOOLEAN,
  step_8_ont_barcode BOOLEAN,
  step_9_mini_ups_serial BOOLEAN,
  step_10_powermeter_before_activation BOOLEAN,
  step_11_active_broadband_light BOOLEAN,
  step_12_customer_signature BOOLEAN,
  completed_photos TEXT,
  outstanding_photos TEXT,
  user_name VARCHAR(255),
  outstanding_photos_loaded_1map BOOLEAN,
  qa_completed_loaded_sp BOOLEAN,
  comment TEXT,
  project_id UUID,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(500),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_drop
  ON sharepoint_mohadin_qa(drop_number);

CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_source
  ON sharepoint_mohadin_qa(source);

CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_date
  ON sharepoint_mohadin_qa(date);

CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_zone_pon
  ON sharepoint_mohadin_qa(zone_no, pon_no);

CREATE INDEX IF NOT EXISTS idx_sharepoint_mohadin_qa_pon
  ON sharepoint_mohadin_qa(pon_no);

-- Add comments
COMMENT ON TABLE sharepoint_mohadin_qa IS 'QA photo verification data from Mohadin Activations sheet (separate from Lawley)';
COMMENT ON COLUMN sharepoint_mohadin_qa.zone_no IS 'Network zone number from SharePoint';
COMMENT ON COLUMN sharepoint_mohadin_qa.pon_no IS 'PON number from SharePoint';
COMMENT ON COLUMN sharepoint_mohadin_qa.source IS 'Source of data: mohadin_historical or mohadin_activations';

-- ============================================================================
-- Migration Complete
-- ============================================================================
