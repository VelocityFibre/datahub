import { logger } from './logger.js';

export class DataHubError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DataHubError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends DataHubError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DataHubError {
  constructor(message: string, source: string, details?: any) {
    super(message, 'CONNECTION_ERROR', 503, { source, ...details });
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends DataHubError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends DataHubError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class SyncError extends DataHubError {
  constructor(message: string, source: string, details?: any) {
    super(message, 'SYNC_ERROR', 500, { source, ...details });
    this.name = 'SyncError';
  }
}

/**
 * Handle and log errors appropriately
 */
export function handleError(error: any, context?: string): void {
  if (error instanceof DataHubError) {
    logger.error(`${context ? `[${context}] ` : ''}${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
    });
  } else {
    logger.error(`${context ? `[${context}] ` : ''}Unexpected error`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
