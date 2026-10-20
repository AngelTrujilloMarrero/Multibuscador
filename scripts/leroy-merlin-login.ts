import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const PROFILE_DIR = path.join(PROJECT_ROOT, '.chrome-leroy');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

function findChrome(): string {
  const chrome = CHROME_PATHS.find((candidate) => existsSync(candidate));

  if (!chrome) {
    throw new Error('No se encuentra Chrome en este equipo.');
  }

  return chrome;
}

async function main(): Promise<void> {
  mkdirSync(PROFILE_DIR, { recursive: true });

  console.log('Se abre Chrome con el perfil de Multibuscador.');
  console.log(
    'Completa la verificación de Leroy Merlin (si aparece) y deja el navegador abierto unos segundos.'
  );
  console.log('Luego ejecuta: pnpm leroy:sync "teclado"');
  console.log(`Perfil: ${PROFILE_DIR}`);

  const chrome = spawn();

  chrome.on('exit', () => {
    console.log('Perfil validado. Ya puedes sincronizar con pnpm leroy:sync.');
    process.exit(0);
  });
}

function spawn(): ReturnType<typeof execFileAsync> {
  return execFileAsync(
    findChrome(),
    [
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      'https://www.leroymerlin.es/'
    ],
    { timeout: 0 }
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
