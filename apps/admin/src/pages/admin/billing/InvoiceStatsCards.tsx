import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import type { InvoiceRead } from '@/api/generated/schemas';
import type { AdminInvoice, InvoicePaginationInfo } from './types';
import { formatCurrency, toNumber } from './types';

interface InvoiceStatsCardsProps {
  isMobile: boolean;
  invoices: AdminInvoice[];
  pagination: InvoicePaginationInfo;
}

const InvoiceStatsCards: React.FC<InvoiceStatsCardsProps> = ({
  isMobile,
  invoices,
  pagination,
}) => {
  return (
    <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Toplam Fatura
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {pagination?.total || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 dark:bg-green-400 rounded-full"></div>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Ödenen
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {invoices.filter(inv => inv.status === 'paid').length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-600 dark:bg-orange-400 rounded-full"></div>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Gecikmiş
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  -
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Toplam Tutar
                </dt>
                <dd className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  {formatCurrency(invoices.reduce((sum: number, inv: InvoiceRead) => sum + toNumber(inv.devicePrice), 0) || 0)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatsCards;
