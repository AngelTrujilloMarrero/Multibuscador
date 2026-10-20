import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRequestUrl,
  fetchText,
  HttpError,
  readProxyConfig,
  WafChallengeError
} from './http';

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

describe('proxy de scraping', () => {
  it('no modifica la URL cuando no hay plantilla', () => {
    expect(buildRequestUrl('https://ejemplo.test/a', null)).toBe(
      'https://ejemplo.test/a'
    );
    expect(readProxyConfig({})).toBeNull();
  });

  it('sustituye la URL codificada y la clave de API', () => {
    const config = readProxyConfig({
      PROXY_URL_TEMPLATE: 'https://proxy.test/?key={api_key}&url={url}',
      PROXY_API_KEY: 'secreto'
    });

    expect(buildRequestUrl('https://ejemplo.test/a b', config)).toBe(
      'https://proxy.test/?key=secreto&url=https%3A%2F%2Fejemplo.test%2Fa%20b'
    );
  });

  it('admite la URL sin codificar y cabeceras extra', () => {
    const config = readProxyConfig({
      PROXY_URL_TEMPLATE: 'https://proxy.test/?url={url_raw}',
      PROXY_HEADERS: '{"authorization":"Bearer token"}'
    });

    expect(buildRequestUrl('https://ejemplo.test/a', config)).toBe(
      'https://proxy.test/?url=https://ejemplo.test/a'
    );
    expect(config?.headers).toEqual({ authorization: 'Bearer token' });
  });

  it('reconoce los proveedores con solo la clave', () => {
    const config = readProxyConfig({ SCRAPER_API_KEY: 'abc' });

    expect(config?.provider).toBe('ScraperAPI');
    expect(buildRequestUrl('https://ejemplo.test/a', config)).toBe(
      'https://api.scraperapi.com?api_key=abc&url=https%3A%2F%2Fejemplo.test%2Fa'
    );
  });

  it('ofrece renderizado con JavaScript para ScraperAPI', () => {
    const config = readProxyConfig({
      SCRAPER_API_KEY: 'abc',
      SCRAPER_RENDER_JS: 'true'
    });

    expect(buildRequestUrl('https://ejemplo.test/a', config)).toContain(
      '&render_js=true'
    );
  });

  it('soporta Zyte y ScrapingBee', () => {
    expect(
      buildRequestUrl(
        'https://ejemplo.test/a',
        readProxyConfig({ ZYTE_API_KEY: 'z' })
      )
    ).toBe(
      'https://api.zyte.com/v1/extract?url=https%3A%2F%2Fejemplo.test%2Fa&apikey=z'
    );

    expect(
      buildRequestUrl(
        'https://ejemplo.test/a',
        readProxyConfig({ SCRAPINGBEE_API_KEY: 'b' })
      )
    ).toBe(
      'https://app.scrapingbee.com/api/v1/?api_key=b&url=https%3A%2F%2Fejemplo.test%2Fa'
    );
  });

  it('prioriza la plantilla personalizada sobre los proveedores', () => {
    const config = readProxyConfig({
      PROXY_URL_TEMPLATE: 'https://proxy.test/?url={url_raw}',
      SCRAPER_API_KEY: 'abc'
    });

    expect(config?.provider).toBe('personalizado');
  });
});
