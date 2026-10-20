import type {
  BestPrice,
  SearchResponse,
  StoreResult
} from '../../shared/types.js';
import { ADAPTERS } from '../adapters/registry.js';
import type { StoreAdapter } from '../adapters/types.js';
import { TtlCache } from '../lib/cache.js';
import { BotProtectionError, WafChallengeError } from '../lib/http.js';
import { rankProducts } from '../lib/matching.js';
import { normalizeText } from '../lib/text.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

const cache = new TtlCache<string, SearchResponse>(CACHE_TTL_MS, 100);
const inFlight = new Map<string, Promise<SearchResponse>>();

export async function searchAll(query: string): Promise<SearchResponse> {
  const key = normalizeText(query);
  const cached = cache.get(key);

  if (cached) {
    return { ...cached, cached: true };
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = runSearch(query).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);

  const response = await promise;
  cache.set(key, response);
  return response;
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
  if (error instanceof WafChallengeError) {
    return 'La tienda pide verificación humana (protección anti-bot). Espera unos minutos y vuelve a intentarlo.';
  }

  if (error instanceof BotProtectionError) {
    return 'La tienda bloquea el acceso automático (protección anti-bot). Prueba más tarde.';
  }

  if (aborted) {
    return 'La tienda tardó demasiado en responder.';
  }

  return 'No se pudo consultar la tienda en este momento.';
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
