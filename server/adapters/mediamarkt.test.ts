import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMediaMarkt } from './mediamarkt';

const html = readFileSync(
  new URL('../__fixtures__/mediamarkt.html', import.meta.url),
  'utf8'
);

describe('parseMediaMarkt', () => {
  it('extrae el ItemList de JSON-LD', () => {
    const products = parseMediaMarkt(html);

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual({
      title: 'Teclado Logitech K120',
      price: 12.99,
      currency: 'EUR',
      imageUrl: 'https://www.mediamarkt.es/media/teclado.jpg',
      productUrl:
        'https://www.mediamarkt.es/es/product/_teclado-logitech-k120.html'
    });
  });

  it('tolera páginas sin JSON-LD de productos', () => {
    expect(parseMediaMarkt('<html><body>Sin resultados</body></html>')).toEqual(
      []
    );
  });
});
