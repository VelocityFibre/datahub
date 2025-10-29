import { lawleyConnector } from '../connectors/sharepoint/lawley.connector.js';
import { sql } from '../database/client.js';
import { logger, logSync } from '../utils/logger.js';
import { SyncError, handleError } from '../utils/error-handler.js';

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  error?: string;
}

/**
 * Lawley Project Sync Service
 */
export class LawleySyncService {
  /**
   * Sync Lawley data from SharePoint to Neon
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const source = 'SharePoint:Lawley';
    const target = 'Neon:lawley_project';

    let syncLogId: number | null = null;

    try {
      logSync.start(source, target);

      // Create sync log entry
      syncLogId = await this.createSyncLog(source, target, 'running');

      // Extract data from SharePoint
      logger.info('Extracting Lawley data from SharePoint');
      const lawleyData = await lawleyConnector.extractData();

      logger.info('Data extracted successfully', {
        rowCount: lawleyData.rawData.length,
        columns: lawleyData.metadata.columns,
      });

      // Clear existing data (or implement upsert logic)
      await this.clearExistingData();

      // Insert data into Neon
      const recordsProcessed = await this.insertData(lawleyData);

      const duration = Date.now() - startTime;

      // Update sync log
      await this.updateSyncLog(syncLogId, 'completed', recordsProcessed, 0, duration);

      logSync.complete(source, target, recordsProcessed, duration);

      return {
        success: true,
        recordsProcessed,
        recordsFailed: 0,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Update sync log with error
      if (syncLogId) {
        await this.updateSyncLog(syncLogId, 'failed', 0, 1, duration, error.message);
      }

      logSync.error(source, target, error);
      handleError(error, 'LawleySyncService');

      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Clear existing Lawley data
   */
  private async clearExistingData(): Promise<void> {
    logger.info('Clearing existing Lawley data');
    await sql`DELETE FROM lawley_project`;
    logger.info('Existing data cleared');
  }

  /**
   * Insert Lawley data into database
   */
  private async insertData(lawleyData: any): Promise<number> {
    logger.info('Inserting Lawley data into database');

    let insertedCount = 0;

    // Insert each row
    for (const row of lawleyData.rawData) {
      try {
        await sql`
          INSERT INTO lawley_project (
            source_file,
            extracted_at,
            data
          ) VALUES (
            ${lawleyData.metadata.source},
            ${lawleyData.metadata.extractedAt},
            ${JSON.stringify(row)}
          )
        `;
        insertedCount++;
      } catch (error: any) {
        logger.error('Failed to insert row', { row, error: error.message });
        // Continue with next row instead of failing entire sync
      }
    }

    logger.info(`Inserted ${insertedCount} records into database`);
    return insertedCount;
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(
    source: string,
    target: string,
    status: string
  ): Promise<number> {
    const result = await sql`
      INSERT INTO sync_log (
        source,
        target,
        status,
        started_at
      ) VALUES (
        ${source},
        ${target},
        ${status},
        NOW()
      )
      RETURNING id
    `;

    return result[0].id;
  }

  /**
   * Update sync log entry
   */
  private async updateSyncLog(
    id: number,
    status: string,
    recordsProcessed: number,
    recordsFailed: number,
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    await sql`
      UPDATE sync_log
      SET
        status = ${status},
        records_processed = ${recordsProcessed},
        records_failed = ${recordsFailed},
        duration_ms = ${durationMs},
        error_message = ${errorMessage || null},
        completed_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 10) {
    return await sql`
      SELECT *
      FROM sync_log
      WHERE source LIKE 'SharePoint:Lawley%'
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  }

  /**
   * Get latest sync status
   */
  async getLatestSyncStatus() {
    const result = await sql`
      SELECT *
      FROM sync_log
      WHERE source LIKE 'SharePoint:Lawley%'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    return result[0] || null;
  }
}

// Export singleton instance
export const lawleySyncService = new LawleySyncService();
