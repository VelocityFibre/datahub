import { neon } from '@neondatabase/serverless';
import { databaseConfig, validateDatabaseConfig } from '../config/database.config.js';
import { logger } from '../utils/logger.js';

// Validate configuration on module load
validateDatabaseConfig();

// Create Neon SQL client
export const sql = neon(databaseConfig.connectionString!);

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    logger.info('Database connection successful', {
      timestamp: result[0].current_time,
      version: result[0].pg_version,
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

/**
 * Execute a query with error handling
 */
export async function executeQuery<T>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    logger.debug('Executing query', { query, params });
    const result = await sql(query, params);
    return result as T[];
  } catch (error) {
    logger.error('Query execution failed', { query, params, error });
    throw error;
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      )
    `;
    return result[0].exists;
  } catch (error) {
    logger.error('Failed to check table existence', { tableName, error });
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = await sql`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
    return stats;
  } catch (error) {
    logger.error('Failed to get database stats', { error });
    throw error;
  }
}
