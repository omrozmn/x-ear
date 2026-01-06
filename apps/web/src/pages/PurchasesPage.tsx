import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import UniversalImporter, { FieldDef } from '../components/importer/UniversalImporter';
import { useToastHelpers } from '@x-ear/ui-web';
import invoicesSchema from '../components/importer/schemas/invoices';
import { Purchase, PurchaseFilters, PurchaseStatus, PurchaseItem } from '../types/purchase';
import { PurchaseList } from '../components/purchases/PurchaseList';

export function PurchasesPage() {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [filters, setFilters] = useState<PurchaseFilters>({});
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const { success: showSuccess, error: showError } = useToastHelpers();

  const handlePurchaseSelect = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewMode('details');
  };

  const handleCreatePurchase = () => {
    setSelectedPurchase(null);
    setViewMode('form');
  };

  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Pre-fill filters from URL query params (e.g. from SupplierDetail navigation)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const supplierId = params.get('supplierId');
      const supplierName = params.get('supplierName');
      if (supplierId) setFilters(prev => ({ ...prev, supplierId }));
      if (supplierName) setFilters(prev => ({ ...prev, supplierName }));
    } catch (e) {
      // ignore
    }
  }, []);

  const invoiceFields: FieldDef[] = [
    // include both legacy and integrator names for robust mapping
    { key: 'invoiceNumber', label: 'Fatura No' },
    { key: 'eInvoiceId', label: 'Fatura No (eInvoiceId)' },
    { key: 'supplierName', label: 'Tedarikçi Adı' },
    { key: 'billingName', label: 'Tedarikçi / İsim (billingName)' },
    { key: 'invoiceDate', label: 'Düzenlenme Tarihi' },
    { key: 'dueDate', label: 'Vade Tarihi' },
    { key: 'grandTotal', label: 'Toplam Tutar' },
    { key: 'totalPaidTaxIncluding', label: 'Toplam Tutar (KDV dahil)' },
    { key: 'currency', label: 'Para Birimi' }
  ];

  const handleEditPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPurchase(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getStatusColor = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'sent': return 'Gönderildi';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'paid': return 'Ödendi';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      {viewMode !== 'list' && (
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button
                onClick={handleBackToList}
                className="flex items-center text-gray-600 hover:text-gray-900"
                variant='default'>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Alışlar Listesine Dön
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Page Header */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Alışlar
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    XML formatında gelen alış faturalarını yönetin ve takip edin
                  </p>
                </div>
              </div>
              <div className="mt-2 md:mt-0 md:ml-4 flex items-center gap-3">
                <Button onClick={() => setIsImporterOpen(true)} className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700">İçe Aktar</Button>
              </div>
            </div>

            {/* Filters Card placed under header */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durum
                  </label>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as PurchaseStatus || undefined })}
                    options={[
                      { value: '', label: 'Tümü' },
                      { value: 'draft', label: 'Taslak' },
                      { value: 'sent', label: 'Gönderildi' },
                      { value: 'approved', label: 'Onaylandı' },
                      { value: 'rejected', label: 'Reddedildi' },
                      { value: 'paid', label: 'Ödendi' },
                      { value: 'cancelled', label: 'İptal' }
                    ]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tedarikçi
                  </label>
                  <Input
                    type="text"
                    value={filters.supplierName || ''}
                    onChange={(e) => setFilters({ ...filters, supplierName: e.target.value || undefined })}
                    placeholder="Tedarikçi adı..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bitiş Tarihi
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <PurchaseList
            onPurchaseSelect={handlePurchaseSelect}
            filters={filters}
            showActions={true}
          />
        )}

        {viewMode === 'form' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Alış Faturası Formu</h3>
              <p className="mt-1 text-sm text-gray-500">
                Alış faturası formu henüz hazır değil. XML import özelliği yakında eklenecek.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'details' && selectedPurchase && (
          <PurchaseDetails
            purchase={selectedPurchase}
            onEdit={() => handleEditPurchase(selectedPurchase)}
          />
        )}
      </div>
      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        entityFields={invoiceFields}
        zodSchema={invoicesSchema}
        uploadEndpoint={'/api/invoices/bulk_upload'}
        modalTitle={'Toplu Fatura Yükleme'}
        sampleDownloadUrl={'/import_samples/invoices_sample.csv'}
        onComplete={(res) => {
          if (res.errors && res.errors.length > 0) {
            showError(`Alış import tamamlandı — Hatalı satır: ${res.errors.length}`);
          } else {
            showSuccess(`Alış import tamamlandı — Oluşturulan: ${res.created}`);
          }
          setIsImporterOpen(false);
        }}
      />
    </div>
  );
}

// Read URL params to prefill filters when navigating from supplier detail
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const supplierId = params.get('supplierId');
    if (supplierId) {
      // NOTE: this runs at module import time; ensure UI components read location again
      // The PurchasesPage also reads params on mount via useEffect below if needed.
    }
  } catch (e) {
    // ignore
  }
})();

// Purchases page importer

// Purchase Details Component
interface PurchaseDetailsProps {
  purchase: Purchase;
  onEdit: () => void;
}

function PurchaseDetails({ purchase, onEdit }: PurchaseDetailsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getStatusColor = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'sent': return 'Gönderildi';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'paid': return 'Ödendi';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Alış Faturası #{purchase.purchaseNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {formatDate(purchase.createdAt)} tarihinde oluşturuldu
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchase.status)}`}>
              {getStatusText(purchase.status)}
            </span>
            <Button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              variant='default'>
              Düzenle
            </Button>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supplier Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Tedarikçi Bilgileri</h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tedarikçi Adı</dt>
                <dd className="text-sm text-gray-900">{purchase.supplierName}</dd>
              </div>
              {purchase.supplierTaxNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vergi No</dt>
                  <dd className="text-sm text-gray-900">{purchase.supplierTaxNumber}</dd>
                </div>
              )}
              {purchase.supplierAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Adres</dt>
                  <dd className="text-sm text-gray-900">{purchase.supplierAddress}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Purchase Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Fatura Bilgileri</h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Fatura Tarihi</dt>
                <dd className="text-sm text-gray-900">{formatDate(purchase.issueDate)}</dd>
              </div>
              {purchase.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vade Tarihi</dt>
                  <dd className="text-sm text-gray-900">{formatDate(purchase.dueDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Toplam Tutar</dt>
                <dd className="text-sm text-gray-900 font-medium">{formatCurrency(purchase.grandTotal)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Purchase Items */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Fatura Kalemleri</h4>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün/Hizmet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KDV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchase.items.map((item: PurchaseItem) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{item.taxRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Ara Toplam:</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(purchase.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">KDV:</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(purchase.taxTotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="text-base font-medium text-gray-900">Genel Toplam:</dt>
                <dd className="text-base font-medium text-gray-900">{formatCurrency(purchase.grandTotal)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Notlar</h4>
            <p className="text-sm text-gray-600">{purchase.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchasesPage;