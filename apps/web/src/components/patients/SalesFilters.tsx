import React from 'react';
import { Button, Input, Badge } from '@x-ear/ui-web';
import { Search, Filter, Download, Printer, ChevronUp, ChevronDown } from 'lucide-react';

interface SalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (value: string) => void;
  amountRangeMin: string;
  setAmountRangeMin: (value: string) => void;
  amountRangeMax: string;
  setAmountRangeMax: (value: string) => void;
  sortBy: 'date' | 'amount' | 'status';
  setSortBy: (value: 'date' | 'amount' | 'status') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  selectedSales: string[];
  onExportSales: () => void;
  onPrintSales: () => void;
  onBulkCollection: () => void;
  onBulkPromissoryNote: () => void;
}

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  statusFilter,
  setStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  amountRangeMin,
  setAmountRangeMin,
  amountRangeMax,
  setAmountRangeMax,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedSales,
  onExportSales,
  onPrintSales,
  onBulkCollection,
  onBulkPromissoryNote
}) => {
  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Gelişmiş Filtreler
          {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>
        
        <Button variant="outline" onClick={onExportSales}>
          <Download className="w-4 h-4 mr-2" />
          Dışa Aktar
        </Button>
        
        <Button variant="outline" onClick={onPrintSales}>
          <Printer className="w-4 h-4 mr-2" />
          Yazdır
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Satış ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Tarihler</option>
          <option value="today">Bugün</option>
          <option value="week">Bu Hafta</option>
          <option value="month">Bu Ay</option>
          <option value="year">Bu Yıl</option>
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="completed">Tamamlandı</option>
          <option value="pending">Beklemede</option>
          <option value="cancelled">İptal Edildi</option>
        </select>
        
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Ödeme Yöntemleri</option>
          <option value="cash">Nakit</option>
          <option value="card">Kart</option>
          <option value="transfer">Havale</option>
          <option value="installment">Taksit</option>
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Tutar
              </label>
              <Input
                type="number"
                placeholder="0"
                value={amountRangeMin}
                onChange={(e) => setAmountRangeMin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Tutar
              </label>
              <Input
                type="number"
                placeholder="999999"
                value={amountRangeMax}
                onChange={(e) => setAmountRangeMax(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sıralama
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Tarih</option>
                  <option value="amount">Tutar</option>
                  <option value="status">Durum</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Azalan</option>
                  <option value="asc">Artan</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedSales.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-800">
            {selectedSales.length} satış seçildi
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBulkCollection}>
              Toplu Tahsilat
            </Button>
            <Button variant="outline" onClick={onBulkPromissoryNote}>
              Toplu Senet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};