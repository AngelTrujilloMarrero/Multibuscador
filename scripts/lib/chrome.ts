import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

export const PROFILE_DIR = path.join(
  path.resolve(import.meta.dirname, '..', '..'),
  '.chrome-sync'
);

export function findChrome(): string {
  const chrome = CHROME_PATHS.find((candidate) => existsSync(candidate));

  if (!chrome) {
    throw new Error('No se encuentra Chrome en este equipo.');
  }

  return chrome;
}

export async function fetchWithChrome(url: string): Promise<string> {
  mkdirSync(PROFILE_DIR, { recursive: true });

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
