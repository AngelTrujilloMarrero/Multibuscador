import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAppInformatica } from './app-informatica';

const data: unknown = JSON.parse(
  readFileSync(
    new URL('../__fixtures__/app-informatica.json', import.meta.url),
    'utf8'
  )
);

describe('parseAppInformatica', () => {
  it('elige la oferta disponible más barata y reescribe el enlace', () => {
    const products = parseAppInformatica(data);

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual({
      title: 'Teclado Logitech K120',
      price: 12.99,
      currency: 'EUR',
      imageUrl: 'https://pcbox.vteximg.com.br/arquivos/ids/1/teclado.jpg',
      productUrl: 'https://www.appinformatica.com/teclado-logitech-k120/p',
      category: '/Periféricos/Teclados/'
    });
  });

  it('ignora productos sin ofertas disponibles', () => {
    const products = parseAppInformatica([
      {
        productName: 'Sin stock',
        link: 'https://appinformatica.vtexcommercestable.com.br/sin-stock/p',
        items: [
          { sellers: [{ commertialOffer: { Price: 5, IsAvailable: false } }] }
        ]
      }
    ]);

    expect(products).toEqual([]);
  });

  it('tolera respuestas que no son arrays', () => {
    expect(parseAppInformatica({ error: 'boom' })).toEqual([]);
  });
});
