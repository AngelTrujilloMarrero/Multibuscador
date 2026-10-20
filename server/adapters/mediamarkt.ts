import * as cheerio from 'cheerio';
import type { Product } from '../../shared/types.js';
import { fetchText } from '../lib/http.js';
import { absoluteUrl, dedupeProducts, parsePrice } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://www.mediamarkt.es';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractImage(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return extractImage(value[0]);
  }

  if (isRecord(value) && typeof value.url === 'string') {
    return value.url;
  }

  return null;
}

function toProduct(value: unknown): Product | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value['@type'];
  const isProduct =
    type === 'Product' || (Array.isArray(type) && type.includes('Product'));

  if (!isProduct) {
    return null;
  }

  const title = typeof value.name === 'string' ? value.name.trim() : '';
  const url = typeof value.url === 'string' ? absoluteUrl(value.url, BASE_URL) : '';
  const image = extractImage(value.image);
  const offers = Array.isArray(value.offers) ? value.offers[0] : value.offers;
  const price = isRecord(offers) ? parsePrice(offers.price) : null;

  if (!title || !url || price === null) {
    return null;
  }

  return {
    title,
    price,
    currency: 'EUR',
    imageUrl: image ? absoluteUrl(image, BASE_URL) : null,
    productUrl: url
  };
}

function collectProducts(node: unknown, output: Product[]): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectProducts(child, output);
    }
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  if (node['@type'] === 'ItemList' && Array.isArray(node.itemListElement)) {
    for (const element of node.itemListElement) {
      const item = isRecord(element) && isRecord(element.item) ? element.item : element;
      const product = toProduct(item);
      if (product) {
        output.push(product);
      }
    }
  }

  if (node['@graph']) {
    collectProducts(node['@graph'], output);
  }
}

export function parseMediaMarkt(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('script[type="application/ld+json"]').each((_index, element) => {
    const raw = $(element).text().trim();
    if (!raw) {
      return;
    }

    try {
      collectProducts(JSON.parse(raw), products);
    } catch {
      // Algunos bloques JSON-LD pueden venir incompletos.
    }
  });

  return dedupeProducts(products);
}

export const mediaMarktAdapter: StoreAdapter = {
  id: 'mediamarkt',
  name: 'MediaMarkt',
  shortName: 'MM',
  color: '#c8102e',
  async search(query, signal) {
    const url = `${BASE_URL}/es/search.html?query=${encodeURIComponent(query)}`;
    return parseMediaMarkt(await fetchText(url, signal));
  }
};
