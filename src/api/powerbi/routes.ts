import express, { Request, Response } from 'express';
import { sql } from '../../database/client.js';
import { lawleySyncService } from '../../sync/lawley.sync.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/powerbi/lawley/data
 * Get all Lawley project data
 */
router.get('/lawley/data', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info('Fetching Lawley data for Power BI', { limit, offset });

    const data = await sql`
      SELECT
        id,
        source_file,
        extracted_at,
        synced_at,
        data,
        created_at,
        updated_at
      FROM lawley_project
      ORDER BY synced_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const count = await sql`SELECT COUNT(*) as total FROM lawley_project`;

    res.json({
      data,
      metadata: {
        total: parseInt(count[0].total),
        limit,
        offset,
        returned: data.length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching Lawley data', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * GET /api/powerbi/lawley/summary
 * Get summary statistics for Lawley project
 */
router.get('/lawley/summary', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching Lawley summary for Power BI');

    const stats = await sql`
      SELECT
        COUNT(*) as total_records,
        MAX(synced_at) as last_sync,
        MIN(synced_at) as first_sync
      FROM lawley_project
    `;

    const syncHistory = await lawleySyncService.getSyncHistory(5);

    res.json({
      statistics: stats[0],
      recentSyncs: syncHistory,
    });
  } catch (error: any) {
    logger.error('Error fetching Lawley summary', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/powerbi/lawley/columns
 * Get all unique column names from Lawley data
 */
router.get('/lawley/columns', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching Lawley columns for Power BI');

    const columns = await sql`
      SELECT DISTINCT jsonb_object_keys(data) as column_name
      FROM lawley_project
      ORDER BY column_name
    `;

    res.json({
      columns: columns.map(c => c.column_name),
    });
  } catch (error: any) {
    logger.error('Error fetching Lawley columns', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

/**
 * GET /api/powerbi/lawley/flat
 * Get flattened Lawley data (JSONB expanded into columns)
 * Better for Power BI consumption
 */
router.get('/lawley/flat', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info('Fetching flattened Lawley data for Power BI', { limit, offset });

    // Get data with JSONB expanded
    const data = await sql`
      SELECT
        id,
        source_file,
        extracted_at,
        synced_at,
        data.*
      FROM lawley_project,
      LATERAL jsonb_to_record(data) as data
      ORDER BY synced_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const count = await sql`SELECT COUNT(*) as total FROM lawley_project`;

    res.json({
      data,
      metadata: {
        total: parseInt(count[0].total),
        limit,
        offset,
        returned: data.length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching flattened Lawley data', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * POST /api/powerbi/lawley/sync
 * Trigger a manual sync
 */
router.post('/lawley/sync', async (req: Request, res: Response) => {
  try {
    logger.info('Manual sync triggered via API');

    const result = await lawleySyncService.sync();

    res.json({
      success: result.success,
      message: result.success ? 'Sync completed successfully' : 'Sync failed',
      details: result,
    });
  } catch (error: any) {
    logger.error('Error triggering sync', { error: error.message });
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * GET /api/powerbi/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    const dbTest = await sql`SELECT 1 as test`;

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
});

export default router;
