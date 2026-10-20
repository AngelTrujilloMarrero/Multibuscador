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
}

export function readProxyConfig(
  env: Record<string, string | undefined> = process.env
): ProxyConfig | null {
  const template = env.PROXY_URL_TEMPLATE?.trim();

  if (!template) {
    return null;
  }

  let headers: Record<string, string> | undefined;

  if (env.PROXY_HEADERS) {
    try {
      headers = JSON.parse(env.PROXY_HEADERS) as Record<string, string>;
    } catch {
      headers = undefined;
    }
  }

  return {
    template,
    apiKey: env.PROXY_API_KEY,
    headers
  };
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

export async function fetchText(
  url: string,
  signal: AbortSignal,
  attempts = 2,
  headers: Record<string, string> = DEFAULT_HEADERS
): Promise<string> {
  let lastError: unknown;
  const proxy = readProxyConfig();
  const requestUrl = buildRequestUrl(url, proxy);
  const requestHeaders = buildHeaders(proxy, headers);

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
