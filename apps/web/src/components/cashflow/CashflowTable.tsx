/**
 * CashflowTable Component
 * Displays cash records in a table format
 */
import React from 'react';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import type { CashRecord } from '../../types/cashflow';
import { RECORD_TYPE_LABELS } from '../../types/cashflow';

interface CashflowTableProps {
  records: CashRecord[];
  isLoading?: boolean;
  onRecordClick: (record: CashRecord) => void;
  onDeleteRecord: (record: CashRecord) => void;
}

export function CashflowTable({
  records,
  isLoading,
  onRecordClick,
  onDeleteRecord,
}: CashflowTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const cashflowColumns: Column<CashRecord>[] = [
    {
      key: 'date',
      title: 'Tarih',
      render: (_, record) => (
        <span className="text-sm text-gray-900 dark:text-gray-200">{formatDate(record.date)}</span>
      ),
    },
    {
      key: 'time',
      title: 'Saat',
      render: (_, record) => (
        <span className="text-sm text-gray-900 dark:text-gray-200">{formatTime(record.date)}</span>
      ),
    },
    {
      key: 'transactionType',
      title: 'İşlem Türü',
      render: (_, record) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            record.transactionType === 'income'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
          }`}
        >
          {record.transactionType === 'income' ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {record.transactionType === 'income' ? 'Gelir' : 'Gider'}
        </span>
      ),
    },
    {
      key: 'recordType',
      title: 'Kayıt Türü',
      render: (_, record) => (
        <span className="text-sm text-gray-900 dark:text-gray-200">
          {RECORD_TYPE_LABELS[record.recordType] || record.recordType}
        </span>
      ),
    },
    {
      key: 'partyName',
      title: 'Hasta',
      render: (_, record) => (
        <span className="text-sm text-gray-900 dark:text-gray-200">{record.partyName || '-'}</span>
      ),
    },
    {
      key: 'amount',
      title: 'Tutar',
      align: 'right',
      render: (_, record) => (
        <span
          className={`text-sm font-medium ${
            record.transactionType === 'income'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {record.transactionType === 'income' ? '+' : '-'}
          {formatCurrency(record.amount)}
        </span>
      ),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      render: (_, record) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRecord(record);
          }}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Sil
        </Button>
      ),
    },
  ];

  return (
    <DataTable<CashRecord>
      data={records}
      columns={cashflowColumns}
      rowKey="id"
      loading={isLoading}
      onRowClick={onRecordClick}
      emptyText="Kayıt bulunamadı"
    />
  );
}
