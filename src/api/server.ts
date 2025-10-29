import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import powerbiRoutes from './powerbi/routes.js';
import { authenticateApiKey, requestLogger, errorHandler } from './middleware/auth.js';
import { logger } from '../utils/logger.js';
import { testConnection } from '../database/client.js';

// Load environment variables
config({ path: '.env.local' });

const app = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(requestLogger); // Log all requests

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VelocityFibre DataHub API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      powerbi: '/api/powerbi',
      health: '/api/powerbi/health',
    },
  });
});

// API routes (with authentication)
app.use('/api/powerbi', authenticateApiKey, powerbiRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

/**
 * Start the API server
 */
export async function startServer() {
  try {
    // Test database connection before starting
    logger.info('Testing database connection...');
    const connected = await testConnection();

    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Start server
    app.listen(port, () => {
      logger.info(`VelocityFibre DataHub API running on port ${port}`);
      logger.info(`API Documentation: http://localhost:${port}`);
      logger.info(`Health Check: http://localhost:${port}/api/powerbi/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start API server', { error: error.message });
    process.exit(1);
  }
}

// Start server if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
