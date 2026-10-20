import type { Product } from '../../shared/types.js';
import { fetchText } from '../lib/http.js';
import { parsePrestaShopProducts } from './prestashop.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://nalber.com';

export function parseNalber(html: string): Product[] {
  return parsePrestaShopProducts(html, BASE_URL);
}

export const nalberAdapter: StoreAdapter = {
  id: 'nalber',
  name: 'Nalber',
  shortName: 'N',
  color: '#3bad4c',
  async search(query, signal) {
    const url = `${BASE_URL}/module/iqitsearch/searchiqit?s=${encodeURIComponent(query)}`;
    return parseNalber(await fetchText(url, signal));
  }
};
