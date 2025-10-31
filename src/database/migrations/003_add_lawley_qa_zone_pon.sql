-- ============================================================================
-- Add Zone and PON columns to Lawley QA table
-- ============================================================================
-- Date: 30 October 2025
-- Purpose: Add network assignment fields (zone_no, pon_no) to QA tracking
-- Reason: New columns added to SharePoint "Mohadin Activations" sheet
-- ============================================================================

-- Add columns
ALTER TABLE sharepoint_lawley_qa
ADD COLUMN IF NOT EXISTS zone_no INTEGER,
ADD COLUMN IF NOT EXISTS pon_no INTEGER;

-- Create indexes for filtering by zone/pon
CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_zone_pon
ON sharepoint_lawley_qa(zone_no, pon_no);

CREATE INDEX IF NOT EXISTS idx_sharepoint_lawley_qa_pon
ON sharepoint_lawley_qa(pon_no);

-- Add comment
COMMENT ON COLUMN sharepoint_lawley_qa.zone_no IS 'Network zone number from SharePoint';
COMMENT ON COLUMN sharepoint_lawley_qa.pon_no IS 'PON number from SharePoint';

-- ============================================================================
-- Migration Complete
-- ============================================================================
