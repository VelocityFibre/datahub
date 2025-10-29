import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

export const databaseConfig = {
  connectionString: process.env.NEON_DATABASE_URL,
  poolSize: 10,
  idleTimeout: 30000,
  connectionTimeout: 10000,
  ssl: {
    rejectUnauthorized: true,
  },
} as const;

export const validateDatabaseConfig = (): void => {
  if (!databaseConfig.connectionString) {
    throw new Error('NEON_DATABASE_URL is not defined in environment variables');
  }

  // Validate connection string format
  if (!databaseConfig.connectionString.startsWith('postgresql://')) {
    throw new Error('Invalid Neon database connection string format');
  }
};
