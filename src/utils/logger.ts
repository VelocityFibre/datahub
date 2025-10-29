import winston from 'winston';
import { config } from 'dotenv';

config({ path: '.env.local' });

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/datahub.log';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'velocityfibre-datahub' },
  transports: [
    // Write to file
    new winston.transports.File({ filename: logFile, level: 'info' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Helper functions for common logging patterns
export const logSync = {
  start: (source: string, target: string) => {
    logger.info('Sync started', { source, target });
  },
  complete: (source: string, target: string, recordCount: number, duration: number) => {
    logger.info('Sync completed', { source, target, recordCount, duration });
  },
  error: (source: string, target: string, error: any) => {
    logger.error('Sync failed', { source, target, error: error.message, stack: error.stack });
  },
};

export const logApi = {
  request: (method: string, path: string, ip: string) => {
    logger.info('API request', { method, path, ip });
  },
  response: (method: string, path: string, statusCode: number, duration: number) => {
    logger.info('API response', { method, path, statusCode, duration });
  },
  error: (method: string, path: string, error: any) => {
    logger.error('API error', { method, path, error: error.message, stack: error.stack });
  },
};
