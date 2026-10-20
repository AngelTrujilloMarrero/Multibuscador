import * as cheerio from 'cheerio';
import type { Product } from '../../shared/types.js';
import { fetchText } from '../lib/http.js';
import { absoluteUrl, dedupeProducts, ensureHttps, parsePrice } from '../lib/text.js';
import type { StoreAdapter } from './types.js';

const BASE_URL = 'https://electronicaelfaro.com';

export function parseElFaro(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('.product-thumb').each((_index, element) => {
    const card = $(element);
    const link = card.find('.titoloprod-cat a').first();
    const title = link.text().trim();
    const href = link.attr('href');
    const image = card.find('.image img').first().attr('src');
    const price = parsePrice(card.find('.prezzo_tasti_cat .price').first().text());

    if (!title || !href || price === null) {
      return;
    }

    products.push({
      title,
      price,
      currency: 'EUR',
      imageUrl: image ? ensureHttps(absoluteUrl(image, BASE_URL)) : null,
      productUrl: ensureHttps(absoluteUrl(href, BASE_URL))
    });
  });

  return dedupeProducts(products);
}

export const elFaroAdapter: StoreAdapter = {
  id: 'el-faro',
  name: 'El Faro Electrónica',
  shortName: 'EF',
  color: '#189ada',
  async search(query, signal) {
    const url = `${BASE_URL}/index.php?route=product/search&search=${encodeURIComponent(query)}`;
    return parseElFaro(await fetchText(url, signal));
  }
};
