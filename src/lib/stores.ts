import type { StoreId } from '../../shared/types';

export type SortMode = 'price' | 'store';

export interface StoreMeta {
  id: StoreId;
  name: string;
  shortName: string;
  color: string;
}

export const STORE_ORDER: StoreId[] = [
  'alcampo',
  'mediamarkt',
  'nalber',
  'el-faro',
  'lalo',
  'app-informatica',
  'leroy-merlin'
];

export const STORE_META: Record<StoreId, StoreMeta> = {
  alcampo: { id: 'alcampo', name: 'Alcampo', shortName: 'A', color: '#e30613' },
  mediamarkt: {
    id: 'mediamarkt',
    name: 'MediaMarkt Canarias',
    shortName: 'MM',
    color: '#c8102e'
  },
  nalber: { id: 'nalber', name: 'Nalber', shortName: 'N', color: '#3bad4c' },
  'el-faro': {
    id: 'el-faro',
    name: 'El Faro Electrónica',
    shortName: 'EF',
    color: '#189ada'
  },
  lalo: {
    id: 'lalo',
    name: 'Lalo Electrónica',
    shortName: 'L',
    color: '#0b5fa5'
  },
  'app-informatica': {
    id: 'app-informatica',
    name: 'App Informática',
    shortName: 'APP',
    color: '#007d82'
  },
  'leroy-merlin': {
    id: 'leroy-merlin',
    name: 'Leroy Merlin',
    shortName: 'LM',
    color: '#78be20'
  }
};

export const EXAMPLES = [
  'iPhone 15',
  'teclado Logitech',
  'lavadora',
  'monitor 24',
  'auriculares'
];
