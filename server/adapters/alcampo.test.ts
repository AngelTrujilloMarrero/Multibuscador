import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAlcampoChallenge, parseAlcampo } from './alcampo';

const html = readFileSync(
  new URL('../__fixtures__/alcampo.html', import.meta.url),
  'utf8'
);

describe('parseAlcampo', () => {
  it('extrae entidades disponibles y resuelve el enlace del producto', () => {
    const products = parseAlcampo(html);

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual({
      title: 'Teclado Logitech K120',
      price: 12.9,
      currency: 'EUR',
      imageUrl: 'https://www.compraonline.alcampo.es/images/teclado.jpg',
      productUrl:
        'https://www.compraonline.alcampo.es/products/teclado-logitech-k120/123456'
    });
  });

  it('devuelve una lista vacía si no hay estado de productos', () => {
    expect(parseAlcampo('<html><body>Sin datos</body></html>')).toEqual([]);
  });

  it('detecta la página de verificación humana de AWS WAF', () => {
    const challenge = `
      <html><head><title>Human Verification</title></head>
      <body><div id="challenge-container"></div>
      <script>window.awsWafCookieDomainList = [];</script></body></html>
    `;

    expect(isAlcampoChallenge(challenge)).toBe(true);
    expect(isAlcampoChallenge(html)).toBe(false);
  });
});
