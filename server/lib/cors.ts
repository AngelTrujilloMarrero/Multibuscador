import type { RequestHandler } from 'express';

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8787'
];

/**
 * CORS para desarrollo local. Con `ALLOWED_ORIGIN` se limita a los orígenes
 * permitidos.
 */
export function cors(): RequestHandler {
  const allowed = (process.env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = allowed.length > 0 ? allowed : DEFAULT_ORIGINS;

  return (request, response, next) => {
    const origin = request.headers.origin;

    if (origin && origins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
}
