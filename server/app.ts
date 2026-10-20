import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { rateLimit } from './lib/rate-limit.js';
import { searchRouter } from './routes/search.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, max: 40 }));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'multibuscador' });
  });

  app.use('/api', searchRouter);

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Ruta no encontrada.' });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: 'Error interno del servidor.' });
  };

  app.use(errorHandler);
  return app;
}
