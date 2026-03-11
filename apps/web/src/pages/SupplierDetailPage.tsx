import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge, Loading, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Globe, Edit, Trash2, PackagePlus, FileText, X, Check, CheckCircle2 } from 'lucide-react';
import { useSupplier, useDeleteSupplier, useUpdateSupplier, useSupplierProducts, type SupplierFormData } from '../hooks/useSuppliers';
import { useSupplierInvoiceItems, useAddToInventory, type SupplierInvoiceItem } from '../hooks/useSupplierInvoiceItems';
import { apiClient } from '@/api/orval-mutator';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierExtended } from '../components/suppliers/supplier-search.types';
import toast from 'react-hot-toast';

// Known hearing aid brands for auto-parsing product names
const KNOWN_BRANDS = [
  'Phonak', 'Signia', 'Oticon', 'ReSound', 'Resound', 'Widex', 'Starkey',
  'Unitron', 'Bernafon', 'Sonic', 'Hansaton', 'Rexton', 'Audio Service',
  'Audifon', 'Beltone', 'Interton', 'Philips', 'Siemens', 'GN',
  'Ear Teknik', 'Rayovac', 'Duracell', 'PowerOne', 'Power One',
  'Sonova', 'WS Audiology', 'Demant', 'GN Hearing',
];

function parseBrandModel(productName: string): { brand: string; model: string } {
  const trimmed = productName.trim();
  const lowerName = trimmed.toLowerCase();

  // Try matching known brands (longest match first)
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    if (lowerName.startsWith(brand.toLowerCase())) {
      const rest = trimmed.slice(brand.length).trim();
      // Remove leading dash/colon separators
      const model = rest.replace(/^[-:]\s*/, '').trim();
      return { brand, model: model || trimmed };
    }
  }

  // Fallback: first word = brand, rest = model
  const parts = trimmed.split(/\s+/);
  return {
    brand: parts[0] || trimmed,
    model: parts.length > 1 ? parts.slice(1).join(' ') : trimmed,
  };
}

export function SupplierDetailPage() {
  const { supplierId } = useParams({ strict: false }) as { supplierId: string };
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: supplier, isLoading, error } = useSupplier(supplierId);
  // Cast to Extended type to access extra fields if needed
  const supplierData = supplier as unknown as SupplierExtended;

  const { data: productsData, isLoading: productsLoading, error: productsError } = useSupplierProducts(supplierData?.companyName || supplierData?.name) as { data: unknown; isLoading: boolean; error: unknown };
  const deleteSupplierMutation = useDeleteSupplier();
  const updateSupplierMutation = useUpdateSupplier();

  const supplierName = supplierData?.companyName || supplierData?.name;

  // Fetch invoice items (products) for this supplier
  const { data: invoiceItemsData, isLoading: itemsLoading, error: itemsError } = useSupplierInvoiceItems(supplierName);
  const { addToInventory, isLoading: addingToInventory } = useAddToInventory(supplierName);

  // PDF modal state
  const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string } | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);

  // Inventory confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    item: SupplierInvoiceItem;
    brand: string;
    model: string;
  } | null>(null);
  const [addingItemId, setAddingItemId] = useState<number | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Set<number>>(new Set());

  // Pagination state for orders tab
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);

  const handleViewInvoicePdf = async (invoiceId: number, invoiceNumber: string) => {
    setInvoiceLoading(invoiceNumber);
    const toastId = toast.loading('Fatura yükleniyor...');
    try {
      const resp = await apiClient.get<ArrayBuffer>(
        `/api/invoices/${invoiceId}/document?format=pdf&render_mode=auto`,
        { responseType: 'arraybuffer' }
      );
      const contentType = (resp.headers?.['content-type'] as string) || 'application/pdf';
      const isPdf = contentType.includes('application/pdf');
      const blob = new Blob([resp.data], { type: isPdf ? 'application/pdf' : 'text/html' });
      const baseUrl = URL.createObjectURL(blob);
      const url = isPdf ? baseUrl + '#pagemode=none&toolbar=1' : baseUrl;
      if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
      setPdfModal({ open: true, blobUrl: url, title: invoiceNumber });
      toast.dismiss(toastId);
    } catch {
      toast.error('Fatura yüklenemedi', { id: toastId });
    } finally {
      setInvoiceLoading(null);
    }
  };

  const handleOpenAddModal = (item: SupplierInvoiceItem) => {
    const parsed = parseBrandModel(item.productName);
    setConfirmModal({ item, brand: parsed.brand, model: parsed.model });
  };

  const handleConfirmAdd = async () => {
    if (!confirmModal) return;
    setAddingItemId(confirmModal.item.id);
    const result = await addToInventory(confirmModal.item, confirmModal.brand, confirmModal.model);
    setAddingItemId(null);
    if (result) {
      setAddedItemIds(prev => new Set(prev).add(confirmModal.item.id));
      setConfirmModal(null);
    }
  };

  const handleBack = () => {
    navigate({ to: '/suppliers' });
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteSupplierMutation.mutateAsync(supplierId);
        navigate({ to: '/suppliers' });
      } catch (error) {
        console.error('Failed to delete supplier:', error);
      }
    }
  };

  const handleSave = async (data: SupplierFormData) => {
    try {
      await updateSupplierMutation.mutateAsync({
        supplierId,
        updates: data
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update supplier:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Tedarikçi bulunamadı</h2>
        <Button onClick={handleBack}>Geri Dön</Button>
      </div>
    );
  }

  // Cast to Extended type to access extra fields if needed


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tedarikçilere Dön
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{supplierData.companyName || supplierData.name}</h1>
              <div className="flex items-center mt-1 space-x-2">
                {supplierData.companyCode && (
                  <Badge variant="secondary">{supplierData.companyCode}</Badge>
                )}
                {supplierData.isActive ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h3>
            <div className="space-y-4">
              {supplierData.contactPerson && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.contactPerson}</span>
                </div>
              )}
              {supplierData.email && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <a href={`mailto:${supplierData.email}`} className="text-sm hover:text-blue-600">
                    {supplierData.email}
                  </a>
                </div>
              )}
              {supplierData.phone && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.phone}</span>
                </div>
              )}
              {supplierData.website && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <a href={supplierData.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-blue-600">
                    {supplierData.website}
                  </a>
                </div>
              )}
              {(supplierData.address || supplierData.city) && (
                <div className="flex items-start text-gray-600">
                  <div className="w-8 flex-shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="text-sm">
                    {[supplierData.address, supplierData.city, supplierData.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Finansal Bilgiler</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Vergi No</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.taxNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Vergi Dairesi</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.taxOffice || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Para Birimi</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.currency || 'TRY'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Ödeme Koşulları</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.paymentTerms || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
            <Tabs defaultValue="products" className="w-full">
              <div className="border-b border-gray-200 px-6">
                <TabsList className="bg-transparent border-b-0">
                  <TabsTrigger value="products" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Ürünler
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Siparişler
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Notlar
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="products">
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loading size="md" />
                    </div>
                  ) : productsError ? (
                    <div className="text-red-500 text-center py-8">Ürünler yüklenirken hata oluştu.</div>
                  ) : (() => {
                    const rawData = productsData as Record<string, unknown> | undefined;
                    const innerData = rawData?.data as Record<string, unknown> | undefined;
                    const products = (innerData?.products ?? innerData?.items ?? (Array.isArray(rawData?.data) ? rawData?.data : [])) as Array<Record<string, unknown>>;
                    if (!products || products.length === 0) {
                      return (
                        <div className="text-center py-12 text-gray-500">
                          <p>Bu tedarikçiye ait ürün bulunamadı.</p>
                        </div>
                      );
                    }
                    const supplierProductColumns: Column<Record<string, unknown>>[] = [
                      {
                        key: 'name',
                        title: 'Ürün Adı',
                        render: (_, item) => (
                          <span className="text-sm font-medium text-gray-900">
                            {(item.name as string) || (item.supplierProductName as string) || (item.supplier_product_name as string) || ((item.product as Record<string, unknown>)?.name as string) || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'code',
                        title: 'Kod',
                        render: (_, item) => (
                          <span className="text-sm text-gray-500">
                            {(item.stockCode as string) || (item.sku as string) || (item.supplierProductCode as string) || (item.supplier_product_code as string) || ((item.product as Record<string, unknown>)?.sku as string) || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'cost',
                        title: 'Maliyet',
                        render: (_, item) => (
                          <span className="text-sm text-gray-500">
                            {item.cost || item.unitCost || item.unit_cost || item.price ? `${item.cost || item.unitCost || item.unit_cost || item.price} ${(item.currency as string) || 'TRY'}` : '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'leadTime',
                        title: 'Teslim Süresi',
                        render: (_, item) => (
                          <span className="text-sm text-gray-500">
                            {(item.leadTimeDays || item.lead_time_days) ? `${item.leadTimeDays || item.lead_time_days} Gün` : '-'}
                          </span>
                        ),
                      },
                    ];
                    return (
                      <DataTable<Record<string, unknown>>
                        data={products}
                        columns={supplierProductColumns}
                        rowKey="id"
                      />
                    );
                  })()}
                </TabsContent>
                <TabsContent value="orders">
                  {itemsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loading size="md" />
                    </div>
                  ) : itemsError ? (
                    <div className="text-red-500 text-center py-8">Fatura ürünleri yüklenirken hata oluştu.</div>
                  ) : !invoiceItemsData?.items?.length ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Bu tedarikçiden gelen faturalarda ürün bulunamadı.</p>
                      <p className="text-xs mt-2">Fatura kalemleri henüz senkronize edilmemiş olabilir.</p>
                    </div>
                  ) : (() => {
                    const allItems = invoiceItemsData.items;
                    const invoiceItemColumns: Column<typeof allItems[number]>[] = [
                      {
                        key: 'productName',
                        title: 'Ürün Adı',
                        sortable: true,
                        sortAccessor: (item) => item.productName,
                        render: (_, item) => (
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{item.productName}</div>
                            {item.productCode && (
                              <div className="text-xs text-gray-400">Kod: {item.productCode}</div>
                            )}
                          </div>
                        ),
                      },
                      {
                        key: 'invoiceNumber',
                        title: 'Fatura No',
                        sortable: true,
                        sortAccessor: (item) => item.invoiceNumber,
                        render: (_, item) => (
                          <button
                            type="button"
                            onClick={() => handleViewInvoicePdf(item.purchaseInvoiceId, item.invoiceNumber)}
                            disabled={invoiceLoading === item.invoiceNumber}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {invoiceLoading === item.invoiceNumber ? 'Yükleniyor...' : item.invoiceNumber}
                          </button>
                        ),
                      },
                      {
                        key: 'quantity',
                        title: 'Miktar',
                        sortable: true,
                        sortAccessor: (item) => Number(item.quantity),
                        render: (_, item) => `${Number(item.quantity)} ${item.unit || 'Adet'}`,
                      },
                      {
                        key: 'unitPrice',
                        title: 'Birim Fiyat',
                        sortable: true,
                        sortAccessor: (item) => Number(item.unitPrice),
                        render: (_, item) => `${Number(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
                      },
                      {
                        key: 'lineTotal',
                        title: 'Toplam',
                        sortable: true,
                        sortAccessor: (item) => Number(item.lineTotal),
                        render: (_, item) => (
                          <span className="text-sm font-medium text-gray-900">
                            {Number(item.lineTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </span>
                        ),
                      },
                      {
                        key: 'action',
                        title: 'İşlem',
                        align: 'right',
                        render: (_, item) => {
                          const isAdded = !!item.inventoryId || addedItemIds.has(item.id);
                          if (isAdded) {
                            return (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Envantere Eklendi
                              </span>
                            );
                          }
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddModal(item)}
                              disabled={addingToInventory && addingItemId === item.id}
                            >
                              <PackagePlus className="h-4 w-4 mr-1" />
                              {addingToInventory && addingItemId === item.id ? 'Ekleniyor...' : 'Envantere Ekle'}
                            </Button>
                          );
                        },
                      },
                    ];

                    return (
                      <DataTable<typeof allItems[number]>
                        data={allItems}
                        columns={invoiceItemColumns}
                        rowKey="id"
                        sortable
                        emptyText="Fatura ürünü bulunamadı"
                        pagination={{
                          current: ordersPage,
                          pageSize: ordersPageSize,
                          total: allItems.length,
                          showSizeChanger: true,
                          pageSizeOptions: [10, 20, 50],
                          onChange: (page, size) => {
                            setOrdersPage(page);
                            setOrdersPageSize(size);
                          },
                        }}
                      />
                    );
                  })()}
                </TabsContent>
                <TabsContent value="notes">
                  <div className="space-y-4">
                    {supplierData.notes ? (
                      <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 text-sm text-gray-700">
                        {supplierData.notes}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">Not eklenmemiş.</p>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        supplier={supplierData}
        isLoading={updateSupplierMutation.isPending}
      />

      {/* Inventory Add Confirmation Modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Envantere Ekle</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ürün bilgilerini kontrol edin ve gerekirse düzenleyin.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ürün Adı (Faturadan)</label>
                <input
                  type="text"
                  value={confirmModal.item.productName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Marka</label>
                <input
                  type="text"
                  value={confirmModal.brand}
                  onChange={(e) => setConfirmModal({ ...confirmModal, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Marka adı"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                <input
                  type="text"
                  value={confirmModal.model}
                  onChange={(e) => setConfirmModal({ ...confirmModal, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Model adı"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Birim Fiyat</label>
                  <input
                    type="text"
                    value={`${Number(confirmModal.item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fatura No</label>
                  <input
                    type="text"
                    value={confirmModal.item.invoiceNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setConfirmModal(null)}>
                İptal
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={!confirmModal.brand.trim() || addingToInventory}
              >
                <Check className="h-4 w-4 mr-1" />
                {addingToInventory ? 'Ekleniyor...' : 'Onayla ve Ekle'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfModal?.open && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{pdfModal.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={pdfModal.blobUrl.split('#')[0]}
                  download={`${pdfModal.title}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  İndir
                </a>
                <Button
                  variant="ghost"
                  onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfModal.blobUrl}
                className="w-full h-full border-0"
                title="Fatura PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierDetailPage;
