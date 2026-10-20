import type { Product } from '../../shared/types.js';
import { dedupeProducts, normalizeText } from './text.js';

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'y',
  'o',
  'con',
  'para',
  'por',
  'en',
  'al',
  'a',
  'the',
  'and',
  'with',
  'for'
]);

const ACCESSORY_WORDS = new Set([
  'funda',
  'carcasa',
  'protector',
  'cargador',
  'cable',
  'adaptador',
  'soporte',
  'mochila',
  'estuche',
  'bolsa',
  'correa',
  'tapa',
  'repuesto',
  'modulo',
  'matricial',
  'membrana',
  'arduino',
  'numerico',
  'numpad',
  'keypad',
  'botonera'
]);

const ACCESSORY_CONTEXT_WORDS = [
  'accesorio',
  'accesorios',
  'almohadilla',
  'almohadillas',
  'compatible',
  'forro',
  'limpieza',
  'limpiador',
  'limpiar',
  'recambio',
  'repuestos'
];

const CATEGORY_ACCESSORY_WORDS = new Set([
  'accesorio',
  'accesorios',
  'funda',
  'fundas',
  'carcasa',
  'carcasas',
  'protector',
  'protectores',
  'case',
  'cover',
  'estuche',
  'mochila'
]);

const COMPONENT_PATTERN =
  /\b(?:4x4|numpad|keypad|matricial|membrana|arduino|modulo|numerico|botonera)\b|\b(?:4|8|12|16|20|24)\s+teclas\b/;

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function scoreTitle(
  queryNorm: string,
  queryTokens: string[],
  product: Product
): number {
  const titleNorm = normalizeText(product.title);
  const titleTokenList = tokenize(product.title);
  const titleTokens = new Set(titleTokenList);
  const categoryNorm = normalizeText(product.category ?? '');

  let hits = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token) || (token.length >= 4 && titleNorm.includes(token))) {
      hits += 1;
    }
  }

  if (hits === 0) {
    return 0;
  }

  let score = hits / queryTokens.length;

  if (titleNorm.includes(queryNorm)) {
    score += 0.1;
  }

  if (titleNorm.startsWith(queryNorm)) {
    score += 0.05;
  }

  const titleHasAccessory =
    COMPONENT_PATTERN.test(titleNorm) ||
    (titleTokenList.length > 0 && ACCESSORY_WORDS.has(titleTokenList[0])) ||
    ACCESSORY_CONTEXT_WORDS.some((word) => titleTokens.has(word));
  const categoryHasAccessory = [...CATEGORY_ACCESSORY_WORDS].some((word) =>
    categoryNorm.includes(word)
  );
  const queryHasAccessory =
    [...ACCESSORY_WORDS].some((word) => queryTokens.includes(word)) ||
    [...CATEGORY_ACCESSORY_WORDS].some((word) => queryTokens.includes(word));

  if ((titleHasAccessory || categoryHasAccessory) && !queryHasAccessory) {
    score -= 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

export function rankProducts(
  query: string,
  products: Product[],
  limit = 5
): Product[] {
  const queryNorm = normalizeText(query);
  const queryTokens = tokenize(query);

  if (!queryNorm || queryTokens.length === 0) {
    return [];
  }

  const minimumScore = 0.7;

  return dedupeProducts(products)
    .map((product) => ({
      product,
      score: scoreTitle(queryNorm, queryTokens, product)
    }))
    .filter((entry) => entry.score >= minimumScore)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.product.price - right.product.price;
    })
    .slice(0, limit)
    .map((entry) => entry.product);
}
