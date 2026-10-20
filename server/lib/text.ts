import type { Product } from '../../shared/types.js';

const PRICE_PATTERN = /-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|-?\d+(?:[.,]\d{1,2})?/;

export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.replace(/\s/g, '').match(PRICE_PATTERN);
  if (!match) {
    return null;
  }

  let raw = match[0];
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  if (lastComma > lastDot) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (lastComma !== -1 && lastDot === -1) {
    raw = raw.replace(',', '.');
  } else if (lastDot !== -1 && lastComma === -1) {
    const decimals = raw.split('.')[1];
    if (decimals?.length === 3 && raw.length > 4) {
      raw = raw.replace('.', '');
    }
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

export function ensureHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = product.productUrl || normalizeText(product.title);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
