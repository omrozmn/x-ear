import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input, Select, Button } from '@x-ear/ui-web';

interface SalesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  paymentMethodFilter: string;
  onPaymentMethodFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filteredCount: number;
  totalCount: number;
  onClearFilters: () => void;
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentMethodFilter,
  onPaymentMethodFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showFilters,
  onToggleFilters,
  filteredCount,
  totalCount,
  onClearFilters
}) => {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Satışlarda ara... (ürün, ödeme yöntemi, satıcı, notlar)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={onToggleFilters}
          variant={showFilters ? "primary" : "secondary"}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtreler
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'pending', label: 'Bekliyor' },
                { value: 'cancelled', label: 'İptal Edildi' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ödeme Yöntemi
            </label>
            <Select
              value={paymentMethodFilter}
              onChange={(e) => onPaymentMethodFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'cash', label: 'Nakit' },
                { value: 'card', label: 'Kredi Kartı' },
                { value: 'installment', label: 'Taksit' },
                { value: 'insurance', label: 'Sigorta' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredCount} / {totalCount} satış gösteriliyor
          </span>
          <Button
            onClick={onClearFilters}
            variant="ghost"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Filtreleri Temizle
          </Button>
        </div>
      )}
    </div>
  );
};