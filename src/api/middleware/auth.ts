import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

/**
 * API Key authentication middleware
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedApiKey = process.env.POWERBI_API_KEY;

  if (!expectedApiKey) {
    logger.error('POWERBI_API_KEY not configured');
    return res.status(500).json({
      error: 'API authentication not configured',
    });
  }

  if (!apiKey) {
    logger.warn('API request without API key', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide an API key in the X-API-Key header or api_key query parameter',
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('API request with invalid API key', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(403).json({
      error: 'Invalid API key',
    });
  }

  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('API request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('API error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
