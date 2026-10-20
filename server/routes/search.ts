import { Router } from 'express';
import { parseQuery } from '../lib/validate.js';
import { searchAll } from '../services/search-service.js';

export const searchRouter = Router();

searchRouter.get('/search', async (request, response) => {
  const query = parseQuery(request.query.q);

  if (!query) {
    response.status(400).json({
      error: 'Escribe un producto de entre 2 y 80 caracteres.'
    });
    return;
  }

  const result = await searchAll(query);

  response.set(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  );
  response.json(result);
});
