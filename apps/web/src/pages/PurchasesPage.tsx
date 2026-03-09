import React, { useState, useMemo } from 'react';
import { Card, Button } from '@x-ear/ui-web';
import { ShoppingCart, Download, Filter, Search, FileText, ArrowRight, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useNavigate } from '@tanstack/react-router';
import { useListIncomingInvoices } from '@/api/client/invoices.client';
import type { IncomingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/generated/schemas';
import { ONBOARDING_PURCHASES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

export function PurchasesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(25);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem(ONBOARDING_PURCHASES_DISMISSED));
  const [selectedInvoice, setSelectedInvoice] = useState<IncomingInvoiceResponse | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchTerm, 300);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return sortDir === 'asc' ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDownIcon className="inline w-3 h-3 ml-1" />;
  };

  const { data, isLoading, refetch } = useListIncomingInvoices({
    page: currentPage,
    per_page: perPage,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    supplier_name: debouncedSearch || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const totalPages = pagination?.totalPages ?? 1;

  const totalPurchases = useMemo(() =>
    invoiceList.reduce((sum: number, inv: IncomingInvoiceResponse) => sum + Number(inv.totalAmount || 0), 0),
    [invoiceList]
  );

  const sortedInvoices = useMemo(() => {
    const list = [...invoiceList];
    if (!sortField) return list;
    list.sort((a: IncomingInvoiceResponse, b: IncomingInvoiceResponse) => {
      let av: string | number, bv: string | number;
      if (sortField === 'supplierName') { av = a.supplierName || ''; bv = b.supplierName || ''; }
      else if (sortField === 'invoiceNumber') { av = a.invoiceNumber || ''; bv = b.invoiceNumber || ''; }
      else if (sortField === 'invoiceDate') { av = a.invoiceDate || ''; bv = b.invoiceDate || ''; }
      else if (sortField === 'totalAmount') { av = Number(a.totalAmount || 0); bv = Number(b.totalAmount || 0); }
      else if (sortField === 'status') { av = a.status || ''; bv = b.status || ''; }
      else { av = ''; bv = ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [invoiceList, sortField, sortDir]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RECEIVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      PROCESSED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      PAID: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    };
    const labels: Record<string, string> = {
      RECEIVED: 'Alındı',
      PROCESSED: 'İşlendi',
      PAID: 'Ödendi',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedInvoices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedInvoices.map((inv: IncomingInvoiceResponse) => String(inv.invoiceId))));
  };
  const handleBulkExportCsv = () => {
    const selected = sortedInvoices.filter((inv: IncomingInvoiceResponse) => selectedIds.has(String(inv.invoiceId)));
    const headers = ['Fatura No', 'Tedarikçi', 'VKN', 'Tutar', 'Tarih', 'Durum'];
    const rows = selected.map((inv: IncomingInvoiceResponse) => [
      inv.invoiceNumber || '', inv.supplierName || '', inv.supplierTaxNumber || '',
      String(inv.totalAmount || 0), inv.invoiceDate || '', inv.status || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `alislar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV dışa aktarıldı');
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Alış kayıtları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alış Kayıtları</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gelen faturalardan oluşturulan alış kayıtları</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate({ to: '/invoices/incoming' })}
          >
            <ArrowRight size={18} />
            Gelen Faturalar
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download size={18} />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Alış</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(totalPurchases, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <ShoppingCart className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Fatura</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tedarikçi Sayısı</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {new Set(invoiceList.map((inv: IncomingInvoiceResponse) => inv.supplierTaxNumber).filter(Boolean)).size}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl">
              <FileText className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Info Card */}
      {showBanner && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <FileText className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Alış Kayıtları Hakkında
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Bu sayfada BirFatura üzerinden gelen faturalardan oluşturulan alış kayıtları listelenmektedir.
                Detaylı fatura görüntüleme için <strong>Gelen Faturalar</strong> sayfasına gidin.
              </p>
            </div>
            <button
              data-allow-raw="true"
              onClick={() => {
                setShowBanner(false);
                localStorage.setItem(ONBOARDING_PURCHASES_DISMISSED, '1');
              }}
              className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              data-allow-raw="true"
              type="text"
              placeholder="Tedarikçi ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <input
              data-allow-raw="true"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <input
              data-allow-raw="true"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <select
              data-allow-raw="true"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="RECEIVED">Alındı</option>
              <option value="PROCESSED">İşlendi</option>
              <option value="PAID">Ödendi</option>
            </select>
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <Filter size={18} />
              Filtrele
            </Button>
          </div>
        </div>
      </Card>

      {/* Purchases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input data-allow-raw="true" type="checkbox" checked={sortedInvoices.length > 0 && selectedIds.size === sortedInvoices.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceNumber')}>Fatura No<SortIcon field="invoiceNumber" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('supplierName')}>Tedarikçi<SortIcon field="supplierName" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('totalAmount')}>Tutar<SortIcon field="totalAmount" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceDate')}>Tarih<SortIcon field="invoiceDate" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('status')}>Durum<SortIcon field="status" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedInvoices.map((invoice: IncomingInvoiceResponse) => (
                <tr key={invoice.invoiceId} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedIds.has(String(invoice.invoiceId)) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-3 py-4">
                    <input data-allow-raw="true" type="checkbox" checked={selectedIds.has(String(invoice.invoiceId))} onChange={() => toggleSelect(String(invoice.invoiceId))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{invoice.supplierName}</div>
                    {invoice.supplierTaxNumber && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">VKN: {invoice.supplierTaxNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(invoice.totalAmount), invoice.currency || 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                      Detay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoiceList.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Alış kaydı bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Henüz gelen faturadan oluşturulmuş alış kaydı bulunmuyor.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Toplam {totalCount} kayıt, Sayfa {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={16} />
                Önceki
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={page === currentPage ? 'bg-blue-600 text-white' : ''}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Sonraki
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedIds.size} kayıt seçildi</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <button data-allow-raw="true" onClick={handleBulkExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-2xl transition-colors">
            <Download className="w-4 h-4" /> CSV Dışa Aktar
          </button>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <button data-allow-raw="true" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
            <X className="w-4 h-4" /> Seçimi Kaldır
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Alış Detayı</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button data-allow-raw="true" onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tedarikçi</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.supplierName}</p>
                </div>
                {selectedInvoice.supplierTaxNumber && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">VKN</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.supplierTaxNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tutar</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(selectedInvoice.totalAmount), selectedInvoice.currency || 'TRY')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tarih</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Durum</p>
                  <div className="mt-0.5">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
