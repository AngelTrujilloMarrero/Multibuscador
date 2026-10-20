import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchProducts } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubResponse(response: Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response)
  );
}

describe('searchProducts', () => {
  it('devuelve la respuesta cuando la API responde bien', async () => {
    const payload = { query: 'teclado', results: [] };
    stubResponse(Response.json(payload));

    await expect(searchProducts('teclado')).resolves.toEqual(payload);
  });

  it('usa el mensaje del backend cuando viene en texto plano', async () => {
    stubResponse(
      Response.json(
        { error: 'Escribe un producto de entre 2 y 80 caracteres.' },
        { status: 400 }
      )
    );

    await expect(searchProducts('a')).rejects.toThrow(
      'Escribe un producto de entre 2 y 80 caracteres.'
    );
  });

  it('entiende el formato de error anidado de Vercel', async () => {
    stubResponse(
      Response.json(
        { error: { code: '404', message: 'The page could not be found' } },
        { status: 500 }
      )
    );

    await expect(searchProducts('teclado')).rejects.toThrow(
      'The page could not be found'
    );
  });

  it('avisa cuando la API no está desplegada', async () => {
    stubResponse(new Response('Not found', { status: 404 }));

    await expect(searchProducts('teclado')).rejects.toThrow(
      'El servidor de precios no está disponible.'
    );
  });
});
