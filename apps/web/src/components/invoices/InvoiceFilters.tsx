import { Button, Input, Select, Checkbox, DatePicker } from '@x-ear/ui-web';
import { useState } from 'react';
import { InvoiceFilters as IInvoiceFilters, InvoiceStatus, PaymentMethod } from '../../types/invoice';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onFiltersChange: (filters: IInvoiceFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export function InvoiceFilters({ filters, onFiltersChange, onApply, onReset }: InvoiceFiltersProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [showFilters, setShowFilters] = useState(true);

  const handleFilterChange = (key: keyof IInvoiceFilters, value: IInvoiceFilters[keyof IInvoiceFilters]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof IInvoiceFilters];
    return value !== undefined && value !== '' && value !== null && 
           !(Array.isArray(value) && value.length === 0);
  }).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow mb-6">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtreler</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-300 rounded-full">
                {activeFilterCount} aktif
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={onReset}
              className="text-sm text-muted-foreground hover:text-foreground dark:hover:text-gray-200"
              variant="default">
              Temizle
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-muted-foreground hover:text-foreground dark:hover:text-gray-200"
              variant="default">
              {showFilters ? 'Gizle' : 'Göster'}
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="p-6">
          {/* Filter Tabs */}
          <div className="border-b border-border mb-6">
            <nav className="flex space-x-8">
              <Button
                variant="ghost"
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
                }`}>
                Temel Filtreler
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'advanced'
                    ? 'border-blue-500 text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
                }`}>
                Gelişmiş Filtreler
              </Button>
            </nav>
          </div>

          {/* Basic Filters */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value as InvoiceStatus] : undefined)}
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
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={filters.issueDateFrom ? new Date(filters.issueDateFrom) : null}
                  onChange={(date) => handleFilterChange('issueDateFrom', date ? date.toISOString().split('T')[0] : '')}
                  className="w-full"
                />
              </div>

              <div>
                <DatePicker
                  label="Bitiş Tarihi"
                  value={filters.issueDateTo ? new Date(filters.issueDateTo) : null}
                  onChange={(date) => handleFilterChange('issueDateTo', date ? date.toISOString().split('T')[0] : '')}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value ? [e.target.value as PaymentMethod] : undefined)}
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                <Checkbox
                  checked={filters.isPaid || false}
                  onChange={(e) => handleFilterChange('isPaid', e.target.checked || undefined)}
                  label="Ödenenler"
                />

                <Checkbox
                  checked={filters.isOverdue || false}
                  onChange={(e) => handleFilterChange('isOverdue', e.target.checked || undefined)}
                  label="Vadesi Geçenler"
                />
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border">
            <Button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-foreground bg-white dark:bg-gray-700 border border-border rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600"
              variant="default">
              Sıfırla
            </Button>
            <Button
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-2xl shadow-sm"
              variant="default">
              Filtrele
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
