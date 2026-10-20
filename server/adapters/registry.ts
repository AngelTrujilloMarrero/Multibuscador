import { appInformaticaAdapter } from './app-informatica.js';
import { elFaroAdapter } from './el-faro.js';
import { laloAdapter } from './lalo.js';
import { mediaMarktAdapter } from './mediamarkt.js';
import { nalberAdapter } from './nalber.js';
import type { StoreAdapter } from './types.js';

export const ADAPTERS: StoreAdapter[] = [
  mediaMarktAdapter,
  nalberAdapter,
  elFaroAdapter,
  laloAdapter,
  appInformaticaAdapter
];
