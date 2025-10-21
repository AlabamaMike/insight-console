import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Env } from './types';
import deals from './routes/deals';
import documents from './routes/documents';
import workflows from './routes/workflows';
import auth from './routes/auth';
import { securityHeaders, configureCORS, requestId, sanitizeErrors } from './middleware/security';

// Create Hono app with environment type
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', requestId);
app.use('*', securityHeaders);
app.use(
  '*',
  configureCORS([
    'https://dealinsights.ai',
    'https://www.dealinsights.ai',
    'http://localhost:3000',
    'http://localhost:3001',
  ])
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'DealInsights.ai API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
  });
});

// API routes
app.route('/api/deals', deals);
app.route('/api/documents', documents);
app.route('/api/deals', workflows); // Nested under /api/deals/:dealId/analysis
app.route('/api/workflows', workflows); // Direct access for workflow details
app.route('/auth', auth);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);

  // Don't expose internal details in production
  if (c.env.ENVIRONMENT === 'production') {
    return c.json(
      {
        error: 'Internal Server Error',
        request_id: c.get('requestId'),
      },
      500
    );
  }

  // Development: provide more details
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
      request_id: c.get('requestId'),
      stack: err.stack,
    },
    500
  );
});

export default app;
