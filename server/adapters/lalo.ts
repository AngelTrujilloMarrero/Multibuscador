import type { Product } from '../../shared/types.js';
import { fetchText } from '../lib/http.js';
import { parsePrestaShopProducts } from './prestashop.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://laloelectronica.com';

export function parseLalo(html: string): Product[] {
  return parsePrestaShopProducts(html, BASE_URL);
}

export const laloAdapter: StoreAdapter = {
  id: 'lalo',
  name: 'Lalo Electrónica',
  shortName: 'L',
  color: '#0b5fa5',
  async search(query, signal) {
    const url = `${BASE_URL}/busqueda?s=${encodeURIComponent(query)}`;
    return parseLalo(await fetchText(url, signal));
  }
};
