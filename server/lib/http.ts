const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'es-ES,es;q=0.9'
};

const JSON_HEADERS = {
  ...DEFAULT_HEADERS,
  accept: 'application/json,text/plain,*/*'
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`HTTP ${status} en ${url}`);
    this.name = 'HttpError';
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

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestOnce(url, signal, headers);
    } catch (error) {
      lastError = error;

      if (signal.aborted || attempt === attempts) {
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

async function requestOnce(
  url: string,
  signal: AbortSignal,
  headers: Record<string, string>
): Promise<string> {
  const response = await fetch(url, {
    signal,
    redirect: 'follow',
    headers
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new BotProtectionError(response.status, url);
    }

    throw new HttpError(response.status, url);
  }

  return await response.text();
}

export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const text = await fetchText(url, signal, 2, JSON_HEADERS);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta JSON inválida desde ${url}`);
  }
}
