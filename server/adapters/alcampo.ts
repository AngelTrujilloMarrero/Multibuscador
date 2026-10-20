import type { Product } from '../../shared/types.js';
import { fetchText, WafChallengeError } from '../lib/http.js';
import { getCachedValue, readKvConfig, setCachedValue } from '../lib/kv.js';
import { extractJsonObjectAfter } from '../lib/json.js';
import { absoluteUrl, dedupeProducts, normalizeText, parsePrice } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://www.compraonline.alcampo.es';
const CHALLENGE_COOLDOWN_MS = 5 * 60 * 1000;
const CHALLENGE_MARKERS = [
  'awsWafCookieDomainList',
  'Human Verification',
  'challenge-container'
];
const PROFILE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const PROFILE_KEY = 'alcampo:perfil';

interface HeaderProfile {
  'user-agent': string;
  accept: string;
  'accept-language': string;
  [key: string]: string;
}

const PROFILES: HeaderProfile[] = [
  {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'es-ES,es;q=0.9'
  },
  {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'es-ES,es;q=0.9'
  },
  {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'es-ES,es;q=0.9,en;q=0.6'
  },
  {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'es-ES,es;q=0.9'
  },
  {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'es-ES,es;q=0.9'
  }
];

let blockedUntil = 0;

export function isAlcampoChallenge(html: string): boolean {
  return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
}

export function readAlcampoProfile(
  env: Record<string, string | undefined> = process.env
): number | null {
  const raw = env.ALCAMPO_PROFILE?.trim();

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value >= 0 && value < PROFILES.length
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPrice(entity: Record<string, unknown>): number | null {
  if (!isRecord(entity.price) || !isRecord(entity.price.current)) {
    return null;
  }

  return parsePrice(entity.price.current.amount);
}

function readImage(entity: Record<string, unknown>): string | null {
  if (!isRecord(entity.image) || typeof entity.image.src !== 'string') {
    return null;
  }

  return absoluteUrl(entity.image.src, BASE_URL);
}

export function parseAlcampo(html: string): Product[] {
  const entities = extractJsonObjectAfter(html, '"productEntities":');

  if (!entities) {
    return [];
  }

  const links = new Map<string, string>();

  for (const match of html.matchAll(/href="(\/products\/[^"]+\/(\d+))"/g)) {
    const [, path, id] = match;

    if (path && id && !links.has(id)) {
      links.set(id, absoluteUrl(path, BASE_URL));
    }
  }

  const products: Product[] = [];

  for (const [key, value] of Object.entries(entities)) {
    if (!isRecord(value)) {
      continue;
    }

    const title = typeof value.name === 'string' ? value.name.trim() : '';
    const price = readPrice(value);
    const available = value.available !== false;
    const id = String(value.retailerProductId ?? key);

    if (!title || price === null || !available) {
      continue;
    }

    products.push({
      title,
      price,
      currency: 'EUR',
      imageUrl: readImage(value),
      productUrl: links.get(id) ?? `${BASE_URL}/search?q=${encodeURIComponent(title)}`
    });
  }

  return dedupeProducts(products);
}

async function tryProfiles(
  url: string,
  signal: AbortSignal
): Promise<string> {
  const kv = readKvConfig();
  const preferred = readAlcampoProfile();

  const order: number[] = [];

  if (preferred !== null) {
    order.push(preferred);
  }

  const cached = await getCachedValue(PROFILE_KEY, kv);

  if (cached !== null) {
    const index = Number(cached);

    if (Number.isInteger(index) && index >= 0 && index < PROFILES.length) {
      if (!order.includes(index)) {
        order.push(index);
      }
    }
  }

  for (let index = 0; index < PROFILES.length; index += 1) {
    if (!order.includes(index)) {
      order.push(index);
    }
  }

  for (const profileIndex of order) {
    const profile = PROFILES[profileIndex];

    try {
      const html = await fetchText(url, signal, 1, profile);

      if (!isAlcampoChallenge(html)) {
        await setCachedValue(PROFILE_KEY, String(profileIndex), PROFILE_CACHE_TTL_SECONDS, kv);
        return html;
      }
    } catch {
      // Se prueba la siguiente configuración.
    }
  }

  throw new WafChallengeError(url);
}

export const alcampoAdapter: StoreAdapter = {
  id: 'alcampo',
  name: 'Alcampo',
  shortName: 'A',
  color: '#e30613',
  async search(query, signal) {
    const key = `alcampo:productos:${normalizeText(query)}`;
    const kv = readKvConfig();

    const synced = await getCachedValue(key, kv);

    if (synced) {
      try {
        const products = JSON.parse(synced) as Product[];

        if (products.length > 0) {
          return products;
        }
      } catch {
        // Entrada corrupta: se sigue con la consulta directa.
      }
    }

    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;

    if (Date.now() < blockedUntil) {
      throw new WafChallengeError(url);
    }

    try {
      const html = await tryProfiles(url, signal);

      return parseAlcampo(html);
    } catch (error) {
      if (error instanceof WafChallengeError) {
        blockedUntil = Date.now() + CHALLENGE_COOLDOWN_MS;
      }

      throw error;
    }
  }
};
