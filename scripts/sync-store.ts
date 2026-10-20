import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '../shared/types.js';
import { parseAlcampo } from '../server/adapters/alcampo.js';
import { findFamilyUrls } from '../server/adapters/leroy-merlin-discovery.js';
import {
  parseLeroyMerlinListings,
  parseLeroyMerlinProduct
} from '../server/adapters/leroy-merlin.js';
import { getCachedValue, readKvConfig, setCachedValue } from '../server/lib/kv.js';
import { normalizeText } from '../server/lib/text.js';
import { fetchWithChrome } from './lib/chrome.js';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

function loadEnvFile(): void {
  const envPath = path.join(PROJECT_ROOT, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function collectAlcampo(query: string): Promise<Product[]> {
  const html = await fetchWithChrome(
    `https://www.compraonline.alcampo.es/search?q=${encodeURIComponent(query)}`
  );

  if (html.includes('productEntities')) {
    return parseAlcampo(html);
  }

  throw new Error('Alcampo devolvió la página de verificación (completa el perfil con pnpm sync:login)');
}

async function collectLeroyMerlin(query: string): Promise<Product[]> {
  const familyUrls = await findFamilyUrls(query, async (url) => {
    const response = await fetch(url);
    return response.text();
  });

  if (familyUrls.length === 0) {
    return [];
  }

  const listings: Product[] = [];

  for (const familyUrl of familyUrls) {
    listings.push(...parseLeroyMerlinListings(await fetchWithChrome(familyUrl)));
  }

  const products: Product[] = [];

  for (const listing of listings.slice(0, 5)) {
    try {
      const detail = parseLeroyMerlinProduct(
        await fetchWithChrome(listing.productUrl),
        listing.productUrl
      );

      products.push(detail ?? listing);
    } catch {
      products.push(listing);
    }
  }

  return products;
}

async function main(): Promise<void> {
  loadEnvFile();
  mkdirSync(path.join(PROJECT_ROOT, '.chrome-sync'), { recursive: true });

  const store = process.argv[2];
  const query = process.argv.slice(3).join(' ');

  if (!store || !query) {
    console.error('Uso: pnpm sync <alcampo|leroy-merlin> "teclado"');
    process.exit(1);
  }

  const products =
    store === 'alcampo'
      ? await collectAlcampo(query)
      : await collectLeroyMerlin(query);

  if (products.length === 0) {
    console.error('Sin resultados. Si es la primera vez, valida el perfil con: pnpm sync:login');
    process.exit(1);
  }

  const kv = readKvConfig();

  if (!kv) {
    console.error('Faltan las variables del KV (KV_REST_API_URL y KV_REST_API_TOKEN).');
    process.exit(1);
  }

  const key = store === 'alcampo' ? `alcampo:productos:${normalizeText(query)}` : `lm:productos:${normalizeText(query)}`;

  await setCachedValue(key, JSON.stringify(products), 86_400, kv);

  console.log(`Guardados ${products.length} productos de ${store} para "${query}":`);

  for (const product of products) {
    console.log(`  ${product.price} € · ${product.title.slice(0, 60)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
