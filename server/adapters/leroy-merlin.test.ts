import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  findFamilyUrls,
  parseLeroyMerlinListings,
  parseLeroyMerlinProduct,
  scoreSlug
} from './leroy-merlin';

const productHtml = readFileSync(
  new URL('../__fixtures__/leroy-merlin-product.html', import.meta.url),
  'utf8'
);
const listHtml = readFileSync(
  new URL('../__fixtures__/leroy-merlin-list.html', import.meta.url),
  'utf8'
);
const sitemap = readFileSync(
  new URL('../__fixtures__/leroy-merlin-sitemap.xml', import.meta.url),
  'utf8'
);

describe('parseLeroyMerlinProduct', () => {
  it('extrae título, precio principal, imagen y stock de La Laguna', () => {
    const product = parseLeroyMerlinProduct(
      productHtml,
      'https://www.leroymerlin.es/productos/01-grifo-bide-86360337.html'
    );

    expect(product?.title).toBe('01 GRIFO BIDÉ');
    expect(product?.price).toBe(15.34);
    expect(product?.imageUrl).toBe(
      'https://media.adeo.com/mkp/da32adfd4abd6dc30d66b97163f56c7e/media.png'
    );
    expect(product?.availability).toEqual({
      store: 'La Laguna',
      inStock: true,
      text: expect.stringContaining('La Laguna')
    });
  });
});

describe('parseLeroyMerlinListings', () => {
  it('extrae los productos del listado con precio y enlace', () => {
    const products = parseLeroyMerlinListings(listHtml);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      title: 'Teclado Logitech K120',
      price: 13.5,
      productUrl:
        'https://www.leroymerlin.es/productos/teclado-logitech-k120-86360338.html',
      imageUrl: 'https://media.adeo.com/mkp/teclado-k120/media.png'
    });
  });

  it('distingue el stock disponible del agotado en La Laguna', () => {
    const products = parseLeroyMerlinListings(listHtml);

    expect(products[0]?.availability?.inStock).toBe(true);
    expect(products[1]?.availability?.inStock).toBe(false);
  });
});

describe('scoreSlug', () => {
  it('valora la coincidencia de términos con el slug', () => {
    expect(scoreSlug('teclados-y-raton-logitech', ['teclado'])).toBe(1);
    expect(scoreSlug('teclados-y-raton-logitech', ['lavadora'])).toBe(0);
  });
});

describe('findFamilyUrls', () => {
  it('localiza la familia de páginas que coincide con la búsqueda', async () => {
    const urls = await findFamilyUrls('teclado', async () => sitemap);

    expect(urls).toEqual([
      'https://www.leroymerlin.es/productos/teclados-y-raton-logitech-p.html'
    ]);
  });

  it('no devuelve nada cuando no hay coincidencias', async () => {
    expect(await findFamilyUrls('lavadora', async () => sitemap)).toEqual([]);
  });
});
