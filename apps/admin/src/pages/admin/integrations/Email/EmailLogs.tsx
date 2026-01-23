import React, { useState } from 'react';
import { useGetEmailLogs } from '@/api/generated/email-logs/email-logs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  DatePicker,
  Badge,
  Spinner,
  Pagination,
} from '@x-ear/ui-web';
import { EnvelopeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { Column } from '@x-ear/ui-web';
import { EmailIntegrationNav } from '@/components/integrations/EmailIntegrationNav';

interface EmailLog {
  id: string;
  tenantId: string;
  recipient: string;
  subject: string;
  bodyPreview: string | null;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sentAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  templateName: string | null;
  scenario: string | null;
  createdAt: string;
  updatedAt: string;
}

const EmailLogs: React.FC = () => {
  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch email logs with filters
  const { data: logsData, isLoading } = useGetEmailLogs({
    page,
    perPage,
    status: statusFilter || undefined,
    recipient: recipientFilter || undefined,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
  });

  const logs = logsData?.data?.items || [];
  const total = logsData?.data?.total || 0;
  const totalPages = logsData?.data?.totalPages || 1;

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Status badge color mapping
  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'bounced':
        return 'error';
      default:
        return 'default';
    }
  };

  // Status label mapping
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'sent':
        return 'Gönderildi';
      case 'pending':
        return 'Beklemede';
      case 'failed':
        return 'Başarısız';
      case 'bounced':
        return 'Geri Döndü';
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Table columns
  const columns: Column<EmailLog>[] = [
    {
      key: 'recipient',
      header: 'Alıcı',
      render: (log) => (
        <div className="font-medium text-gray-900">{log.recipient}</div>
      ),
    },
    {
      key: 'subject',
      header: 'Konu',
      render: (log) => (
        <div className="max-w-xs truncate text-gray-700">{log.subject}</div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (log) => (
        <Badge variant={getStatusBadgeVariant(log.status)}>
          {getStatusLabel(log.status)}
        </Badge>
      ),
    },
    {
      key: 'scenario',
      header: 'Senaryo',
      render: (log) => (
        <span className="text-sm text-gray-600">
          {log.scenario || '-'}
        </span>
      ),
    },
    {
      key: 'retryCount',
      header: 'Deneme',
      render: (log) => (
        <span className="text-sm text-gray-600">{log.retryCount}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Oluşturulma',
      render: (log) => (
        <span className="text-sm text-gray-600">{formatDate(log.createdAt)}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Gönderilme',
      render: (log) => (
        <span className="text-sm text-gray-600">{formatDate(log.sentAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (log) => (
        <button
          onClick={() => toggleRowExpansion(log.id)}
          className="text-primary-600 hover:text-primary-700 p-1"
          aria-label={expandedRows.has(log.id) ? 'Daralt' : 'Genişlet'}
        >
          {expandedRows.has(log.id) ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      ),
    },
  ];

  // Render expanded row content
  const renderExpandedRow = (log: EmailLog) => {
    if (!expandedRows.has(log.id)) return null;

    return (
      <tr key={`${log.id}-expanded`}>
        <td colSpan={8} className="px-6 py-4 bg-gray-50">
          <div className="space-y-3">
            {/* Body Preview */}
            {log.bodyPreview && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">İçerik Önizleme:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{log.bodyPreview}</p>
              </div>
            )}

            {/* Error Message */}
            {log.errorMessage && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-1">Hata Mesajı:</h4>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {log.errorMessage}
                </p>
              </div>
            )}

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Şablon:</span>{' '}
                <span className="text-gray-600">{log.templateName || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Güncelleme:</span>{' '}
                <span className="text-gray-600">{formatDate(log.updatedAt)}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Handle filter changes
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientFilter(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setPage(1); // Reset to first page
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setPage(1); // Reset to first page
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setRecipientFilter('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div data-testid="spinner">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <EnvelopeIcon className="h-7 w-7 mr-2 text-primary-600" />
          E-posta Entegrasyonu
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gönderilen e-postaların geçmişi ve durumu
        </p>
      </div>

      <EmailIntegrationNav />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <Select
                label="Durum"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={[
                  { value: '', label: 'Tümü' },
                  { value: 'pending', label: 'Beklemede' },
                  { value: 'sent', label: 'Gönderildi' },
                  { value: 'failed', label: 'Başarısız' },
                  { value: 'bounced', label: 'Geri Döndü' },
                ]}
                fullWidth
              />
            </div>

            {/* Recipient Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alıcı
              </label>
              <Input
                type="text"
                value={recipientFilter}
                onChange={handleRecipientChange}
                placeholder="E-posta adresi ara..."
              />
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi
              </label>
              <DatePicker
                selected={dateFrom}
                onChange={handleDateFromChange}
                placeholderText="Tarih seçin"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi
              </label>
              <DatePicker
                selected={dateTo}
                onChange={handleDateToChange}
                placeholderText="Tarih seçin"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter || recipientFilter || dateFrom || dateTo) && (
            <div className="mt-4">
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">E-posta logu bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                Henüz gönderilmiş e-posta bulunmuyor veya filtrelerinize uygun sonuç yok.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-gray-50">
                          {columns.map((column) => (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                              {column.render(log)}
                            </td>
                          ))}
                        </tr>
                        {renderExpandedRow(log)}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Toplam <span className="font-medium">{total}</span> kayıt bulundu
                  </div>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailLogs;
