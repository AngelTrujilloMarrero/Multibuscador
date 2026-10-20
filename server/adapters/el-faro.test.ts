import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseElFaro } from './el-faro';

const html = readFileSync(
  new URL('../__fixtures__/el-faro.html', import.meta.url),
  'utf8'
);

describe('parseElFaro', () => {
  it('extrae productos y fuerza enlaces HTTPS', () => {
    const products = parseElFaro(html);

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual({
      title: 'TECLADO USB NEGRO',
      price: 18,
      currency: 'EUR',
      imageUrl:
        'https://electronicaelfaro.com/image/cache/catalog/teclado.jpg',
      productUrl: 'https://electronicaelfaro.com/teclado-usb'
    });
  });

  it('devuelve una lista vacía sin resultados', () => {
    expect(parseElFaro('<html><body>No hay productos</body></html>')).toEqual(
      []
    );
  });
});
