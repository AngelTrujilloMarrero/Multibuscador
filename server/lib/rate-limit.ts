import type { RequestHandler } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export function rateLimit({
  windowMs = 60_000,
  max = 40
}: RateLimitOptions = {}): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip ?? 'desconocido';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      response.status(429).json({
        error: 'Demasiadas búsquedas seguidas. Espera un minuto e inténtalo de nuevo.'
      });
      return;
    }

    if (buckets.size > 2_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
