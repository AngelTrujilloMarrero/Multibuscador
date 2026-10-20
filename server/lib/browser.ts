import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROFILE_DIR = path.resolve(process.cwd(), '.chrome-sync');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

export function findChrome(): string | null {
  return CHROME_PATHS.find((candidate) => existsSync(candidate)) ?? null;
}

export async function fetchWithChrome(
  url: string,
  signal?: AbortSignal
): Promise<string> {
  const chrome = findChrome();

  if (!chrome) {
    throw new Error('Chrome no disponible');
  }

  mkdirSync(PROFILE_DIR, { recursive: true });

  if (signal?.aborted) {
    throw new Error('Solicitud cancelada');
  }

  const { stdout } = await execFileAsync(
    chrome,
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
    { maxBuffer: 96 * 1024 * 1024, timeout: 25000 }
  );

  return stdout;
}