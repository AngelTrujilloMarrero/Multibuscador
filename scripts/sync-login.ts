import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findChrome, PROFILE_DIR } from './lib/chrome.js';

async function main(): Promise<void> {
  mkdirSync(PROFILE_DIR, { recursive: true });

  console.log('Se abre Chrome con el perfil de Multibuscador.');
  console.log('Si Leroy Merlin o Alcampo piden verificación, complétala.');
  console.log('Luego cierra el navegador y ejecuta: pnpm sync:alcampo "teclado"');
  console.log(`Perfil: ${PROFILE_DIR}`);

  const child = execFile(findChrome(), [
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://www.leroymerlin.es/'
  ]);

  child.on('exit', () => {
    console.log('Perfil validado. Ya puedes sincronizar con pnpm sync:alcampo o sync:leroy.');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
