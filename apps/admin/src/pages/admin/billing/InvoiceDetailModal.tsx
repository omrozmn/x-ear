import React from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { DataTable } from '@x-ear/ui-web';
import type { AdminInvoice } from './types';
import { formatCurrency, formatDate, toNumber } from './types';

interface InvoiceDetailModalProps {
  invoice: AdminInvoice;
  onClose: () => void;
  onDownloadPDF: (invoiceId: string) => void;
  onPaymentRecordClick: (invoiceId: string) => void;
}

const getStatusBadge = (status: string | undefined) => {
  if (!status) return null;
  const statusClasses: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800'
  };

  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    paid: 'Ödendi',
    cancelled: 'İptal',
    refunded: 'İade'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
};

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onDownloadPDF,
  onPaymentRecordClick,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-xl bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Fatura Detayları - {invoice.invoiceNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Fatura Bilgileri</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Fatura No:</dt>
                  <dd className="text-gray-900">{invoice.invoiceNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Durum:</dt>
                  <dd>{getStatusBadge(invoice.status ?? undefined)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Oluşturulma:</dt>
                  <dd className="text-gray-900">{invoice.createdAt ? formatDate(invoice.createdAt) : '-'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Abone:</dt>
                  <dd className="text-gray-900">{invoice.tenantName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hasta:</dt>
                  <dd className="text-gray-900">{invoice.patientName || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Invoice Items (Single Device) */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Fatura Kalemleri</h4>
            <DataTable<{ key: string; device: string; amount: string }>
              data={[{ key: '1', device: invoice.deviceName || 'Cihaz Satışı', amount: formatCurrency(toNumber(invoice.devicePrice)) }]}
              columns={[
                { key: 'device', title: 'Cihaz', render: (_: unknown, row) => row.device },
                { key: 'amount', title: 'Tutar', render: (_: unknown, row) => row.amount },
              ]}
              rowKey={(row) => row.key}
              size="small"
              bordered
            />
          </div>

          {/* Invoice Totals */}
          <div className="border-t pt-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-t pt-2 font-medium">
                <dt className="text-gray-900">Toplam:</dt>
                <dd className="text-gray-900">{formatCurrency(toNumber(invoice.devicePrice))}</dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => onDownloadPDF(invoice.id!.toString())}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              PDF İndir
            </button>
            {invoice.status === 'active' && (
              <button
                onClick={() => {
                  onPaymentRecordClick(invoice.id!.toString());
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700"
              >
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Ödeme Kaydet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
