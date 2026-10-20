import * as cheerio from 'cheerio';
import type { Product } from '../../shared/types.js';
import { absoluteUrl, dedupeProducts, parsePrice } from '../lib/text.js';

export function parsePrestaShopProducts(
  html: string,
  baseUrl: string
): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('article.product-miniature, .js-product-miniature').each((_index, element) => {
    const card = $(element);
    const titleLink = card.find('.product-title a').first();
    const imageLink = card.find('a.product-thumbnail').first();
    const title = titleLink.text().trim();
    const href = titleLink.attr('href') ?? imageLink.attr('href');
    const priceElement = card.find('.product-price').first();
    const price = parsePrice(priceElement.attr('content')) ?? parsePrice(priceElement.text());
    const rawImage =
      card.find('img[data-full-size-image-url]').first().attr('data-full-size-image-url') ??
      card.find('img').first().attr('data-src') ??
      card.find('img').first().attr('src');

    if (!title || !href || price === null) {
      return;
    }

    const imageUrl =
      rawImage && !rawImage.startsWith('data:')
        ? absoluteUrl(rawImage, baseUrl)
        : null;

    products.push({
      title,
      price,
      currency: 'EUR',
      imageUrl,
      productUrl: absoluteUrl(href, baseUrl)
    });
  });

  return dedupeProducts(products);
}
