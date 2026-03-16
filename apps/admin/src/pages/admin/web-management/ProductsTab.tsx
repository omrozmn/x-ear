import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SiteWorkspace } from '@/lib/website-generator-client';

export interface ProductsTabProps {
    workspace: SiteWorkspace | null;
    newProductName: string;
    setNewProductName: (v: string) => void;
    newProductSku: string;
    setNewProductSku: (v: string) => void;
    newProductPrice: string;
    setNewProductPrice: (v: string) => void;
    isBusy: (key: string) => boolean;
    handleAddProduct: () => void;
    handleDeleteProduct: (productSku: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
    workspace,
    newProductName,
    setNewProductName,
    newProductSku,
    setNewProductSku,
    newProductPrice,
    setNewProductPrice,
    isBusy,
    handleAddProduct,
    handleDeleteProduct,
}) => {
    return (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Katalog Ayarlari</h3>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div>Gorunum modu: {workspace?.site.product_catalog_settings?.display_mode ?? '-'}</div>
                    <div>One cikan SKU sayisi: {workspace?.site.product_catalog_settings?.featured_skus.length ?? 0}</div>
                </div>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Urunler</h3>
                <div className="mt-4 space-y-3">
                    {(workspace?.site.products ?? []).length > 0 ? (
                        workspace?.site.products?.map((product) => (
                            <div key={product.sku} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="mt-1 text-xs text-gray-500">{product.sku} - {product.price} {product.currency}</div>
                                    </div>
                                    <button onClick={() => handleDeleteProduct(product.sku)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                        <Trash2 className="inline h-3 w-3" /> Sil
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Katalog aktif ama henuz urun eklenmemis.</div>
                    )}
                </div>
                <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Yeni Urun Ekle</div>
                    <div className="mt-3 grid gap-2">
                        <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Urun adi" />
                        <input value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="SKU (bos birakilirsa otomatik)" />
                        <input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Fiyat (TRY)" />
                        <button onClick={handleAddProduct} disabled={!newProductName.trim() || isBusy('add-product')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                            <Plus className="mr-1 inline h-4 w-4" />{isBusy('add-product') ? 'Ekleniyor...' : 'Urun Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
