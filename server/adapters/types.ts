import type { Product, StoreId } from '../../shared/types.js';

export interface StoreAdapter {
  id: StoreId;
  name: string;
  shortName: string;
  color: string;
  search(query: string, signal: AbortSignal): Promise<Product[]>;
}
