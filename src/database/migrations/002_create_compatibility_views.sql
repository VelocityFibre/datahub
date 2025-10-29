-- ============================================================================
-- VelocityFibre DataHub - Compatibility Views Migration
-- ============================================================================
-- Date: 28 October 2025
-- Purpose: Create views that translate SharePoint tables to FF app format
-- Approach: Views act as translation layer - no code changes in FF app
-- ============================================================================

-- ============================================================================
-- 1. SOW_POLES VIEW - Pole Inventory & Status
-- ============================================================================
-- Purpose: Translate SharePoint pole data to format FF app expects
-- Source: sharepoint_hld_pole (design) + sharepoint_tracker_pole (status)
-- Target: FF app expects sow_poles table format

CREATE OR REPLACE VIEW sow_poles AS
SELECT
  -- Primary Key
  hld.id,
  hld.project_id,

  -- Core Fields (Translated Names)
  hld.label_1 AS pole_number,
  hld.lat AS latitude,
  hld.lon AS longitude,

  -- Status (prioritize tracker over design)
  COALESCE(tracker."Pole Install Date", hld.datecrtd) AS installation_date,
  COALESCE(
    CASE
      WHEN tracker."Pole Install Date" IS NOT NULL THEN 'installed'
      WHEN hld.status ILIKE '%approved%' THEN 'approved'
      WHEN hld.status ILIKE '%permission%' THEN 'permission_pending'
      ELSE 'planned'
    END,
    'planned'
  ) AS status,

  -- Pole Specifications
  hld.type_1 AS pole_type,
  hld.spec_1 AS pole_spec,
  hld.dim1 AS height,
  hld.dim2 AS diameter,
  hld.cmpownr AS owner,

  -- Network Assignment
  hld.pon_no,
  hld.zone_no,

  -- Location
  hld.address,
  COALESCE(hld.mainplce, hld.mun) AS municipality,

  -- Installation Details
  tracker."Pole Install Contractor" AS installed_by,
  tracker."Pole Install Rate" AS installation_rate,
  tracker."Pole Install Paid Date" AS payment_date,

  -- Audit Fields
  hld.datecrtd AS created_date,
  hld.crtdby AS created_by,
  hld.comments,

  -- Metadata (for reference)
  hld.raw_data,

  -- Timestamps
  GREATEST(hld.updated_at, COALESCE(tracker.updated_at, hld.updated_at)) AS updated_at,
  hld.created_at

FROM sharepoint_hld_pole hld
LEFT JOIN sharepoint_tracker_pole tracker
  ON hld.label_1 = tracker.label_1
  AND (hld.project_id = tracker.project_id OR tracker.project_id IS NULL);

-- ============================================================================
-- 2. SOW_DROPS VIEW - Home Drops & Connections
-- ============================================================================
-- Purpose: Translate SharePoint home data to format FF app expects
-- Source: sharepoint_hld_home (design) + sharepoint_tracker_home (status) + sharepoint_nokia_exp (activation)

CREATE OR REPLACE VIEW sow_drops AS
SELECT
  -- Primary Key
  hld.id,
  hld.project_id,

  -- Core Fields (Translated Names)
  hld.label AS drop_number,
  hld.strtfeat AS pole_number,
  hld.lat AS latitude,
  hld.lon AS longitude,

  -- Status
  COALESCE(
    tracker.connection_status,
    CASE
      WHEN nokia.activation_date IS NOT NULL THEN 'activated'
      WHEN hld.datecrtd IS NOT NULL THEN 'planned'
      ELSE 'pending'
    END,
    'pending'
  ) AS status,

  -- Connection Details
  tracker.connection_date AS installation_date,
  nokia.activation_date,
  nokia.activation_status,

  -- Location
  hld.address,
  COALESCE(hld.mainplce, hld.mun) AS municipality,

  -- Network Assignment
  hld.pon_no,
  hld.zone_no,

  -- Installation Details
  hld.conntr AS contractor,
  hld.cblcpty AS cable_capacity,

  -- Audit
  hld.datecrtd AS created_date,
  hld.crtdby AS created_by,
  hld.comments,

  -- Metadata
  hld.raw_data,

  -- Timestamps
  GREATEST(
    hld.updated_at,
    COALESCE(tracker.updated_at, hld.updated_at),
    COALESCE(nokia.updated_at, hld.updated_at)
  ) AS updated_at,
  hld.created_at

FROM sharepoint_hld_home hld
LEFT JOIN sharepoint_tracker_home tracker
  ON hld.label = tracker.home_label
  AND (hld.project_id = tracker.project_id OR tracker.project_id IS NULL)
LEFT JOIN sharepoint_nokia_exp nokia
  ON hld.label = nokia.home_reference
  AND (hld.project_id = nokia.project_id OR nokia.project_id IS NULL);

-- ============================================================================
-- 3. SOW_FIBRE VIEW - Fiber Cable Segments
-- ============================================================================
-- Purpose: Translate fiber/stringing data to format FF app expects
-- Source: sharepoint_jdw_exp (design) + sharepoint_tracker_stringing (progress)

CREATE OR REPLACE VIEW sow_fibre AS
SELECT
  -- Primary Key
  jdw.id,
  jdw.project_id,

  -- Core Fields
  jdw.segment_id,
  jdw.cable_info AS cable_size,

  -- Progress from tracker
  stringing."Scope" AS layer,
  stringing.section_number,

  -- Status
  CASE
    WHEN stringing.raw_data->>'completion_percentage' IS NOT NULL
      THEN 'in_progress'
    WHEN jdw.segment_id IS NOT NULL
      THEN 'planned'
    ELSE 'pending'
  END AS status,

  -- Metadata
  jsonb_build_object(
    'jdw_data', jdw.raw_data,
    'stringing_data', stringing.raw_data
  ) AS raw_data,

  -- Timestamps
  GREATEST(jdw.updated_at, COALESCE(stringing.updated_at, jdw.updated_at)) AS updated_at,
  jdw.created_at

FROM sharepoint_jdw_exp jdw
LEFT JOIN sharepoint_tracker_stringing stringing
  ON jdw.segment_id = stringing."Scope"
  AND (jdw.project_id = stringing.project_id OR stringing.project_id IS NULL);

-- ============================================================================
-- 4. SOW_ONEMAP_MAPPING VIEW - OneMap Cross-Reference
-- ============================================================================
-- Purpose: Map SOW poles to OneMap poles
-- Source: sharepoint_1map_pole

CREATE OR REPLACE VIEW sow_onemap_mapping AS
SELECT
  id,
  project_id,
  sow_pole_reference AS sow_pole_number,
  onemap_pole_id AS onemap_pole_number,

  -- Extract match type from raw data if available
  COALESCE(
    raw_data->>'match_type',
    CASE
      WHEN sow_pole_reference IS NOT NULL AND onemap_pole_id IS NOT NULL
        THEN 'direct'
      ELSE 'unmatched'
    END
  ) AS match_type,

  -- Confidence score (if available in raw data)
  CAST(raw_data->>'confidence_score' AS NUMERIC) AS confidence_score,

  -- Distance (if available in raw data)
  CAST(raw_data->>'distance_meters' AS NUMERIC) AS distance_meters,

  -- Timestamps
  created_at,
  updated_at

FROM sharepoint_1map_pole
WHERE sow_pole_reference IS NOT NULL OR onemap_pole_id IS NOT NULL;

-- ============================================================================
-- 5. POLE_TRACKER_SUMMARY VIEW - Aggregated Pole Status
-- ============================================================================
-- Purpose: Summary view for dashboards and reports
-- Source: Multiple SharePoint tables

CREATE OR REPLACE VIEW pole_tracker_summary AS
SELECT
  project_id,
  pon_no,
  zone_no,

  -- Counts
  COUNT(DISTINCT pole_number) AS total_poles,
  COUNT(DISTINCT CASE WHEN status = 'installed' THEN pole_number END) AS poles_installed,
  COUNT(DISTINCT CASE WHEN status = 'approved' THEN pole_number END) AS poles_approved,
  COUNT(DISTINCT CASE WHEN status = 'planned' THEN pole_number END) AS poles_planned,
  COUNT(DISTINCT CASE WHEN status = 'permission_pending' THEN pole_number END) AS poles_pending_permission,

  -- Percentages
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN status = 'installed' THEN pole_number END) /
    NULLIF(COUNT(DISTINCT pole_number), 0),
    2
  ) AS installation_progress_pct,

  -- Latest activity
  MAX(updated_at) AS last_updated

FROM sow_poles
WHERE pole_number IS NOT NULL
GROUP BY project_id, pon_no, zone_no;

-- ============================================================================
-- 6. DROP_TRACKER_SUMMARY VIEW - Aggregated Drop Status
-- ============================================================================
-- Purpose: Summary view for home connection tracking

CREATE OR REPLACE VIEW drop_tracker_summary AS
SELECT
  project_id,
  pon_no,
  zone_no,

  -- Counts
  COUNT(DISTINCT drop_number) AS total_drops,
  COUNT(DISTINCT CASE WHEN status = 'activated' THEN drop_number END) AS drops_activated,
  COUNT(DISTINCT CASE WHEN status = 'planned' THEN drop_number END) AS drops_planned,
  COUNT(DISTINCT CASE WHEN status = 'pending' THEN drop_number END) AS drops_pending,

  -- Percentages
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN status = 'activated' THEN drop_number END) /
    NULLIF(COUNT(DISTINCT drop_number), 0),
    2
  ) AS activation_progress_pct,

  -- Latest activity
  MAX(updated_at) AS last_updated

FROM sow_drops
WHERE drop_number IS NOT NULL
GROUP BY project_id, pon_no, zone_no;

-- ============================================================================
-- 7. PROJECT_PROGRESS_VIEW - Overall Project Progress
-- ============================================================================
-- Purpose: High-level project metrics for Power BI and dashboards

CREATE OR REPLACE VIEW project_progress_view AS
SELECT
  p.project_id,

  -- Pole Metrics
  SUM(p.total_poles) AS total_poles,
  SUM(p.poles_installed) AS poles_installed,
  ROUND(AVG(p.installation_progress_pct), 2) AS avg_pole_progress_pct,

  -- Drop Metrics
  SUM(d.total_drops) AS total_drops,
  SUM(d.drops_activated) AS drops_activated,
  ROUND(AVG(d.activation_progress_pct), 2) AS avg_drop_progress_pct,

  -- Overall Progress
  ROUND(
    (AVG(p.installation_progress_pct) + AVG(d.activation_progress_pct)) / 2,
    2
  ) AS overall_progress_pct,

  -- Latest Activity
  GREATEST(MAX(p.last_updated), MAX(d.last_updated)) AS last_activity

FROM pole_tracker_summary p
FULL OUTER JOIN drop_tracker_summary d
  ON p.project_id = d.project_id
  AND p.pon_no = d.pon_no
  AND p.zone_no = d.zone_no
GROUP BY p.project_id;

-- ============================================================================
-- Comments & Documentation
-- ============================================================================

COMMENT ON VIEW sow_poles IS 'Compatibility view: Translates sharepoint_hld_pole + sharepoint_tracker_pole to FF app format';
COMMENT ON VIEW sow_drops IS 'Compatibility view: Translates sharepoint_hld_home + sharepoint_tracker_home + sharepoint_nokia_exp to FF app format';
COMMENT ON VIEW sow_fibre IS 'Compatibility view: Translates sharepoint_jdw_exp + sharepoint_tracker_stringing to FF app format';
COMMENT ON VIEW sow_onemap_mapping IS 'Compatibility view: Maps SOW poles to OneMap poles from sharepoint_1map_pole';
COMMENT ON VIEW pole_tracker_summary IS 'Aggregated pole status by project/PON/zone for dashboards';
COMMENT ON VIEW drop_tracker_summary IS 'Aggregated drop status by project/PON/zone for dashboards';
COMMENT ON VIEW project_progress_view IS 'Overall project progress metrics for Power BI and reporting';

-- ============================================================================
-- Grant Permissions (if needed)
-- ============================================================================
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
-- GRANT SELECT ON sow_poles, sow_drops, sow_fibre TO app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Created: 28 October 2025
-- Views: 7 compatibility/reporting views
-- Purpose: Enable FF app to query new structure with zero code changes
-- Next: Test FF app APIs with these views
-- ============================================================================
