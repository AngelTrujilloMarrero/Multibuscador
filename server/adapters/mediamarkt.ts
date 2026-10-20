import type { Product } from '../../shared/types.js';
import { fetchJson } from '../lib/http.js';
import { absoluteUrl, dedupeProducts, parsePrice } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://canarias.mediamarkt.es';
const SEARCH_URL = `${BASE_URL}/search/suggest.json`;
const RESULT_LIMIT = 20;

interface ShopifyImage {
  url?: string;
  src?: string;
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  url?: string;
  price?: string | number;
  price_min?: number;
  available?: boolean;
  featured_image?: string | ShopifyImage | null;
  image?: string | ShopifyImage | null;
}

function readImage(
  value: string | ShopifyImage | null | undefined
): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return value.url ?? value.src ?? null;
  }

  return null;
}

function cleanUrl(url: string | undefined, handle: string | undefined): string {
  if (url) {
    return absoluteUrl(url.split('?')[0], BASE_URL);
  }

  if (handle) {
    return `${BASE_URL}/products/${handle}`;
  }

  return '';
}

export function parseMediaMarktCanarias(data: unknown): Product[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const results = (data as { resources?: { results?: { products?: unknown } } })
    .resources?.results?.products;

  if (!Array.isArray(results)) {
    return [];
  }

  const products: Product[] = [];

  for (const raw of results) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const item = raw as ShopifyProduct;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const price = parsePrice(item.price ?? item.price_min);
    const productUrl = cleanUrl(item.url, item.handle);

    if (!title || price === null || !productUrl || item.available === false) {
      continue;
    }

    const image = readImage(item.featured_image) ?? readImage(item.image);

    products.push({
      title,
      price,
      currency: 'EUR',
      imageUrl: image ? absoluteUrl(image, BASE_URL) : null,
      productUrl
    });
  }

  return dedupeProducts(products);
}

export const mediaMarktAdapter: StoreAdapter = {
  id: 'mediamarkt',
  name: 'MediaMarkt Canarias',
  shortName: 'MM',
  color: '#c8102e',
  async search(query, signal) {
    const params = new URLSearchParams({
      q: query,
      'resources[type]': 'product',
      'resources[limit]': String(RESULT_LIMIT)
    });

    const data = await fetchJson<unknown>(
      `${SEARCH_URL}?${params.toString()}`,
      signal
    );

    return parseMediaMarktCanarias(data);
  }
};
