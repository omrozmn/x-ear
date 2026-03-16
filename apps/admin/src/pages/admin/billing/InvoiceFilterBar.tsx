import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { InvoicePaginationInfo } from './types';

interface InvoiceFilterBarProps {
  isMobile: boolean;
  searchTerm: string;
  statusFilter: string;
  page: number;
  pagination: InvoicePaginationInfo;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

const InvoiceFilterBar: React.FC<InvoiceFilterBarProps> = ({
  isMobile,
  searchTerm,
  statusFilter,
  page,
  pagination,
  onSearchChange,
  onStatusFilterChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Fatura ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="paid">Ödendi</option>
          <option value="cancelled">İptal</option>
          <option value="refunded">İade</option>
        </select>

        {/* Results count */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {pagination && (
            <span>
              {pagination.total} sonuçtan {((page - 1) * 10) + 1}-{Math.min(page * 10, pagination.total || 0)} arası gösteriliyor
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilterBar;
