export interface MarketplaceFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'category-picker';
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
}

export interface MarketplaceConfig {
  name: string;
  logo: string;
  maxImages: number;
  maxVideos: number;
  minImageSize: { w: number; h: number };
  imageFormats: string[];
  fields: MarketplaceFieldConfig[];
}

export const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  trendyol: {
    name: 'Trendyol',
    logo: '/logos/trendyol.svg',
    maxImages: 8,
    maxVideos: 1,
    minImageSize: { w: 800, h: 800 },
    imageFormats: ['jpg', 'png'],
    fields: [
      { key: 'title', label: 'Ürün Adı', type: 'text', required: true, maxLength: 255 },
      { key: 'description', label: 'Açıklama', type: 'textarea', required: true },
      { key: 'barcode', label: 'Barkod', type: 'text', required: true },
      { key: 'brand', label: 'Marka', type: 'text', required: true },
      { key: 'categoryId', label: 'Kategori', type: 'category-picker', required: true },
      { key: 'listPrice', label: 'Liste Fiyatı', type: 'number', required: true },
      { key: 'salePrice', label: 'Satış Fiyatı', type: 'number', required: true },
      { key: 'stockCode', label: 'Stok Kodu', type: 'text', required: true },
      { key: 'quantity', label: 'Stok Adedi', type: 'number', required: true },
      { key: 'cargoCompanyId', label: 'Kargo Firması', type: 'select', required: true, options: [
        { value: '10', label: 'Yurtiçi Kargo' },
        { value: '14', label: 'Aras Kargo' },
        { value: '17', label: 'MNG Kargo' },
        { value: '19', label: 'Sürat Kargo' },
        { value: '30', label: 'PTT Kargo' },
      ]},
      { key: 'deliveryDays', label: 'Teslimat Süresi (Gün)', type: 'number' },
      { key: 'vatRate', label: 'KDV Oranı (%)', type: 'number', required: true },
    ],
  },
  hepsiburada: {
    name: 'Hepsiburada',
    logo: '/logos/hepsiburada.svg',
    maxImages: 8,
    maxVideos: 0,
    minImageSize: { w: 500, h: 500 },
    imageFormats: ['jpg', 'png'],
    fields: [
      { key: 'title', label: 'Ürün Adı', type: 'text', required: true, maxLength: 255 },
      { key: 'description', label: 'Açıklama', type: 'textarea', required: true },
      { key: 'barcode', label: 'Barkod (GTIN)', type: 'text', required: true },
      { key: 'brand', label: 'Marka', type: 'text', required: true },
      { key: 'categoryId', label: 'Kategori', type: 'category-picker', required: true },
      { key: 'price', label: 'Satış Fiyatı', type: 'number', required: true },
      { key: 'listPrice', label: 'Piyasa Fiyatı', type: 'number' },
      { key: 'stockCode', label: 'Stok Kodu (SKU)', type: 'text', required: true },
      { key: 'quantity', label: 'Stok Adedi', type: 'number', required: true },
      { key: 'vatRate', label: 'KDV Oranı (%)', type: 'number', required: true },
    ],
  },
  n11: {
    name: 'N11',
    logo: '/logos/n11.svg',
    maxImages: 8,
    maxVideos: 0,
    minImageSize: { w: 400, h: 400 },
    imageFormats: ['jpg', 'png'],
    fields: [
      { key: 'title', label: 'Ürün Adı', type: 'text', required: true, maxLength: 255 },
      { key: 'description', label: 'Açıklama', type: 'textarea', required: true },
      { key: 'barcode', label: 'Barkod', type: 'text' },
      { key: 'brand', label: 'Marka', type: 'text', required: true },
      { key: 'categoryId', label: 'Kategori', type: 'category-picker', required: true },
      { key: 'price', label: 'Satış Fiyatı', type: 'number', required: true },
      { key: 'listPrice', label: 'Liste Fiyatı', type: 'number' },
      { key: 'stockCode', label: 'Stok Kodu', type: 'text', required: true },
      { key: 'quantity', label: 'Stok Adedi', type: 'number', required: true },
    ],
  },
  amazon: {
    name: 'Amazon',
    logo: '/logos/amazon.svg',
    maxImages: 9,
    maxVideos: 1,
    minImageSize: { w: 1000, h: 1000 },
    imageFormats: ['jpg', 'png', 'tiff'],
    fields: [
      { key: 'title', label: 'Product Title', type: 'text', required: true, maxLength: 200 },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'bulletPoints', label: 'Bullet Points', type: 'textarea' },
      { key: 'barcode', label: 'EAN / UPC', type: 'text', required: true },
      { key: 'brand', label: 'Brand', type: 'text', required: true },
      { key: 'categoryId', label: 'Category', type: 'category-picker', required: true },
      { key: 'price', label: 'Price', type: 'number', required: true },
      { key: 'sku', label: 'SKU', type: 'text', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    ],
  },
  ciceksepeti: {
    name: 'Çiçeksepeti',
    logo: '/logos/ciceksepeti.svg',
    maxImages: 8,
    maxVideos: 0,
    minImageSize: { w: 500, h: 500 },
    imageFormats: ['jpg', 'png'],
    fields: [
      { key: 'title', label: 'Ürün Adı', type: 'text', required: true, maxLength: 255 },
      { key: 'description', label: 'Açıklama', type: 'textarea', required: true },
      { key: 'barcode', label: 'Barkod', type: 'text', required: true },
      { key: 'brand', label: 'Marka', type: 'text', required: true },
      { key: 'categoryId', label: 'Kategori', type: 'category-picker', required: true },
      { key: 'price', label: 'Satış Fiyatı', type: 'number', required: true },
      { key: 'stockCode', label: 'Stok Kodu', type: 'text', required: true },
      { key: 'quantity', label: 'Stok Adedi', type: 'number', required: true },
      { key: 'deliveryType', label: 'Teslimat Tipi', type: 'select', required: true, options: [
        { value: 'cargo', label: 'Kargo' },
        { value: 'express', label: 'Hızlı Teslimat' },
      ]},
    ],
  },
};

export const CARGO_PROVIDERS = [
  { id: 'yurtici', name: 'Yurtiçi Kargo', logo: '/logos/yurtici-kargo.svg' },
  { id: 'aras', name: 'Aras Kargo', logo: '/logos/aras-kargo.svg' },
  { id: 'mng', name: 'MNG Kargo', logo: '/logos/mng-kargo.svg' },
  { id: 'surat', name: 'Sürat Kargo', logo: '/logos/surat-kargo.svg' },
  { id: 'ptt', name: 'PTT Kargo', logo: '/logos/ptt-kargo.svg' },
];
