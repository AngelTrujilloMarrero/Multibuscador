import { describe, expect, it } from 'vitest';
import type { Product } from '../../shared/types';
import { rankProducts, tokenize } from './matching';

function product(title: string, price = 10): Product {
  return {
    title,
    price,
    currency: 'EUR',
    imageUrl: null,
    productUrl: `https://example.com/${encodeURIComponent(title)}`
  };
}

describe('tokenize', () => {
  it('elimina palabras vacías y normaliza', () => {
    expect(tokenize('Teclado con cable USB')).toEqual([
      'teclado',
      'cable',
      'usb'
    ]);
  });
});

describe('rankProducts', () => {
  it('encuentra productos ignorando acentos', () => {
    const ranked = rankProducts('raton', [product('Ratón inalámbrico')]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Ratón inalámbrico');
  });

  it('penaliza accesorios cuando la búsqueda no los pide', () => {
    const ranked = rankProducts('iPhone 15', [
      product('Funda iPhone 15 silicona', 9),
      product('Apple iPhone 15 128 GB', 799)
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Apple iPhone 15 128 GB');
  });

  it('penaliza accesorios por categoría aunque el título no lo diga', () => {
    const caseProduct: Product = {
      ...product('iPhone 15 Woven Case', 67),
      category: '/Smartphones, Telefonía y Wearables/Accesorios teléfonos móviles/'
    };

    const ranked = rankProducts('iPhone 15', [
      caseProduct,
      product('Apple iPhone 15 128 GB', 799)
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Apple iPhone 15 128 GB');
  });

  it('penaliza componentes electrónicos en búsquedas genéricas', () => {
    const ranked = rankProducts('teclado', [
      product('Módulo teclado matricial para Arduino', 2),
      product('Teclado Logitech K120', 15)
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Teclado Logitech K120');
  });

  it('no penaliza atributos como el cable de un teclado', () => {
    const ranked = rankProducts('teclado USB', [
      product('Teclado USB con cable', 10)
    ]);

    expect(ranked).toHaveLength(1);
  });

  it('penaliza accesorios que encabezan el título', () => {
    const ranked = rankProducts('monitor 24', [
      product('Cable monitor DVI-I dual link 2m', 9),
      product('Monitor 24 pulgadas Full HD', 120)
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Monitor 24 pulgadas Full HD');
  });

  it('penaliza kits de limpieza y similares', () => {
    const ranked = rankProducts('auriculares', [
      product('Kit de limpieza auriculares 3 en 1 Nedis', 4),
      product('Auriculares Bluetooth Sony', 80)
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Auriculares Bluetooth Sony');
  });

  it('descarta productos que no comparten términos', () => {
    expect(rankProducts('lavadora', [product('Teclado Logitech')])).toEqual([]);
  });

  it('limita el número de resultados', () => {
    const products = [
      product('Teclado uno'),
      product('Teclado dos'),
      product('Teclado tres')
    ];

    expect(rankProducts('teclado', products, 2)).toHaveLength(2);
  });

  it('ordena por relevancia y después por precio', () => {
    const ranked = rankProducts('teclado logitech', [
      product('Teclado Logitech K120', 20),
      product('Teclado Logitech K120 USB', 12),
      product('Teclado genérico', 5)
    ]);

    expect(ranked.map((item) => item.price)).toEqual([12, 20]);
  });
});
