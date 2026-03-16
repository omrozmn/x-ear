import React from 'react';
import {
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import type { AdminInvoice, InvoicePaginationInfo } from './types';
import { formatCurrency, formatDate } from './types';
import { getStatusBadge } from './InvoiceStatusBadge';
import InvoiceStatsCards from './InvoiceStatsCards';
import InvoiceFilterBar from './InvoiceFilterBar';

interface InvoiceTableProps {
  isMobile: boolean;
  invoices: AdminInvoice[];
  pagination: InvoicePaginationInfo;
  isLoading: boolean;
  error: unknown;
  searchTerm: string;
  statusFilter: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onViewInvoice: (invoiceId: string) => void;
  onDownloadPDF: (invoiceId: string) => void;
  onPaymentRecordClick: (invoiceId: string) => void;
  onRetry: () => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  isMobile,
  invoices,
  pagination,
  isLoading,
  error,
  searchTerm,
  statusFilter,
  page,
  limit,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onViewInvoice,
  onDownloadPDF,
  onPaymentRecordClick,
  onRetry,
}) => {
  const invoiceColumns: Column<AdminInvoice>[] = [
    {
      key: 'invoiceNumber',
      title: 'Fatura No',
      render: (_: unknown, invoice: AdminInvoice) => (
        <div className="flex items-center">
          <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {invoice.invoiceNumber}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {invoice.createdAt ? formatDate(invoice.createdAt) : '-'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'tenantName',
      title: 'Abone',
      render: (_: unknown, invoice: AdminInvoice) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {invoice.tenantName || '-'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      render: (_: unknown, invoice: AdminInvoice) => getStatusBadge(invoice.status ?? undefined)
    },
    {
      key: 'devicePrice',
      title: 'Tutar',
      render: (_: unknown, invoice: AdminInvoice) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(Number(invoice.devicePrice || 0))}
          </div>
          {invoice.status === 'paid' && (
            <div className="text-sm text-green-600 dark:text-green-400">
              Ödendi
            </div>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Vade Tarihi',
      render: (_: unknown, invoice: AdminInvoice) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {invoice.createdAt ? formatDate(invoice.createdAt) : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'İşlemler',
      align: 'right',
      render: (_: unknown, invoice: AdminInvoice) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onViewInvoice(invoice.id!.toString())}
            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 touch-feedback"
            title="Detayları Görüntüle"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDownloadPDF(invoice.id!.toString())}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 touch-feedback"
            title="PDF İndir"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          {invoice.status === 'active' && (
            <button
              onClick={() => onPaymentRecordClick(invoice.id!.toString())}
              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-xs px-2 py-1 border border-green-300 dark:border-green-700 rounded touch-feedback"
            >
              Ödeme
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      {/* Stats Cards */}
      <InvoiceStatsCards
        isMobile={isMobile}
        invoices={invoices}
        pagination={pagination}
      />

      {/* Filters */}
      <InvoiceFilterBar
        isMobile={isMobile}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        page={page}
        pagination={pagination}
        onSearchChange={onSearchChange}
        onStatusFilterChange={onStatusFilterChange}
      />

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Faturalar yüklenirken hata oluştu</p>
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Tekrar dene
            </button>
          </div>
        ) : (
          <DataTable<AdminInvoice>
            data={invoices}
            columns={invoiceColumns}
            loading={isLoading}
            rowKey={(invoice) => invoice.id!.toString()}
            emptyText="Fatura bulunamadı"
            striped
            hoverable
            responsive
            pagination={{
              current: page,
              pageSize: limit,
              total: pagination?.total || 0,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              onChange: (p: number, ps: number) => { onPageChange(p, ps); },
            }}
          />
        )}
      </div>
    </>
  );
};

export default InvoiceTable;
