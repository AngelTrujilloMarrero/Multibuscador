import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCachedValue,
  readCacheTtl,
  readKvConfig,
  setCachedValue
} from './kv';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readKvConfig', () => {
  it('acepta las variables de KV y de Upstash', () => {
    expect(
      readKvConfig({ KV_REST_API_URL: 'https://x.kv.example.com', KV_REST_API_TOKEN: 't' })
    ).toEqual({ url: 'https://x.kv.example.com', token: 't' });

    expect(
      readKvConfig({
        UPSTASH_REDIS_REST_URL: 'https://x.upstash.io/',
        UPSTASH_REDIS_REST_TOKEN: 't2'
      })
    ).toEqual({ url: 'https://x.upstash.io', token: 't2' });
  });

  it('devuelve null si no hay caché configurada', () => {
    expect(readKvConfig({})).toBeNull();
  });

  it('deduce la URL y el token de REDIS_URL', () => {
    expect(
      readKvConfig({ REDIS_URL: 'redis://default:secreto@x.upstash.io:6379' })
    ).toEqual({ url: 'https://x.upstash.io', token: 'secreto' });
  });

  it('acepta los nombres REDIS_REST_URL y REDIS_REST_TOKEN', () => {
    expect(
      readKvConfig({ REDIS_REST_URL: 'https://x.io', REDIS_REST_TOKEN: 't' })
    ).toEqual({ url: 'https://x.io', token: 't' });
  });
});

describe('readCacheTtl', () => {
  it('usa 10 minutos por defecto y acepta el customization', () => {
    expect(readCacheTtl({})).toBe(600);
    expect(readCacheTtl({ CACHE_TTL_SECONDS: '3600' })).toBe(3600);
    expect(readCacheTtl({ CACHE_TTL_SECONDS: 'abc' })).toBe(600);
  });
});

describe('KV', () => {
  const config = { url: 'https://x.kv.example.com', token: 't' };

  it('lee un valor con la API REST', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ result: '{"query":"teclado"}' })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCachedValue('search:teclado', config)).resolves.toBe(
      '{"query":"teclado"}'
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://x.kv.example.com/get/search%3Ateclado'
    );
  });

  it('escribe con caducidad', async () => {
    const fetchMock = vi.fn(async () => Response.json({ result: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    await setCachedValue('search:teclado', '{}', 900, config);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://x.kv.example.com/set/search%3Ateclado');
    expect(init?.body).toBe(JSON.stringify(['{}', 'EX', '900']));
  });

  it('no hace nada si no hay caché configurada', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCachedValue('k', null)).resolves.toBeNull();
    await setCachedValue('k', 'v', 60, null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no rompe la búsqueda si la caché falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 }))
    );

    await expect(getCachedValue('k', config)).resolves.toBeNull();
    await expect(setCachedValue('k', 'v', 60, config)).resolves.toBeUndefined();
  });
});
