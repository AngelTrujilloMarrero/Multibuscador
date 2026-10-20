import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 300;
const SKIP_DIRECTORIES = new Set([
  '.git',
  '.vite',
  '.chrome-leroy',
  '.chrome-sync',
  'coverage',
  'dist',
  'dist-server',
  'node_modules'
]);
const CHECKED_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml'
]);
const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml']);

const offenders = [];
let checked = 0;

function relativePath(absolutePath) {
  return path.relative(ROOT, absolutePath).split(path.sep).join('/');
}

function shouldSkip(absolutePath) {
  const relative = relativePath(absolutePath);

  if (relative === 'server/__fixtures__' || relative.startsWith('server/__fixtures__/')) {
    return true;
  }

  return false;
}

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name) || shouldSkip(absolutePath)) {
        continue;
      }
      visit(absolutePath);
      continue;
    }

    if (!entry.isFile() || SKIP_FILES.has(entry.name) || shouldSkip(absolutePath)) {
      continue;
    }

    if (!CHECKED_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    if (statSync(absolutePath).size === 0) {
      continue;
    }

    const content = readFileSync(absolutePath, 'utf8');
    const lines = content.split('\n').length;
    checked += 1;

    if (lines > LIMIT) {
      offenders.push({ file: relativePath(absolutePath), lines });
    }
  }
}

visit(ROOT);

if (offenders.length > 0) {
  console.error(`Archivos escritos a mano que superan ${LIMIT} líneas:`);
  for (const offender of offenders) {
    console.error(`  - ${offender.file}: ${offender.lines} líneas`);
  }
  process.exitCode = 1;
} else {
  console.log(`OK: ${checked} archivos revisados, todos con ${LIMIT} líneas o menos.`);
}
