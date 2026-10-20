const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'es-ES,es;q=0.9,en;q=0.6'
};

const JSON_HEADERS = {
  ...DEFAULT_HEADERS,
  accept: 'application/json,text/plain,*/*'
};

export interface ProxyConfig {
  template?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  provider?: string;
}

interface ProxyPreset {
  env: string;
  provider: string;
  build: (apiKey: string, env: Record<string, string | undefined>) => string;
}

const PROXY_PRESETS: ProxyPreset[] = [
  {
    env: 'SCRAPER_API_KEY',
    provider: 'ScraperAPI',
    build: (apiKey, env) => {
      const renderJs = env.SCRAPER_RENDER_JS === 'true' ? '&render_js=true' : '';
      return `https://api.scraperapi.com?api_key=${apiKey}&url={url}${renderJs}`;
    }
  },
  {
    env: 'ZYTE_API_KEY',
    provider: 'Zyte',
    build: (apiKey) =>
      `https://api.zyte.com/v1/extract?url={url}&apikey=${apiKey}`
  },
  {
    env: 'SCRAPINGBEE_API_KEY',
    provider: 'ScrapingBee',
    build: (apiKey) =>
      `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url={url}`
  }
];

export function readProxyConfig(
  env: Record<string, string | undefined> = process.env
): ProxyConfig | null {
  const template = env.PROXY_URL_TEMPLATE?.trim();

  let headers: Record<string, string> | undefined;

  if (env.PROXY_HEADERS) {
    try {
      headers = JSON.parse(env.PROXY_HEADERS) as Record<string, string>;
    } catch {
      headers = undefined;
    }
  }

  if (template) {
    return {
      template,
      apiKey: env.PROXY_API_KEY,
      headers,
      provider: 'personalizado'
    };
  }

  for (const preset of PROXY_PRESETS) {
    const apiKey = env[preset.env]?.trim();

    if (apiKey) {
      return {
        template: preset.build(apiKey, env),
        apiKey,
        headers,
        provider: preset.provider
      };
    }
  }

  return null;
}

export function buildRequestUrl(
  url: string,
  config: ProxyConfig | null
): string {
  if (!config?.template) {
    return url;
  }

  return config.template
    .replaceAll('{url}', encodeURIComponent(url))
    .replaceAll('{url_raw}', url)
    .replaceAll('{api_key}', config.apiKey ?? '');
}

function buildHeaders(
  config: ProxyConfig | null,
  base: Record<string, string>
): Record<string, string> {
  return config?.headers ? { ...base, ...config.headers } : base;
}

let proxyLogged = false;

function logProxyOnce(config: ProxyConfig | null): void {
  if (proxyLogged) {
    return;
  }

  proxyLogged = true;

  if (config) {
    console.log(`[proxy] consultas a las tiendas vía ${config.provider}`);
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`HTTP ${status} en ${url}`);
    this.name = 'HttpError';
  }
}

export class WafChallengeError extends Error {
  constructor(public readonly url: string) {
    super(`Protección anti-bot en ${url}`);
    this.name = 'WafChallengeError';
  }
}

export class BotProtectionError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`Bloqueo anti-bot (${status}) en ${url}`);
    this.name = 'BotProtectionError';
  }
}

function isChallenge(response: Response): boolean {
  return (
    response.status === 202 ||
    response.headers.get('x-amzn-waf-action') === 'challenge'
  );
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        const error = new Error('Solicitud cancelada');
        error.name = 'AbortError';
        reject(error);
      },
      { once: true }
    );
  });
}

const STORE_BY_HOST: Record<string, string> = {
  'compraonline.alcampo.es': 'alcampo',
  'www.compraonline.alcampo.es': 'alcampo',
  'leroymerlin.es': 'leroy-merlin',
  'www.leroymerlin.es': 'leroy-merlin'
};

export function readProxyStores(
  env: Record<string, string | undefined> = process.env
): string[] | null {
  const raw = env.PROXY_STORES?.trim();

  if (!raw) {
    return null;
  }

  return raw
    .split(',')
    .map((store) => store.trim().toLowerCase())
    .filter(Boolean);
}

function storeOfUrl(url: string): string | null {
  try {
    return STORE_BY_HOST[new URL(url).hostname] ?? null;
  } catch {
    return null;
  }
}

/**
 * Decide si una petición concreta debe ir por el proxy. Con `PROXY_STORES`
 * solo se enrutan las tiendas indicadas (por ejemplo Alcampo y Leroy Merlin),
 * así el proxy no se gasta en las tiendas que ya funcionan.
 */
export function shouldUseProxy(
  url: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  const stores = readProxyStores(env);

  if (!stores) {
    return true;
  }

  const store = storeOfUrl(url);

  return store !== null && stores.includes(store);
}

export async function fetchText(
  url: string,
  signal: AbortSignal,
  attempts = 2,
  headers: Record<string, string> = DEFAULT_HEADERS
): Promise<string> {
  let lastError: unknown;
  const proxy = shouldUseProxy(url) ? readProxyConfig() : null;
  const requestUrl = buildRequestUrl(url, proxy);
  const requestHeaders = buildHeaders(proxy, headers);

  logProxyOnce(proxy);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(requestUrl, {
        signal,
        redirect: 'follow',
        headers: requestHeaders
      });

      if (isChallenge(response)) {
        throw new WafChallengeError(url);
      }

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new BotProtectionError(response.status, url);
        }

        throw new HttpError(response.status, url);
      }

      return await response.text();
    } catch (error) {
      lastError = error;

      if (signal.aborted || attempt === attempts) {
        break;
      }

      if (error instanceof WafChallengeError) {
        break;
      }

      if (error instanceof HttpError && error.status < 500) {
        break;
      }

      await abortableDelay(250 * attempt, signal);
    }
  }

  throw lastError;
}

export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const text = await fetchText(url, signal, 2, JSON_HEADERS);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta JSON inválida desde ${url}`);
  }
}
