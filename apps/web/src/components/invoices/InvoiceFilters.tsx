import { Button, Input, Select } from '@x-ear/ui-web';
import { useState } from 'react';
import { InvoiceFilters as IInvoiceFilters, InvoiceStatus } from '../../types/invoice';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onFiltersChange: (filters: IInvoiceFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export function InvoiceFilters({ filters, onFiltersChange, onApply, onReset }: InvoiceFiltersProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [showFilters, setShowFilters] = useState(true);

  const handleFilterChange = (key: keyof IInvoiceFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof IInvoiceFilters];
    return value !== undefined && value !== '' && value !== null && 
           !(Array.isArray(value) && value.length === 0);
  }).length;

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {activeFilterCount} aktif
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={onReset}
              className="text-sm text-gray-500 hover:text-gray-700"
              variant="default">
              Temizle
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-gray-500 hover:text-gray-700"
              variant="default">
              {showFilters ? 'Gizle' : 'Göster'}
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="p-6">
          {/* Filter Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                Temel Filtreler
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'advanced'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                Gelişmiş Filtreler
              </button>
            </nav>
          </div>

          {/* Basic Filters */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genel Arama
                </label>
                <Input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Fatura no, hasta adı, vergi no..."
                  className="w-full"
                />
              </div>

              {/* Removed Fatura Tipi UI per request (Tip alanı kaldırıldı) */}

              <div>
                <Select
                  label="Durum"
                  value={filters.status?.[0] || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value as InvoiceStatus] : [])}
                  options={[
                    { value: '', label: 'Tümü' },
                    { value: 'draft', label: 'Taslak' },
                    { value: 'sent', label: 'Gönderildi' },
                    { value: 'approved', label: 'Onaylandı' },
                    { value: 'paid', label: 'Ödendi' },
                    { value: 'overdue', label: 'Vadesi Geçti' },
                    { value: 'cancelled', label: 'İptal' }
                  ]}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Tarihi
                </label>
                <Input
                  type="date"
                  value={filters.issueDateFrom || ''}
                  onChange={(e) => handleFilterChange('issueDateFrom', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bitiş Tarihi
                </label>
                <Input
                  type="date"
                  value={filters.issueDateTo || ''}
                  onChange={(e) => handleFilterChange('issueDateTo', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta Adı
                </label>
                <Input
                  type="text"
                  value={filters.partyName || ''}
                  onChange={(e) => handleFilterChange('partyName', e.target.value)}
                  placeholder="Hasta adı..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fatura Numarası
                </label>
                <Input
                  type="text"
                  value={filters.invoiceNumber || ''}
                  onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
                  placeholder="Fatura numarası..."
                  className="w-full"
                />
              </div>

              <div>
                <Select
                  label="Ödeme Yöntemi"
                  value={filters.paymentMethod?.[0] || ''}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value ? [e.target.value] : [])}
                  options={[
                    { value: '', label: 'Tümü' },
                    { value: 'cash', label: 'Nakit' },
                    { value: 'credit_card', label: 'Kredi Kartı' },
                    { value: 'bank_transfer', label: 'Havale' },
                    { value: 'installment', label: 'Taksit' },
                    { value: 'sgk', label: 'SGK' },
                    { value: 'check', label: 'Çek' }
                  ]}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Tutar
                </label>
                <Input
                  type="number"
                  value={filters.amountMin || ''}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tutar
                </label>
                <Input
                  type="number"
                  value={filters.amountMax || ''}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="999999.99"
                  step="0.01"
                  className="w-full"
                />
              </div>

              <div>
                <Select
                  label="GİB Durumu"
                  value={filters.gibStatus || ''}
                  onChange={(e) => handleFilterChange('gibStatus', e.target.value || undefined)}
                  options={[
                    { value: '', label: 'Tümü' },
                    { value: 'not_sent', label: 'Gönderilmedi' },
                    { value: 'sent', label: 'Gönderildi' },
                    { value: 'accepted', label: 'Kabul Edildi' },
                    { value: 'rejected', label: 'Reddedildi' }
                  ]}
                  fullWidth
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.isPaid || false}
                    onChange={(e) => handleFilterChange('isPaid', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ödenenler</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.isOverdue || false}
                    onChange={(e) => handleFilterChange('isOverdue', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Vadesi Geçenler</span>
                </label>
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              variant="default">
              Sıfırla
            </Button>
            <Button
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              variant="default">
              Filtrele
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
