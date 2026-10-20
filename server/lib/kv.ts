const DEFAULT_TTL_SECONDS = 600;

interface KvConfig {
  url: string;
  token: string;
}

export function readKvConfig(
  env: Record<string, string | undefined> = process.env
): KvConfig | null {
  const url = (
    env.KV_REST_API_URL ??
    env.UPSTASH_REDIS_REST_URL ??
    env.REDIS_REST_URL ??
    ''
  ).trim();
  const token = (
    env.KV_REST_API_TOKEN ??
    env.UPSTASH_REDIS_REST_TOKEN ??
    env.REDIS_REST_TOKEN ??
    ''
  ).trim();

  if (url && token) {
    return { url: url.replace(/\/$/, ''), token };
  }

  // Algunas integraciones solo inyectan REDIS_URL (redis://usuario:clave@host).
  const redisUrl = env.REDIS_URL?.trim();

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const password = parsed.password ? decodeURIComponent(parsed.password) : '';

      if (parsed.hostname && password) {
        return {
          url: `https://${parsed.hostname}`,
          token: password
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function readCacheTtl(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = Number(env.CACHE_TTL_SECONDS);

  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TTL_SECONDS;
}

async function kvRequest(
  config: KvConfig,
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const response = await fetch(`${config.url}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`KV ${response.status} en ${path}`);
  }

  const payload = (await response.json()) as { result?: unknown; value?: unknown };

  if (payload && typeof payload === 'object') {
    return payload.result ?? payload.value ?? null;
  }

  return payload;
}

export async function getCachedValue(
  key: string,
  config: KvConfig | null
): Promise<string | null> {
  if (!config) {
    return null;
  }

  try {
    const result = await kvRequest(config, `get/${encodeURIComponent(key)}`);

    return typeof result === 'string' ? result : null;
  } catch {
    return null;
  }
}

export async function setCachedValue(
  key: string,
  value: string,
  ttlSeconds: number,
  config: KvConfig | null
): Promise<void> {
  if (!config) {
    return;
  }

  const encodedKey = encodeURIComponent(key);

  try {
    const response = await fetch(`${config.url}/set/${encodedKey}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify([value, 'EX', String(ttlSeconds)])
    });

    if (response.ok) {
      return;
    }
  } catch {
    // Se intenta el formato alternativo.
  }

  try {
    await fetch(`${config.url}/set/${encodedKey}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ value, expiration: ttlSeconds })
    });
  } catch {
    // La caché es una optimización: si falla, la búsqueda sigue funcionando.
  }
}
