import { describe, expect, it } from 'vitest';
import { dedupeProducts, normalizeText, parsePrice } from './text';
import type { Product } from '../../shared/types';

describe('parsePrice', () => {
  it('parsea precios con coma decimal', () => {
    expect(parsePrice('18,00€')).toBe(18);
    expect(parsePrice('12,5 €')).toBe(12.5);
  });

  it('parsea precios con separador de miles', () => {
    expect(parsePrice('1.234,56 €')).toBe(1234.56);
  });

  it('parsea precios con punto decimal', () => {
    expect(parsePrice('29.99')).toBe(29.99);
    expect(parsePrice(12.5)).toBe(12.5);
  });

  it('toma el primer precio de una cadena con varios importes', () => {
    expect(parsePrice('18,00€ más envío 5.90€')).toBe(18);
  });

  it('rechaza valores vacíos o no numéricos', () => {
    expect(parsePrice('gratis')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(0)).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});

describe('normalizeText', () => {
  it('quita acentos, mayúsculas y signos', () => {
    expect(normalizeText('Ratón Inalámbrico ¡Oferta!')).toBe(
      'raton inalambrico oferta'
    );
  });
});

describe('dedupeProducts', () => {
  it('elimina duplicados por URL', () => {
    const base: Product = {
      title: 'Teclado',
      price: 10,
      currency: 'EUR',
      imageUrl: null,
      productUrl: 'https://example.com/teclado'
    };

    expect(dedupeProducts([base, { ...base }])).toHaveLength(1);
  });
});
