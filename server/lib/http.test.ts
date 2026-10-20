import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchText, HttpError, WafChallengeError } from './http';

function signal(): AbortSignal {
  return new AbortController().signal;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchText', () => {
  it('devuelve el cuerpo de la respuesta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('hola', { status: 200 }))
    );

    await expect(fetchText('https://ejemplo.test', signal())).resolves.toBe(
      'hola'
    );
  });

  it('detecta el reto anti-bot de AWS WAF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html></html>', {
            status: 202,
            headers: { 'x-amzn-waf-action': 'challenge' }
          })
      )
    );

    await expect(
      fetchText('https://ejemplo.test', signal())
    ).rejects.toBeInstanceOf(WafChallengeError);
  });

  it('lanza HttpError en respuestas de error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('no encontrado', { status: 404 }))
    );

    await expect(
      fetchText('https://ejemplo.test', signal())
    ).rejects.toBeInstanceOf(HttpError);
  });
});
