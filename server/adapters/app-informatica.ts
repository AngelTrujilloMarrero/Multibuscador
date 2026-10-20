import type { Product } from '../../shared/types.js';
import { fetchJson } from '../lib/http.js';
import { dedupeProducts, ensureHttps } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const API_URL =
  'https://appinformatica.vtexcommercestable.com.br/api/catalog_system/pub/products/search';
const BASE_URL = 'https://www.appinformatica.com';

interface VtexOffer {
  Price?: number;
  IsAvailable?: boolean;
}

interface VtexSeller {
  commertialOffer?: VtexOffer;
}

interface VtexImage {
  imageUrl?: string;
}

interface VtexItem {
  images?: VtexImage[];
  sellers?: VtexSeller[];
}

interface VtexProduct {
  productName?: string;
  link?: string;
  categories?: string[];
  items?: VtexItem[];
}

export function parseAppInformatica(data: unknown): Product[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const products: Product[] = [];

  for (const raw of data) {
    const product = raw as VtexProduct;
    const title = typeof product.productName === 'string' ? product.productName.trim() : '';
    const rawLink = typeof product.link === 'string' ? product.link : '';

    if (!title || !rawLink) {
      continue;
    }

    const offers: Array<{ price: number; image: string | null }> = [];

    for (const item of product.items ?? []) {
      const image = item.images?.[0]?.imageUrl ?? null;

      for (const seller of item.sellers ?? []) {
        const offer = seller.commertialOffer;
        if (
          offer?.IsAvailable &&
          typeof offer.Price === 'number' &&
          offer.Price > 0
        ) {
          offers.push({ price: offer.Price, image });
        }
      }
    }

    const best = offers.sort((left, right) => left.price - right.price)[0];
    if (!best) {
      continue;
    }

    const productUrl = ensureHttps(
      rawLink.replace(
        'https://appinformatica.vtexcommercestable.com.br',
        BASE_URL
      )
    );

    products.push({
      title,
      price: best.price,
      currency: 'EUR',
      imageUrl: best.image ? ensureHttps(best.image) : null,
      productUrl,
      category: product.categories?.[0] ?? null
    });
  }

  return dedupeProducts(products);
}

export const appInformaticaAdapter: StoreAdapter = {
  id: 'app-informatica',
  name: 'App Informática',
  shortName: 'APP',
  color: '#007d82',
  async search(query, signal) {
    const url = `${API_URL}?ft=${encodeURIComponent(query)}&_from=0&_to=29`;
    return parseAppInformatica(await fetchJson<unknown>(url, signal));
  }
};
