const SITEMAP_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  urls: string[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function parseSitemapLocations(xml: string): string[] {
  const locations: string[] = [];

  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const url = match[1];

    if (url) {
      locations.push(url);
    }
  }

  return locations;
}

export async function loadSitemapUrls(
  url: string,
  fetcher: (target: string) => Promise<string>
): Promise<string[]> {
  const cached = cache.get(url);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.urls;
  }

  const urls = parseSitemapLocations(await fetcher(url));

  cache.set(url, { urls, expiresAt: Date.now() + SITEMAP_TTL_MS });
  return urls;
}

export function clearSitemapCache(): void {
  cache.clear();
}
