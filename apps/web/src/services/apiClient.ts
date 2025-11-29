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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  // Prefer global in-memory token, then new key, then legacy key
  let token: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      token = window.__AUTH_TOKEN__ || localStorage.getItem('x-ear.auth.token@v1') || localStorage.getItem('auth_token');
    }
  } catch (e) {
    token = null;
  }
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...opts,
    headers,
  });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
  return res.json();
}

export const apiClient = {
  async getInventoryItems(): Promise<InventoryItem[]> {
    // In real app wrap orval client calls here
    return fetchJson<InventoryItem[]>('/inventory');
  },

  async get<T>(path: string): Promise<{ data: T }> {
    const data = await fetchJson<T>(path);
    return { data };
  },

  async post<T>(path: string, body: any): Promise<{ data: T }> {
    const data = await fetchJson<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data };
  },

  async put<T>(path: string, body: any): Promise<{ data: T }> {
    const data = await fetchJson<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { data };
  },

  async delete(path: string): Promise<{ data: any }> {
    const data = await fetchJson<any>(path, {
      method: 'DELETE',
    });
    return { data };
  },
};
