// Minimal TypeScript declarations for XEar backbone
export interface InventoryItemCanonical {
  id: string | null;
  name: string;
  brand: string;
  category: string | undefined;
  availableInventory: number;
  totalInventory: number;
  usedInventory: number;
  price: number;
  availableSerials: string[];
  raw?: any;
}

export interface DeviceCanonical {
  id: string | null;
  brand: string;
  model: string;
  serialNumber?: string | null;
  type: string;
  category?: string;
  price?: number;
  raw?: any;
}

export interface XEarApi {
  getDevices(opts?: { inventory_only?: boolean; category?: string }): Promise<{ success: boolean; devices: InventoryItemCanonical[]; raw: any }>;
}

declare const XEar: {
  CategoryNormalizer: {
    toCanonical(category: string | undefined): string | undefined;
    isHearingAid(category: string | undefined): boolean;
    labelFor(category: string | undefined): string;
  };
  Api: XEarApi;
  PricingHelper(listPrice: number, quantity: number, sgkScheme: any, discountType?: string, discountValue?: number): any;
  EventBus: { on(event: string, fn: Function): void; off(event: string, fn: Function): void; emit(event: string, ...args: any[]): void };
  setBaseUrl(url: string): void;
  DEFAULT_SGK_SCHEMES: any;
};

export default XEar;

// Also available at window.XEar for legacy pages
declare global {
  interface Window { XEar: typeof XEar; }
}
