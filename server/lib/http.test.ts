import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProxyTemplate,
  buildRequestUrl,
  fetchText,
  HttpError,
  readProxyConfig,
  WafChallengeError
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

  it('reintenta una vez cuando el WAF devuelve un reto', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<html></html>', {
          status: 202,
          headers: { 'x-amzn-waf-action': 'challenge' }
        })
      )
      .mockResolvedValueOnce(new Response('contenido', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchText('https://ejemplo.test', signal())).resolves.toBe(
      'contenido'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('proxy por tienda', () => {
  const alcampoUrl = 'https://www.compraonline.alcampo.es/search?q=teclado';
  const leroyUrl = 'https://www.leroymerlin.es/productos/teclado.html';

  it('acepta una clave suelta o una URL de proxy', () => {
    expect(buildProxyTemplate('clave-123')).toBe(
      'https://api.scraperapi.com?api_key=clave-123&url={url}'
    );
    expect(buildProxyTemplate('https://proxy.test/?token=x')).toBe(
      'https://proxy.test/?token=x&url={url}'
    );
    expect(buildProxyTemplate('https://proxy.test/?token=x&url={url}')).toBe(
      'https://proxy.test/?token=x&url={url}'
    );
  });

  it('usa una variable por tienda', () => {
    const env = {
      ALCAMPO_PROXY: 'clave-alcampo',
      LEROY_MERLIN_PROXY: 'https://proxy.test/?token=lm'
    };

    const alcampo = readProxyConfig(alcampoUrl, env);
    const leroy = readProxyConfig(leroyUrl, env);

    expect(alcampo?.store).toBe('alcampo');
    expect(buildRequestUrl(alcampoUrl, alcampo)).toBe(
      'https://api.scraperapi.com?api_key=clave-alcampo&url=https%3A%2F%2Fwww.compraonline.alcampo.es%2Fsearch%3Fq%3Dteclado'
    );
    expect(buildRequestUrl(leroyUrl, leroy)).toBe(
      'https://proxy.test/?token=lm&url=https%3A%2F%2Fwww.leroymerlin.es%2Fproductos%2Fteclado.html'
    );
  });

  it('no usa proxy en las tiendas sin variable', () => {
    expect(
      readProxyConfig('https://nalber.com/module/iqitsearch', {
        ALCAMPO_PROXY: 'clave'
      })
    ).toBeNull();

    expect(readProxyConfig(alcampoUrl, {})).toBeNull();
  });
});
