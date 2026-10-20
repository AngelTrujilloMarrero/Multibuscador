import type {
  BestPrice,
  SearchResponse,
  StoreResult
} from '../../shared/types.js';
import { ADAPTERS } from '../adapters/registry.js';
import type { StoreAdapter } from '../adapters/types.js';
import { TtlCache } from '../lib/cache.js';
import { BotProtectionError, HttpError } from '../lib/http.js';
import { getCachedValue, readCacheTtl, readKvConfig, setCachedValue } from '../lib/kv.js';
import { rankProducts } from '../lib/matching.js';
import { normalizeText } from '../lib/text.js';

const REQUEST_TIMEOUT_MS = 8_000;
const STALE_FACTOR = 4;

const memoryCache = new TtlCache<string, SearchResponse>(600_000, 100);
const inFlight = new Map<string, Promise<SearchResponse>>();

interface SharedEntry {
  at: number;
  data: SearchResponse;
}

/**
 * Busca en la caché compartida (Upstash/Redis) y, si no hay, en la
 * memoria de la instancia. Con KV, una sola petición a las tiendas sirve a
 * todos los usuarios y se reduce el tráfico hacia sus catálogos.
 */
export async function searchAll(query: string): Promise<SearchResponse> {
  const key = normalizeText(query);
  const kv = readKvConfig();
  const ttl = readCacheTtl();

  const inMemory = memoryCache.get(key);

  if (inMemory) {
    return { ...inMemory, cached: true };
  }

  const shared = await getCachedValue(`search:v2:${key}`, kv);

  if (shared) {
    try {
      const entry = JSON.parse(shared) as SharedEntry;
      const age = Date.now() - entry.at;

      if (age < ttl * 1000) {
        memoryCache.set(key, entry.data);
        return { ...entry.data, cached: true };
      }

      // Datos antiguos: se sirven igual y se refrescan en segundo plano.
      memoryCache.set(key, entry.data);
      void refreshInBackground(query, key, kv, ttl);
      return { ...entry.data, cached: true };
    } catch {
      // Entrada corrupta: se ignora y se vuelve a consultar.
    }
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = runSearch(query).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);

  const response = await promise;
  memoryCache.set(key, response);

  await setCachedValue(
    `search:v2:${key}`,
    JSON.stringify({ at: Date.now(), data: response } satisfies SharedEntry),
    ttl * STALE_FACTOR,
    kv
  );

  return response;
}

async function refreshInBackground(
  query: string,
  key: string,
  kv: ReturnType<typeof readKvConfig>,
  ttl: number
): Promise<void> {
  try {
    const response = await runSearch(query);
    memoryCache.set(key, response);
    await setCachedValue(
      `search:v2:${key}`,
      JSON.stringify({ at: Date.now(), data: response } satisfies SharedEntry),
      ttl * STALE_FACTOR,
      kv
    );
  } catch {
    // Si falla el refresco se conserva el dato antiguo.
  }
}

async function runSearch(query: string): Promise<SearchResponse> {
  const started = Date.now();
  const results = await Promise.all(
    ADAPTERS.map((adapter) => runAdapter(adapter, query))
  );

  return {
    query,
    cached: false,
    tookMs: Date.now() - started,
    bestPrice: findBestPrice(results),
    results
  };
}

async function runAdapter(
  adapter: StoreAdapter,
  query: string
): Promise<StoreResult> {
  const started = Date.now();
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const products = await adapter.search(query, controller.signal);
    const ranked = rankProducts(query, products, 5);

    return {
      store: adapter.id,
      name: adapter.name,
      shortName: adapter.shortName,
      color: adapter.color,
      status: ranked.length > 0 ? 'ok' : 'empty',
      fetchedAt,
      tookMs: Date.now() - started,
      products: ranked
    };
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error(`[${adapter.id}]`, error);
    }

    return {
      store: adapter.id,
      name: adapter.name,
      shortName: adapter.shortName,
      color: adapter.color,
      status: 'error',
      fetchedAt,
      tookMs: Date.now() - started,
      products: [],
      error: buildErrorMessage(error, controller.signal.aborted)
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildErrorMessage(error: unknown, aborted: boolean): string {
  if (error instanceof BotProtectionError) {
    return 'La tienda bloquea el acceso automático (protección anti-bot). Prueba más tarde.';
  }

  if (aborted) {
    return 'La tienda tardó demasiado en responder.';
  }

  if (error instanceof HttpError && error.status >= 500) {
    return 'La tienda está teniendo problemas ahora mismo. Inténtalo en unos minutos.';
  }

  return 'No se pudo conectar con la tienda en este momento.';
}

function findBestPrice(results: StoreResult[]): BestPrice | null {
  let best: BestPrice | null = null;

  for (const result of results) {
    const product = result.products[0];
    if (!product) {
      continue;
    }

    if (!best || product.price < best.price) {
      best = {
        store: result.store,
        storeName: result.name,
        price: product.price
      };
    }
  }

  return best;
}
