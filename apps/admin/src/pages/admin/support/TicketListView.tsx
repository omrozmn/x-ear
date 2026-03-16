import React from 'react';
import { TicketIcon } from '@heroicons/react/24/outline';
import { HTTPValidationError, TicketStatus } from '@/lib/api-client';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';
import Pagination from '@/components/ui/Pagination';
import {
  SupportTicket,
  AdminUserOption,
  TicketPagination,
  isTicketStatus,
  getAdminUserLabel,
  formatDate,
  isOverdue,
} from './types';
import { getPriorityBadge } from './TicketStatusBadge';

export interface TicketListViewProps {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: HTTPValidationError | null;
  onViewTicket: (ticket: SupportTicket) => void;
  onAssignTicket: (ticketId: string, adminId: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  adminUsers: AdminUserOption[];
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  pagination: TicketPagination | null;
  onRetry: () => Promise<void>;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  tickets,
  isLoading,
  error,
  onViewTicket,
  onAssignTicket,
  onStatusChange,
  adminUsers,
  page,
  setPage,
  limit,
  setLimit,
  pagination,
  onRetry,
}) => {
  const columns = [
    {
      key: 'ticket',
      header: 'Ticket',
      render: (ticket: SupportTicket) => (
        <div className="flex items-center">
          <TicketIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.createdAt)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.tenantName || '-'}</div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (ticket: SupportTicket) => (
        <select
          value={ticket.status}
          onChange={(e) => {
            if (isTicketStatus(e.target.value)) {
              onStatusChange(ticket.id, e.target.value);
            }
          }}
          className="text-xs border-0 bg-transparent dark:bg-gray-700 dark:text-white focus:ring-0 p-0 touch-feedback"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="open">Açık</option>
          <option value="in_progress">İşlemde</option>
          <option value="resolved">Çözüldü</option>
          <option value="closed">Kapalı</option>
        </select>
      ),
    },
    {
      key: 'priority',
      header: 'Öncelik',
      mobileHidden: true,
      render: (ticket: SupportTicket) => getPriorityBadge(ticket.priority),
    },
    {
      key: 'assigned',
      header: 'Atanan',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <select
          value={ticket.assignedTo || ''}
          onChange={(e) => onAssignTicket(ticket.id, e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 touch-feedback"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Atanmamış</option>
          {adminUsers.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {getAdminUserLabel(admin)}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <div>
          <div
            className={`text-sm ${
              isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status)
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formatDate(ticket.slaDueDate)}
          </div>
          {isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status) && (
            <div className="text-xs text-red-500 dark:text-red-400">Gecikmiş</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (ticket: SupportTicket) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewTicket(ticket);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 touch-feedback"
        >
          Detay
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ticketlar yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Ticketlar yüklenirken hata oluştu</p>
          <button
            onClick={() => {
              void onRetry();
            }}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 touch-feedback"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <ResponsiveTable
            data={tickets}
            columns={columns}
            keyExtractor={(ticket: SupportTicket) => ticket.id}
            onRowClick={onViewTicket}
            emptyMessage="Ticket bulunamadı."
          />

          <Pagination
            currentPage={page}
            totalPages={pagination?.totalPages || 1}
            totalItems={pagination?.total || 0}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
          />
        </>
      )}
    </div>
  );
};
