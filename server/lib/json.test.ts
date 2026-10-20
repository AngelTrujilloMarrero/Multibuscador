import { describe, expect, it } from 'vitest';
import { extractJsonObjectAfter } from './json';

describe('extractJsonObjectAfter', () => {
  it('extrae un objeto anidado con comillas escapadas', () => {
    const source =
      'window.state = {"productEntities":{"a":{"name":"Teclado \\"Pro\\"","nested":{"x":1}}}};';

    expect(extractJsonObjectAfter(source, '"productEntities":')).toEqual({
      a: {
        name: 'Teclado "Pro"',
        nested: { x: 1 }
      }
    });
  });

  it('devuelve null cuando no existe el marcador', () => {
    expect(extractJsonObjectAfter('{"a":1}', '"productEntities":')).toBeNull();
  });

  it('devuelve null si el JSON está cortado', () => {
    expect(
      extractJsonObjectAfter('"productEntities":{"a":{"name":"Teclado"', '"productEntities":')
    ).toBeNull();
  });
});
