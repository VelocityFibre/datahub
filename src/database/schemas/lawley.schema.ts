import { sql } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Lawley Project Database Schema
 *
 * This schema will be adjusted based on the actual structure of the SharePoint data.
 * Run this migration to create the necessary tables.
 */

/**
 * Create lawley_project table
 */
export async function createLawleyProjectTable(): Promise<void> {
  try {
    logger.info('Creating lawley_project table');

    await sql`
      CREATE TABLE IF NOT EXISTS lawley_project (
        id SERIAL PRIMARY KEY,

        -- Metadata
        source_file VARCHAR(500),
        extracted_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        -- Data will be stored as JSONB initially for flexibility
        -- Once we see the structure, we can create proper columns
        data JSONB NOT NULL,

        -- Audit fields
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index on data for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_lawley_project_data
      ON lawley_project USING gin(data)
    `;

    // Create index on synced_at for tracking
    await sql`
      CREATE INDEX IF NOT EXISTS idx_lawley_project_synced_at
      ON lawley_project(synced_at DESC)
    `;

    logger.info('lawley_project table created successfully');
  } catch (error) {
    logger.error('Failed to create lawley_project table', { error });
    throw error;
  }
}

/**
 * Create sync_log table for tracking sync operations
 */
export async function createSyncLogTable(): Promise<void> {
  try {
    logger.info('Creating sync_log table');

    await sql`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100) NOT NULL,
        target VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index on status and source for filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sync_log_source_status
      ON sync_log(source, status, started_at DESC)
    `;

    logger.info('sync_log table created successfully');
  } catch (error) {
    logger.error('Failed to create sync_log table', { error });
    throw error;
  }
}

/**
 * Drop lawley_project table (for testing/reset)
 */
export async function dropLawleyProjectTable(): Promise<void> {
  try {
    logger.warn('Dropping lawley_project table');
    await sql`DROP TABLE IF EXISTS lawley_project CASCADE`;
    logger.info('lawley_project table dropped');
  } catch (error) {
    logger.error('Failed to drop lawley_project table', { error });
    throw error;
  }
}

/**
 * Initialize all schemas
 */
export async function initializeLawleySchema(): Promise<void> {
  logger.info('Initializing Lawley database schema');
  await createSyncLogTable();
  await createLawleyProjectTable();
  logger.info('Lawley database schema initialized successfully');
}

/**
 * Get table info for analysis
 */
export async function getLawleyTableInfo() {
  const result = await sql`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'lawley_project'
    ORDER BY ordinal_position
  `;
  return result;
}
