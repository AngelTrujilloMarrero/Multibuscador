import * as cheerio from 'cheerio';
import type { Cheerio } from 'cheerio';
import type { Product, ProductAvailability } from '../../shared/types.js';
import { fetchText, XML_HEADERS, BotProtectionError } from '../lib/http.js';
import { fetchWithChrome } from '../lib/browser.js';
import { getCachedValue, readKvConfig } from '../lib/kv.js';
import { absoluteUrl, dedupeProducts, normalizeText, parsePrice } from '../lib/text.js';
import { findFamilyUrls } from './leroy-merlin-discovery.js';
import type { StoreAdapter } from './types.js';

export { findFamilyUrls, scoreSlug } from './leroy-merlin-discovery.js';

const BASE_URL = 'https://www.leroymerlin.es';
const MAX_PRODUCT_PAGES = 3;

export const STORE_NAME = 'La Laguna';

function readImage(container: Cheerio<any>): string | null {
  const candidates = [
    container.find('img').first().attr('data-src'),
    container.find('img').first().attr('data-original'),
    container.find('img').first().attr('src'),
    container.find('source').first().attr('srcset'),
    container.find('img').first().attr('srcset')
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate.startsWith('data:')) {
      continue;
    }

    const url = candidate.split(',')[0]?.split(' ')[0]?.trim();

    if (url) {
      return url;
    }
  }

  return null;
}

export function parseAvailability(
  scope: Cheerio<any>,
  storeName: string
): ProductAvailability | null {
  if (!scope || scope.length === 0) {
    return null;
  }

  const text = scope.text().replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  const badgeClass = scope.find('.stock-status_badge').first().attr('class') ?? '';

  let inStock: boolean | null = null;

  if (/sin stock|agotado|no disponible|sin disponibilidad/.test(lower)) {
    inStock = false;
  } else if (badgeClass.includes('--green')) {
    inStock = true;
  } else if (badgeClass.includes('--red') || badgeClass.includes('--orange')) {
    inStock = false;
  }

  const mentionsStore = lower.includes(storeName.toLowerCase());

  return {
    store: storeName,
    inStock: mentionsStore ? inStock : null,
    text: mentionsStore ? text.slice(0, 160) : undefined
  };
}

const AVAILABILITY_SELECTOR =
  '.o-availabilities, [data-cerberus="ELEM_stocks"], .stock-status_text';

function readProductTitle($: cheerio.CheerioAPI): string {
  const heading = $('h1[data-cerberus="ELEM_h1"]').first().text().trim();

  if (heading) {
    return heading;
  }

  const ogTitle = $('meta[property="og:title"]').attr('content') ?? '';
  return ogTitle.replace(/\s*\|\s*Leroy Merlin\s*$/i, '').trim();
}

function readProductPrice($: cheerio.CheerioAPI): number | null {
  const prices = $('p.m-price.-main').toArray();
  const main = prices.find((element) => {
    const classes = $(element).attr('class') ?? '';
    return !classes.includes('-light');
  });

  if (main) {
    const price = parsePrice($(main).find('.m-price__line').first().text());
    if (price !== null) {
      return price;
    }
  }

  return parsePrice($('[data-cerberus="ELEM_PRIX"]').first().text());
}

export function parseLeroyMerlinProduct(
  html: string,
  productUrl: string
): Product | null {
  const $ = cheerio.load(html);
  const title = readProductTitle($);
  const price = readProductPrice($);
  const image = $('meta[property="og:image"]').attr('content') ?? null;

  if (!title || price === null) {
    return null;
  }

  return {
    title,
    price,
    currency: 'EUR',
    imageUrl: image ? absoluteUrl(image, BASE_URL) : null,
    productUrl: absoluteUrl(productUrl, BASE_URL),
    availability: parseAvailability(
      $(AVAILABILITY_SELECTOR).first(),
      STORE_NAME
    )
  };
}

export function parseLeroyMerlinListings(html: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  $('[data-cerberus="ELEM_PRIX"]').each((_index, element) => {
    const priceElement = $(element);
    const price = parsePrice(priceElement.text());

    if (price === null) {
      return;
    }

    const container = priceElement.closest(
      'article, li, .o-tile, .m-tile, [class*="tile"], [class*="product"]'
    );

    const link = container.find('a[href*="/productos/"]').first();
    const href = link.attr('href');

    if (!href) {
      return;
    }

    const title =
      link.find('h2, h3, h4, [class*="title"]').first().text().trim() ||
      link.attr('title')?.trim() ||
      link.text().trim();

    if (!title) {
      return;
    }

    const image = readImage(container);

    products.push({
      title: title.replace(/\s+/g, ' ').trim(),
      price,
      currency: 'EUR',
      imageUrl: image ? absoluteUrl(image, BASE_URL) : null,
      productUrl: absoluteUrl(href, BASE_URL),
      availability: parseAvailability(
        container.find(AVAILABILITY_SELECTOR).first().length > 0
          ? container.find(AVAILABILITY_SELECTOR).first()
          : container,
        STORE_NAME
      )
    });
  });

  return dedupeProducts(products).slice(0, 30);
}

async function enrichWithProductPage(
  product: Product,
  signal: AbortSignal
): Promise<Product> {
  try {
    const html = await fetchWithChrome(product.productUrl, signal);

    if (html.includes('datadome') || html.includes('cmsg')) {
      return product;
    }

    const detailed = parseLeroyMerlinProduct(html, product.productUrl);
    return detailed ?? product;
  } catch {
    try {
      const html = await fetchText(product.productUrl, signal);
      const detailed = parseLeroyMerlinProduct(html, product.productUrl);
      return detailed ?? product;
    } catch {
      return product;
    }
  }
}

export const leroyMerlinAdapter: StoreAdapter = {
  id: 'leroy-merlin',
  name: 'Leroy Merlin',
  shortName: 'LM',
  color: '#78be20',
  async search(query, signal) {
    // Resultado recogido en casa con un navegador real (scripts/leroy-merlin-sync).
    const synced = await getCachedValue(
      `lm:productos:${normalizeText(query)}`,
      readKvConfig()
    );

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

    const familyUrls = await findFamilyUrls(query, (url) =>
      fetchText(url, signal, 2, XML_HEADERS)
    );

    if (familyUrls.length === 0) {
      return [];
    }

    let blocked = false;

    const pages = await Promise.all(
      familyUrls.map(async (url) => {
        try {
          const html = await fetchWithChrome(url, signal);

          if (html.includes('datadome') || html.includes('cmsg')) {
            blocked = true;
            return [];
          }

          return parseLeroyMerlinListings(html);
        } catch (error) {
          if (error instanceof BotProtectionError) {
            blocked = true;
            return [];
          }

          if (String(error).includes('Chrome no disponible')) {
            try {
              const html = await fetchText(url, signal);
              return parseLeroyMerlinListings(html);
            } catch (fetchError) {
              if (fetchError instanceof BotProtectionError) {
                blocked = true;
              }

              return [];
            }
          }

          return [];
        }
      })
    );

    const listings = dedupeProducts(pages.flat()).slice(0, MAX_PRODUCT_PAGES);

    if (blocked && listings.length === 0) {
      throw new BotProtectionError(403, familyUrls[0] ?? BASE_URL);
    }

    return Promise.all(
      listings.map((product) => enrichWithProductPage(product, signal))
    );
  }
};
