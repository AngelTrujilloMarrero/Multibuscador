export type StoreId =
  | 'alcampo'
  | 'mediamarkt'
  | 'nalber'
  | 'el-faro'
  | 'lalo'
  | 'app-informatica';

export interface Product {
  title: string;
  price: number;
  currency: 'EUR';
  imageUrl: string | null;
  productUrl: string;
  category?: string | null;
}

export type StoreStatus = 'ok' | 'empty' | 'error';

export interface StoreResult {
  store: StoreId;
  name: string;
  shortName: string;
  color: string;
  status: StoreStatus;
  fetchedAt: string;
  tookMs: number;
  products: Product[];
  error?: string;
}

export interface BestPrice {
  store: StoreId;
  storeName: string;
  price: number;
}

export interface SearchResponse {
  query: string;
  cached: boolean;
  tookMs: number;
  bestPrice: BestPrice | null;
  results: StoreResult[];
}
