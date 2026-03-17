import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  TicketStatusFilter,
  TicketPriorityFilter,
  TicketPagination,
  isTicketStatusFilter,
  isTicketPriorityFilter,
} from './types';

export interface TicketFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: TicketStatusFilter;
  setStatusFilter: (value: TicketStatusFilter) => void;
  priorityFilter: TicketPriorityFilter;
  setPriorityFilter: (value: TicketPriorityFilter) => void;
  pagination: TicketPagination | null;
  page: number;
  limit: number;
  isMobile: boolean;
}

const TicketFilters: React.FC<TicketFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  pagination,
  page,
  limit,
  isMobile,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Ticket ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            if (isTicketStatusFilter(e.target.value)) {
              setStatusFilter(e.target.value);
            }
          }}
          className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="open">Açık</option>
          <option value="in_progress">İşlemde</option>
          <option value="resolved">Çözüldü</option>
          <option value="closed">Kapalı</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            if (isTicketPriorityFilter(e.target.value)) {
              setPriorityFilter(e.target.value);
            }
          }}
          className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tüm Öncelikler</option>
          <option value="urgent">Acil</option>
          <option value="high">Yüksek</option>
          <option value="medium">Orta</option>
          <option value="low">Düşük</option>
        </select>

        <div className={`flex items-center text-sm text-gray-500 dark:text-gray-400 ${isMobile ? 'col-span-1' : ''}`}>
          {pagination && (
            <span>
              {pagination.total} sonuçtan {(page - 1) * limit + 1}-
              {Math.min(page * limit, pagination.total)} arası gösteriliyor
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketFilters;
