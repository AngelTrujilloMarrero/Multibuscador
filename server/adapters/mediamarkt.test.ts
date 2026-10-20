import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMediaMarktCanarias } from './mediamarkt';

const data: unknown = JSON.parse(
  readFileSync(
    new URL('../__fixtures__/mediamarkt-canarias.json', import.meta.url),
    'utf8'
  )
);

describe('parseMediaMarktCanarias', () => {
  it('extrae título, precio, imagen y enlace de la búsqueda de Shopify', () => {
    const products = parseMediaMarktCanarias(data);

    expect(products).toHaveLength(2);
    expect(products[0]).toEqual({
      title: 'Teclado - Logitech K120, USB, Ultrafino, Patas ajustables',
      price: 13.5,
      currency: 'EUR',
      imageUrl:
        'https://cdn.shopify.com/s/files/1/0285/3702/8668/products/k120.jpg',
      productUrl:
        'https://canarias.mediamarkt.es/products/teclado-logitech-k120-usb-ultrafino'
    });
  });

  it('acepta la imagen como cadena y descarta productos agotados', () => {
    const products = parseMediaMarktCanarias(data);
    const pack = products.find((item) => item.title.includes('MK250'));

    expect(pack?.imageUrl).toBe(
      'https://cdn.shopify.com/s/files/1/0285/3702/8668/products/mk250.jpg'
    );
    expect(
      products.some((item) => item.title.includes('K70 CORE'))
    ).toBe(false);
  });

  it('tolera respuestas sin resultados', () => {
    expect(parseMediaMarktCanarias({ resources: { results: {} } })).toEqual([]);
    expect(parseMediaMarktCanarias(null)).toEqual([]);
  });
});
