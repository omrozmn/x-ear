// Minimal Orval wrapper / api client adapter
// Keep this file small: only basic fetch wrapper and example method used by Inventory

export type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
};

const BASE = '/api'; // assume API proxy

async function fetchJson<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
  return res.json();
}

export const apiClient = {
  async getInventoryItems(): Promise<InventoryItem[]> {
    // In real app wrap orval client calls here
    return fetchJson<InventoryItem[]>('/inventory');
  },
};
