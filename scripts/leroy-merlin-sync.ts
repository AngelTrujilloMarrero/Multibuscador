import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Product } from '../shared/types.js';
import { parseLeroyMerlinListings, parseLeroyMerlinProduct } from '../server/adapters/leroy-merlin.js';
import { findFamilyUrls } from '../server/adapters/leroy-merlin-discovery.js';
import { readKvConfig, setCachedValue } from '../server/lib/kv.js';
import { normalizeText } from '../server/lib/text.js';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const PROFILE_DIR = path.join(PROJECT_ROOT, '.chrome-sync');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

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

function findChrome(): string {
  const chrome = CHROME_PATHS.find((candidate) => existsSync(candidate));

  if (!chrome) {
    throw new Error(
      'No se encuentra Chrome. Instálalo o cambia CHROME_PATH en el script.'
    );
  }

  return chrome;
}

async function fetchWithChrome(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${PROFILE_DIR}`,
      '--virtual-time-budget=20000',
      '--dump-dom',
      url
    ],
    { maxBuffer: 96 * 1024 * 1024, timeout: 90_000 }
  );

  return stdout;
}

async function collectProducts(query: string): Promise<Product[]> {
  const familyUrls = await findFamilyUrls(query, async (url) => {
    const response = await fetch(url);
    return response.text();
  });

  if (familyUrls.length === 0) {
    return [];
  }

  const listings: Product[] = [];

  for (const familyUrl of familyUrls) {
    try {
      listings.push(...parseLeroyMerlinListings(await fetchWithChrome(familyUrl)));
    } catch (error) {
      console.warn(`[sync] no se pudo leer ${familyUrl}: ${String(error)}`);
    }
  }

  const products: Product[] = [];

  for (const listing of listings.slice(0, 5)) {
    try {
      const detail = parseLeroyMerlinProduct(
        await fetchWithChrome(listing.productUrl),
        listing.productUrl
      );

      products.push(detail ?? listing);
    } catch (error) {
      console.warn(`[sync] no se pudo leer ${listing.productUrl}`);
      products.push(listing);
    }
  }

  return products;
}

async function main(): Promise<void> {
  loadEnvFile();
  mkdirSync(PROFILE_DIR, { recursive: true });

  const query = process.argv[2];

  if (!query) {
    console.error('Uso: pnpm leroy:sync "teclado"');
    process.exit(1);
  }

  const products = await collectProducts(query);

  if (products.length === 0) {
    console.error(
      'Sin resultados. Si es la primera vez, valida el perfil con: pnpm leroy:login'
    );
    process.exit(1);
  }

  const kv = readKvConfig();

  if (!kv) {
    console.error(
      'Faltan las variables del KV (KV_REST_API_URL y KV_REST_API_TOKEN).'
    );
    process.exit(1);
  }

  await setCachedValue(
    `lm:productos:${normalizeText(query)}`,
    JSON.stringify(products),
    86_400,
    kv
  );

  console.log(
    `Guardados ${products.length} productos de Leroy Merlin para "${query}":`
  );

  for (const product of products) {
    console.log(
      `  ${product.price} € · ${product.title} · ${
        product.availability?.inStock === true
          ? 'En stock en La Laguna'
          : product.availability?.inStock === false
            ? 'Sin stock en La Laguna'
            : 'Stock no disponible'
      }`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
