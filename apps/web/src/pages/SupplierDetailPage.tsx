import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge, Loading, DataTable, Input } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { Building2, Mail, Phone, MapPin, Globe, Edit, Trash2, PackagePlus, FileText, X, Check, CheckCircle2 } from 'lucide-react';
import { useSupplier, useDeleteSupplier, useUpdateSupplier, useSupplierProducts, type SupplierFormData } from '../hooks/useSuppliers';
import { useSupplierInvoiceItems, useAddToInventory, type SupplierInvoiceItem } from '../hooks/useSupplierInvoiceItems';
import { apiClient } from '@/api/orval-mutator';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierExtended } from '../components/suppliers/supplier-search.types';
import toast from 'react-hot-toast';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { HeaderBackButton } from '../components/layout/HeaderBackButton';

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
  const { t } = useTranslation('suppliers');
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
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('notFound', 'Tedarikçi bulunamadı')}</h2>
        <Button onClick={handleBack}>{t('goBack', 'Geri Dön')}</Button>
      </div>
    );
  }

  // Cast to Extended type to access extra fields if needed


  return (
    <div className="min-h-screen bg-muted p-6">
      {/* Header */}
      <div className="mb-6">
        <DesktopPageHeader
          leading={<HeaderBackButton label="Tedarikçilere Dön" onClick={handleBack} />}
          title={supplierData.companyName || supplierData.name}
          description={t('detailDescription', 'Tedarikçi kaydının detaylarını yönetin')}
          icon={<Building2 className="h-6 w-6" />}
          eyebrow={{ tr: 'Tedarikçi Kartı', en: 'Supplier Profile' }}
          actions={(
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('edit', 'Düzenle')}
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete', 'Sil')}
              </Button>
            </>
          )}
        >
          <div className="flex items-center gap-2">
            {supplierData.companyCode && (
              <Badge variant="secondary">{supplierData.companyCode}</Badge>
            )}
            {supplierData.isActive ? (
              <Badge variant="success">Aktif</Badge>
            ) : (
              <Badge variant="secondary">Pasif</Badge>
            )}
          </div>
        </DesktopPageHeader>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('contactInfo', 'İletişim Bilgileri')}</h3>
            <div className="space-y-4">
              {supplierData.contactPerson && (
                <div className="flex items-center text-muted-foreground">
                  <div className="w-8 flex-shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.contactPerson}</span>
                </div>
              )}
              {supplierData.email && (
                <div className="flex items-center text-muted-foreground">
                  <div className="w-8 flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <a href={`mailto:${supplierData.email}`} className="text-sm hover:text-primary">
                    {supplierData.email}
                  </a>
                </div>
              )}
              {supplierData.phone && (
                <div className="flex items-center text-muted-foreground">
                  <div className="w-8 flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.phone}</span>
                </div>
              )}
              {supplierData.institutionNumber && (
                <div className="flex items-center text-muted-foreground">
                  <div className="w-8 flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">UTS Kurum No: {supplierData.institutionNumber}</span>
                </div>
              )}
              {supplierData.website && (
                <div className="flex items-center text-muted-foreground">
                  <div className="w-8 flex-shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <a href={supplierData.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary">
                    {supplierData.website}
                  </a>
                </div>
              )}
              {(supplierData.address || supplierData.city) && (
                <div className="flex items-start text-muted-foreground">
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

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('financialInfo', 'Finansal Bilgiler')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Vergi No</span>
                <span className="text-sm font-medium text-foreground">{supplierData.taxNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Vergi Dairesi</span>
                <span className="text-sm font-medium text-foreground">{supplierData.taxOffice || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Para Birimi</span>
                <span className="text-sm font-medium text-foreground">{supplierData.currency || 'TRY'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Ödeme Koşulları</span>
                <span className="text-sm font-medium text-foreground">{supplierData.paymentTerms || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl shadow-sm border border-border min-h-[500px]">
            <Tabs defaultValue="products" className="w-full">
              <div className="border-b border-border px-6">
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
                    <div className="text-destructive text-center py-8">Ürünler yüklenirken hata oluştu.</div>
                  ) : (() => {
                    const rawData = productsData as Record<string, unknown> | undefined;
                    const innerData = rawData?.data as Record<string, unknown> | undefined;
                    const products = (innerData?.products ?? innerData?.items ?? (Array.isArray(rawData?.data) ? rawData?.data : [])) as Array<Record<string, unknown>>;
                    if (!products || products.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>Bu tedarikçiye ait ürün bulunamadı.</p>
                        </div>
                      );
                    }
                    const supplierProductColumns: Column<Record<string, unknown>>[] = [
                      {
                        key: 'name',
                        title: 'Ürün Adı',
                        render: (_, item) => (
                          <span className="text-sm font-medium text-foreground">
                            {(item.name as string) || (item.supplierProductName as string) || (item.supplier_product_name as string) || ((item.product as Record<string, unknown>)?.name as string) || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'code',
                        title: 'Kod',
                        render: (_, item) => (
                          <span className="text-sm text-muted-foreground">
                            {(item.stockCode as string) || (item.sku as string) || (item.supplierProductCode as string) || (item.supplier_product_code as string) || ((item.product as Record<string, unknown>)?.sku as string) || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'cost',
                        title: 'Maliyet',
                        render: (_, item) => (
                          <span className="text-sm text-muted-foreground">
                            {item.cost || item.unitCost || item.unit_cost || item.price ? `${item.cost || item.unitCost || item.unit_cost || item.price} ${(item.currency as string) || 'TRY'}` : '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'leadTime',
                        title: 'Teslim Süresi',
                        render: (_, item) => (
                          <span className="text-sm text-muted-foreground">
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
                    <div className="text-destructive text-center py-8">Fatura ürünleri yüklenirken hata oluştu.</div>
                  ) : !invoiceItemsData?.items?.length ? (
                    <div className="text-center py-12 text-muted-foreground">
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
                          <div className="text-sm text-foreground">
                            <div className="font-medium">{item.productName}</div>
                            {item.productCode && (
                              <div className="text-xs text-muted-foreground">Kod: {item.productCode}</div>
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoicePdf(item.purchaseInvoiceId, item.invoiceNumber)}
                            disabled={invoiceLoading === item.invoiceNumber}
                            className="h-auto p-0 text-primary hover:text-blue-800 hover:bg-transparent hover:underline dark:hover:text-blue-300"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {invoiceLoading === item.invoiceNumber ? 'Yükleniyor...' : item.invoiceNumber}
                          </Button>
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
                          <span className="text-sm font-medium text-foreground">
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
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-green-200 rounded-full px-2.5 py-1">
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
                      <div className="bg-warning/10 p-4 rounded-2xl border border-yellow-100 text-sm text-foreground">
                        {supplierData.notes}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center">Not eklenmemiş.</p>
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
            className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Envantere Ekle</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ürün bilgilerini kontrol edin ve gerekirse düzenleyin.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Ürün Adı (Faturadan)</label>
                <Input
                  type="text"
                  value={confirmModal.item.productName}
                  disabled
                  fullWidth
                  className="bg-muted text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Marka</label>
                <Input
                  type="text"
                  value={confirmModal.brand}
                  onChange={(e) => setConfirmModal({ ...confirmModal, brand: e.target.value })}
                  fullWidth
                  placeholder="Marka adı"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
                <Input
                  type="text"
                  value={confirmModal.model}
                  onChange={(e) => setConfirmModal({ ...confirmModal, model: e.target.value })}
                  fullWidth
                  placeholder="Model adı"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Birim Fiyat</label>
                  <Input
                    type="text"
                    value={`${Number(confirmModal.item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                    disabled
                    fullWidth
                    className="bg-muted text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fatura No</label>
                  <Input
                    type="text"
                    value={confirmModal.item.invoiceNumber}
                    disabled
                    fullWidth
                    className="bg-muted text-muted-foreground"
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
            className="relative bg-card rounded-2xl shadow-xl w-full max-w-4xl flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-lg font-semibold text-foreground truncate pr-4">{pdfModal.title}</h2>
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
                  className="text-muted-foreground hover:text-muted-foreground"
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
