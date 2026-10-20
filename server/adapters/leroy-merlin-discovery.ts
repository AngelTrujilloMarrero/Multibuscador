import { tokenize } from '../lib/matching.js';
import { getCachedValue, readKvConfig, setCachedValue } from '../lib/kv.js';
import { loadSitemapUrls } from '../lib/sitemap.js';
import { normalizeText } from '../lib/text.js';

const BASE_URL = 'https://www.leroymerlin.es';
const SEARCHDEX_URLS = [
  `${BASE_URL}/sitemap-searchdex1.xml`,
  `${BASE_URL}/sitemap-searchdex2.xml`
];
const MAX_FAMILY_PAGES = 2;
const DISCOVERY_TTL_SECONDS = 86_400;

function slugOf(url: string): string {
  const last = url.split('/').pop() ?? '';
  return last.replace(/\.html$/, '').replace(/-p$/, '');
}

export function scoreSlug(slug: string, queryTokens: string[]): number {
  const words = normalizeText(slug.replace(/-/g, ' ')).split(' ');
  const hits = queryTokens.filter((token) =>
    words.some((word) => word === token || word.startsWith(token))
  ).length;

  return queryTokens.length === 0 ? 0 : hits / queryTokens.length;
}

function rankFamilyUrls(
  locations: string[],
  queryTokens: string[],
  limit: number
): string[] {
  const scored = locations
    .map((url) => ({ url, score: scoreSlug(slugOf(url), queryTokens) }))
    .filter((entry) => entry.score >= 0.75)
    .sort((left, right) => right.score - left.score);

  const unique: string[] = [];

  for (const entry of scored) {
    if (unique.length >= limit) {
      break;
    }

    if (!unique.includes(entry.url)) {
      unique.push(entry.url);
    }
  }

  return unique;
}

/**
 * Localiza la familia de productos de Leroy Merlin que coincide con la
 * búsqueda usando los sitemaps públicos. El resultado se cachea (memoria y
 * caché compartida) para no volver a descargar los sitemaps en cada petición.
 */
export async function findFamilyUrls(
  query: string,
  fetcher: (url: string) => Promise<string>
): Promise<string[]> {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  const kv = readKvConfig();
  const cacheKey = `lm:familias:${normalizeText(query)}`;
  const cached = await getCachedValue(cacheKey, kv);

  if (cached) {
    try {
      return JSON.parse(cached) as string[];
    } catch {
      // Entrada corrupta: se vuelve a calcular.
    }
  }

  for (const sitemapUrl of SEARCHDEX_URLS) {
    const locations = await loadSitemapUrls(sitemapUrl, fetcher);
    const matches = rankFamilyUrls(locations, queryTokens, MAX_FAMILY_PAGES);

    if (matches.length > 0) {
      await setCachedValue(
        cacheKey,
        JSON.stringify(matches),
        DISCOVERY_TTL_SECONDS,
        kv
      );
      return matches;
    }
  }

  return [];
}
