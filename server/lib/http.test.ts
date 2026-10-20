import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BotProtectionError,
  fetchText,
  HttpError
} from './http';

afterEach(() => {
  vi.unstubAllGlobals();
});

function signal(): AbortSignal {
  return new AbortController().signal;
}

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

  it('lanza HttpError en respuestas de error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('no encontrado', { status: 404 }))
    );

    await expect(
      fetchText('https://ejemplo.test', signal())
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('detecta los bloqueos anti-bot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('forbidden', { status: 403 }))
    );

    await expect(
      fetchText('https://ejemplo.test', signal())
    ).rejects.toBeInstanceOf(BotProtectionError);
  });

  it('reintenta una vez cuando el servidor falla', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('error', { status: 503 }))
      .mockResolvedValueOnce(new Response('contenido', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchText('https://ejemplo.test', signal())).resolves.toBe(
      'contenido'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
