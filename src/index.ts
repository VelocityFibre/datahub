import { testConnection } from './database/client.js';
import { initializeLawleySchema } from './database/schemas/lawley.schema.js';
import { lawleySyncService } from './sync/lawley.sync.js';
import { logger } from './utils/logger.js';

/**
 * VelocityFibre DataHub - Main Entry Point
 */

async function main() {
  try {
    logger.info('=== VelocityFibre DataHub Starting ===');

    // Test database connection
    logger.info('Testing Neon database connection...');
    const connected = await testConnection();

    if (!connected) {
      throw new Error('Failed to connect to Neon database');
    }

    // Initialize database schema
    logger.info('Initializing database schema...');
    await initializeLawleySchema();

    // Run initial sync
    logger.info('Running Lawley data sync...');
    const syncResult = await lawleySyncService.sync();

    if (syncResult.success) {
      logger.info('Initial sync completed successfully', {
        recordsProcessed: syncResult.recordsProcessed,
        duration: syncResult.duration,
      });
    } else {
      logger.error('Initial sync failed', { error: syncResult.error });
    }

    logger.info('=== VelocityFibre DataHub Initialized ===');
  } catch (error: any) {
    logger.error('Failed to initialize DataHub', { error: error.message });
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
