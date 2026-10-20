import type { Product } from '../../shared/types.js';
import { fetchText, WafChallengeError } from '../lib/http.js';
import { extractJsonObjectAfter } from '../lib/json.js';
import { absoluteUrl, dedupeProducts, parsePrice } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://www.compraonline.alcampo.es';
const CHALLENGE_COOLDOWN_MS = 5 * 60 * 1000;
const CHALLENGE_MARKERS = [
  'awsWafCookieDomainList',
  'Human Verification',
  'challenge-container'
];

let blockedUntil = 0;

export function isAlcampoChallenge(html: string): boolean {
  return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
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

export const alcampoAdapter: StoreAdapter = {
  id: 'alcampo',
  name: 'Alcampo',
  shortName: 'A',
  color: '#e30613',
  async search(query, signal) {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;

    if (Date.now() < blockedUntil) {
      throw new WafChallengeError(url);
    }

    try {
      const html = await fetchText(url, signal);

      if (isAlcampoChallenge(html)) {
        throw new WafChallengeError(url);
      }

      return parseAlcampo(html);
    } catch (error) {
      if (error instanceof WafChallengeError) {
        blockedUntil = Date.now() + CHALLENGE_COOLDOWN_MS;
      }

      throw error;
    }
  }
};
