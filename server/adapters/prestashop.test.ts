import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLalo } from './lalo';
import { parseNalber } from './nalber';
import { parsePrestaShopProducts } from './prestashop';

const html = readFileSync(
  new URL('../__fixtures__/prestashop.html', import.meta.url),
  'utf8'
);

describe('parsePrestaShopProducts', () => {
  it('extrae título, precio, imagen y enlace', () => {
    const products = parsePrestaShopProducts(html, 'https://nalber.com');

    expect(products).toHaveLength(2);
    expect(products[0]).toEqual({
      title: 'Teclado Logitech K120',
      price: 12.5,
      currency: 'EUR',
      imageUrl: 'https://cdn.example.com/1.jpg',
      productUrl: 'https://nalber.com/producto-1.html'
    });
  });

  it('funciona con las bases de Nalber y Lalo', () => {
    expect(parseNalber(html)[0]?.productUrl).toBe(
      'https://nalber.com/producto-1.html'
    );
    expect(parseLalo(html)[0]?.productUrl).toBe(
      'https://laloelectronica.com/producto-1.html'
    );
  });

  it('ignora tarjetas sin precio', () => {
    const incomplete = `
      <article class="product-miniature">
        <h2 class="product-title"><a href="/sin-precio">Sin precio</a></h2>
      </article>
    `;

    expect(parsePrestaShopProducts(incomplete, 'https://nalber.com')).toEqual([]);
  });
});
