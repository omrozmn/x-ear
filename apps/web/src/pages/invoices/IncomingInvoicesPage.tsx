import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Button } from '@x-ear/ui-web';
import { FileText, Download, Filter, Search, AlertCircle, CheckCircle, ShoppingCart, X, ChevronLeft, ChevronRight, Eye, MoreVertical, ChevronUp, ChevronDown as ChevronDownIcon, Copy, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useListIncomingInvoices } from '@/api/generated/invoices/invoices';
import type { IncomingInvoiceResponse } from '@/api/generated/schemas';
import toast from 'react-hot-toast';
import { ONBOARDING_INCOMING_INVOICES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/api/orval-mutator';

async function fetchInvoiceDocument(invoiceId: number | string, format: 'pdf' | 'html' | 'xml'): Promise<{ data: ArrayBuffer; contentType: string }> {
  const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}`, {
    responseType: 'arraybuffer',
  });
  const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
  return { data: resp.data, contentType };
}

async function postInvoiceAction(invoiceId: number | string, action: 'accept' | 'reject' | 'cancel', body?: object): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/${action}`, body ?? {});
}

export function IncomingInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(25);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem(ONBOARDING_INCOMING_INVOICES_DISMISSED));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const menuRef = useRef<HTMLDivElement>(null);
  // Invoice viewer modal
  const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string; fileName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    supplier_name: debouncedSearch || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const invoiceList = data?.data?.invoices ?? [];
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const totalPages = pagination?.totalPages ?? 1;
  const pendingCount = data?.data?.pendingCount ?? 0;
  const processedCount = data?.data?.processedCount ?? 0;

  const getStatusBadge = (status: string) => {
    const isProcessed = status === 'RECEIVED' || status === 'PROCESSED' || status === 'PAID';
    const style = isProcessed
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    const label = isProcessed ? 'İşlendi' : 'Reddedildi';
    const icon = isProcessed
      ? <CheckCircle className="w-3 h-3 mr-1" />
      : <AlertCircle className="w-3 h-3 mr-1" />;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {icon}{label}
      </span>
    );
  };

  const filteredInvoices = useMemo(() => {
    let list = [...invoiceList];
    if (sortField) {
      list.sort((a: IncomingInvoiceResponse, b: IncomingInvoiceResponse) => {
        let av: any, bv: any;
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
    }
    return list;
  }, [invoiceList, sortField, sortDir]);

  const handleViewPdf = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('Fatura yükleniyor...');
    try {
      const { data: buf, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
      const isPdf = contentType.includes('application/pdf');
      const mimeType = isPdf ? 'application/pdf' : 'text/html';
      const blob = new Blob([buf], { type: mimeType });
      const baseUrl = URL.createObjectURL(blob);
      const url = isPdf ? baseUrl + '#pagemode=none&toolbar=1' : baseUrl;
      if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
      toast.dismiss(toastId);
      const fileName = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
      setPdfModal({ open: true, blobUrl: url, title: `${invoice.invoiceNumber} — ${invoice.supplierName}`, fileName });
    } catch {
      toast.error('Fatura yüklenemedi', { id: toastId });
    }
  };

  const handleDownloadPdf = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('PDF indiriliyor...');
    try {
      const { data: buf, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
      const isPdf = contentType.includes('application/pdf');
      const blob = new Blob([buf], { type: isPdf ? 'application/pdf' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF indirildi', { id: toastId });
    } catch {
      // PDF not available from BirFatura, fall back to XML download
      try {
        const buf = await fetchInvoiceDocument(invoice.invoiceId, 'xml');
        const blob = new Blob([buf], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber || invoice.invoiceId}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Fatura XML olarak indirildi (PDF mevcut değil)', { id: toastId });
      } catch {
        toast.error('Belge indirilemedi', { id: toastId });
      }
    }
  };

  const handleViewHtml = async (invoice: IncomingInvoiceResponse) => handleViewPdf(invoice);

  const handleAccept = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`accept-${invoice.invoiceId}`);
    try {
      await postInvoiceAction(invoice.invoiceId, 'accept');
      toast.success('Fatura kabul edildi');
      refetch();
    } catch {
      toast.error('Kabul işlemi başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`reject-${invoice.invoiceId}`);
    try {
      await postInvoiceAction(invoice.invoiceId, 'reject', { reason: 'Reddedildi' });
      toast.success('Fatura reddedildi');
      refetch();
    } catch {
      toast.error('Reddetme işlemi başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    navigator.clipboard.writeText(invoice.invoiceNumber || String(invoice.invoiceId))
      .then(() => toast.success('Fatura no kopyalandı'))
      .catch(() => toast.error('Kopyalanamadı'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Gelen faturalar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gelen Faturalar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            BirFatura'dan gelen faturalar
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => refetch()}>
            <Download size={18} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Fatura</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bekleyen</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Alışa Dönüştürülen</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{processedCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <ShoppingCart className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Auto-conversion info banner */}
      {showBanner && (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
        <ShoppingCart className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
        <p className="text-sm text-green-800 dark:text-green-300 flex-1">
          Gelen faturalar otomatik olarak alış kaydına dönüştürülmektedir. Manuel işlem gerekmez.
        </p>
        <button
          onClick={() => {
            setShowBanner(false);
            localStorage.setItem(ONBOARDING_INCOMING_INVOICES_DISMISSED, '1');
          }}
          className="text-green-400 hover:text-green-600 dark:hover:text-green-200 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tedarikçi adı veya fatura no ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="RECEIVED">İşlenen</option>
              <option value="rejected">Reddedilen</option>
            </select>
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <Filter size={18} />
              Ara
            </Button>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceNumber')}>Fatura No<SortIcon field="invoiceNumber" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('supplierName')}>Tedarikçi<SortIcon field="supplierName" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('totalAmount')}>Tutar<SortIcon field="totalAmount" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceDate')}>Tarih<SortIcon field="invoiceDate" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('status')}>Durum<SortIcon field="status" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice: IncomingInvoiceResponse) => (
                <tr key={invoice.invoiceId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</td>
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
                    {invoice.isConvertedToPurchase && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        Alışa dönüştürüldü
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="relative" ref={activeMenu === String(invoice.invoiceId) ? menuRef : null}>
                      <button
                        onClick={() => setActiveMenu(activeMenu === String(invoice.invoiceId) ? null : String(invoice.invoiceId))}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenu === String(invoice.invoiceId) && (
                        <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <button onClick={() => handleViewPdf(invoice)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Eye className="w-4 h-4" /> Fatura Görüntüle
                          </button>
                          <button onClick={() => handleDownloadPdf(invoice)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Download className="w-4 h-4" /> PDF İndir
                          </button>
                          <button onClick={() => handleCopy(invoice)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Copy className="w-4 h-4" /> Kopyala
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                          <button
                            onClick={() => handleAccept(invoice)}
                            disabled={actionLoading === `accept-${invoice.invoiceId}`}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading === `accept-${invoice.invoiceId}` ? 'İşleniyor...' : 'Kabul Et'}
                          </button>
                          <button
                            onClick={() => handleReject(invoice)}
                            disabled={actionLoading === `reject-${invoice.invoiceId}`}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            {actionLoading === `reject-${invoice.invoiceId}` ? 'İşleniyor...' : 'Reddet'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Gelen fatura bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Arama kriterlerinize uygun gelen fatura yok.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Toplam {totalCount} fatura, Sayfa {currentPage} / {totalPages}
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

      {/* Invoice Viewer Modal */}
      {pdfModal?.open && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">{pdfModal.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={pdfModal.blobUrl.split('#')[0]}
                  download={pdfModal.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  <Download size={15} />
                  İndir
                </a>
                <button
                  onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfModal.blobUrl}
                className="w-full h-full border-0"
                title="Fatura PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
