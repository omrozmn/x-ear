import { Button, Card, Input, Select } from '@x-ear/ui-web';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, Download, Filter, Search, CheckCircle, AlertCircle, Send, ChevronLeft, ChevronRight, Eye, X, Plus, MoreVertical, ChevronUp, ChevronDown as ChevronDownIcon, Copy, XCircle, Clock, Ban, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useListOutgoingInvoices } from '@/api/client/invoices.client';
import type { OutgoingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/client/invoices.client';
import { ONBOARDING_OUTGOING_INVOICES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
interface InvoiceLog {
  id?: string;
  status?: string;
  description?: string;
  createDate?: string;
  createTime?: string;
}

interface InvoiceManagementPageProps {
  className?: string;
}

async function fetchInvoiceDocument(invoiceId: string | number, format: 'pdf' | 'html' | 'xml'): Promise<{ data: ArrayBuffer; contentType: string }> {
  const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}`, {
    responseType: 'arraybuffer',
  });
  const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
  return { data: resp.data, contentType };
}

async function postInvoiceAction(invoiceId: string | number, action: 'accept' | 'reject' | 'cancel', body?: object): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/${action}`, body ?? {});
}

export const DesktopInvoicesPage: React.FC<InvoiceManagementPageProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(25);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showBanner, setShowBanner] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_OUTGOING_INVOICES_DISMISSED ?? 'outgoing_invoices_dismissed'); } catch { return true; }
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string; fileName: string } | null>(null);
  const [statusModal, setStatusModal] = useState<OutgoingInvoiceResponse | null>(null);
  const [statusLogs, setStatusLogs] = useState<InvoiceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Clear selection on page/filter change
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage, statusFilter]);

  // Fetch BirFatura document logs when status modal opens
  useEffect(() => {
    if (!statusModal) { setStatusLogs([]); return; }
    setLogsLoading(true);
    apiClient.get(`/api/invoices/${statusModal.invoiceId}/logs`)
      .then((res) => {
        const data = res.data?.data ?? [];
        setStatusLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => setStatusLogs([]))
      .finally(() => setLogsLoading(false));
  }, [statusModal]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return sortDir === 'asc' ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDownIcon className="inline w-3 h-3 ml-1" />;
  };

  const { data, isLoading, refetch } = useListOutgoingInvoices({
    page: currentPage,
    per_page: perPage,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    party_name: debouncedSearch || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const totalAmount = Number(data?.data?.totalAmount ?? 0);
  const paidAmount = Number(data?.data?.paidAmount ?? 0);
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const totalPages = pagination?.totalPages ?? 1;

  const filteredInvoices = useMemo(() => {
    const list = [...invoiceList];
    if (sortField) {
      list.sort((a: OutgoingInvoiceResponse, b: OutgoingInvoiceResponse) => {
        let av: string | number = '', bv: string | number = '';
        if (sortField === 'party') { av = `${a.partyFirstName} ${a.partyLastName}`; bv = `${b.partyFirstName} ${b.partyLastName}`; }
        else if (sortField === 'invoiceNumber') { av = a.invoiceNumber || ''; bv = b.invoiceNumber || ''; }
        else if (sortField === 'invoiceDate') { av = a.invoiceDate || ''; bv = b.invoiceDate || ''; }
        else if (sortField === 'totalAmount') { av = Number(a.totalAmount || 0); bv = Number(b.totalAmount || 0); }
        else if (sortField === 'status') { av = a.status || ''; bv = b.status || ''; }

        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [invoiceList, sortField, sortDir]);

  const renderDocumentBadges = (invoice: OutgoingInvoiceResponse) => (
    <div className="mt-1 flex flex-wrap gap-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${invoice.documentKind === 'despatch' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300'}`}>
        {invoice.documentKindLabel || (invoice.documentKind === 'despatch' ? 'E-İrsaliye' : 'E-Fatura')}
      </span>
      {invoice.profileId && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {invoice.profileId}
        </span>
      )}
      {invoice.invoiceTypeCode && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {invoice.invoiceTypeCode}
        </span>
      )}
    </div>
  );

  const getStatusBadge = (status: string, invoice?: OutgoingInvoiceResponse) => {
    const s = (status || '').toUpperCase();
    let style = '';
    let label = '';
    let icon = <AlertCircle className="w-3 h-3 mr-1" />;
    if (s === 'SENT' || s === 'DELIVERED') {
      style = 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      label = s === 'DELIVERED' ? 'İletildi' : 'Gönderildi';
      icon = <Send className="w-3 h-3 mr-1" />;
    } else if (s === 'PAID') {
      style = 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      label = 'Ödendi';
      icon = <CreditCard className="w-3 h-3 mr-1" />;
    } else if (s === 'PROCESSED') {
      style = 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      label = 'İşlendi';
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'CANCELLED' || s === 'CANCELED') {
      style = 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      label = 'İptal Edildi';
      icon = <Ban className="w-3 h-3 mr-1" />;
    } else if (s === 'REJECTED') {
      style = 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      label = 'Reddedildi';
      icon = <XCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'OVERDUE') {
      style = 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      label = 'Vadesi Geçti';
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'DRAFT') {
      style = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      label = 'Taslak';
      icon = <Clock className="w-3 h-3 mr-1" />;
    } else {
      style = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      label = status || 'Bilinmiyor';
      icon = <Clock className="w-3 h-3 mr-1" />;
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style} ${invoice ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={invoice ? () => setStatusModal(invoice) : undefined}
        title={invoice ? 'Durum detayı için tıklayın' : undefined}
      >
        {icon}{label}
      </span>
    );
  };

  const handleViewPdf = async (invoice: OutgoingInvoiceResponse) => {
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
      setPdfModal({ open: true, blobUrl: url, title: `${invoice.invoiceNumber} — ${invoice.partyFirstName} ${invoice.partyLastName}`, fileName });
    } catch {
      toast.error('Fatura yüklenemedi', { id: toastId });
    }
  };

  const handleDownloadPdf = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('İndiriliyor...');
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
      toast.success(isPdf ? 'PDF indirildi' : 'Fatura indirildi', { id: toastId });
    } catch {
      // Fallback to XML download
      try {
        const { data: buf } = await fetchInvoiceDocument(invoice.invoiceId, 'xml');
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

  // handleViewHtml removed as it was unused

  const handleCancel = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`cancel-${invoice.invoiceId}`);
    try {
      if ((invoice.status || '').toUpperCase() === 'DRAFT') {
        await apiClient.delete(`/api/invoices/draft/${invoice.invoiceId}`);
        toast.success('Taslak silindi');
      } else {
        await postInvoiceAction(invoice.invoiceId, 'cancel', { reason: 'İptal edildi' });
        toast.success('Fatura iptal edildi');
      }
      refetch();
    } catch {
      toast.error((invoice.status || '').toUpperCase() === 'DRAFT' ? 'Taslak silinemedi' : 'İptal işlemi başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  // Copy invoice content as a new draft via API — add to table directly
  const handleCopy = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('Fatura kopyalanıyor...');
    try {
      await apiClient.post(`/api/invoices/${invoice.invoiceId}/copy`);
      toast.success('Fatura taslak olarak kopyalandı', { id: toastId });
      refetch();
    } catch {
      toast.error('Kopyalama başarısız', { id: toastId });
    }
  };

  // Copy invoice as draft AND cancel the current invoice
  const handleCopyAndCancel = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`cancel-${invoice.invoiceId}`);
    try {
      await apiClient.post(`/api/invoices/${invoice.invoiceId}/copy`);
      await postInvoiceAction(invoice.invoiceId, 'cancel', { reason: 'Kopyalanarak iptal edildi' });
      toast.success('Fatura kopyalandı ve orijinali iptal edildi');
      refetch();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredInvoices.map((inv: OutgoingInvoiceResponse) => inv.invoiceId)));
  };
  const handleBulkCancel = async () => {
    const count = selectedIds.size;
    const toastId = toast.loading(`${count} fatura iptal ediliyor...`);
    try {
      await Promise.all(Array.from(selectedIds).map(id => postInvoiceAction(id, 'cancel', { reason: 'Toplu iptal' })));
      toast.success(`${count} fatura iptal edildi`, { id: toastId });
      setSelectedIds(new Set()); refetch();
    } catch { toast.error('Toplu iptal işlemi başarısız', { id: toastId }); }
  };
  const handleBulkExportCsv = () => {
    const selected = filteredInvoices.filter((inv: OutgoingInvoiceResponse) => selectedIds.has(inv.invoiceId));
    const headers = ['Fatura No', 'Alıcı', 'Tutar', 'Tarih', 'Durum'];
    const rows = selected.map((inv: OutgoingInvoiceResponse) => [
      inv.invoiceNumber || '', `${inv.partyFirstName || ''} ${inv.partyLastName || ''}`.trim(),
      String(inv.totalAmount || 0), inv.invoiceDate || '', inv.status || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `giden_faturalar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV dışa aktarıldı');
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Giden faturalar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Giden Faturalar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            BirFatura üzerinden gönderilen faturalar
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => refetch()}>
            <Download size={16} />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/new', search: { type: 'proforma' } as { type?: string; draftId?: number } })}>
            <FileText size={16} />
            <span className="hidden sm:inline">Proforma</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/new', search: { documentKind: 'despatch' } as { type?: string; draftId?: number; documentKind?: 'invoice' | 'despatch' } })}>
            <Send size={16} />
            <span className="hidden sm:inline">Yeni E-İrsaliye</span>
          </Button>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate({ to: '/invoices/new' })}>
            <Plus size={16} />
            <span className="hidden sm:inline">Yeni Fatura</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Fatura</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Tutar</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(totalAmount, 'TRY')}
              </p>
            </div>
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Send className="text-green-600 dark:text-green-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Ödenen Tutar</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(paidAmount, 'TRY')}
              </p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CheckCircle className="text-purple-600 dark:text-purple-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Info Banner */}
      {showBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <Send className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
            Bu sayfada BirFatura üzerinden gönderilmiş e-fatura ve e-irsaliyeleriniz listelenmektedir.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBanner(false);
              try { localStorage.setItem(ONBOARDING_OUTGOING_INVOICES_DISMISSED ?? 'outgoing_invoices_dismissed', '1'); } catch (err) { console.error(err); }
            }}
            className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0"
          >
            <X size={18} />
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Alıcı adı veya fatura no ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-10 pr-4"
              fullWidth
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2"
              placeholder="Başlangıç"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2"
              placeholder="Bitiş"
            />
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2"
              options={[
                { value: 'all', label: 'Tüm Durumlar' },
                { value: 'SENT', label: 'Gönderildi' },
                { value: 'PAID', label: 'Ödendi' },
                { value: 'draft', label: 'Taslak' }
              ]}
            />
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <Filter size={18} />
              Ara
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Giden fatura bulunamadı</h3>
          </div>
        ) : filteredInvoices.map((invoice: OutgoingInvoiceResponse) => (
          <InvoiceMobileCard
            key={invoice.invoiceId}
            invoice={invoice}
            onView={() => handleViewPdf(invoice)}
            onDownload={() => handleDownloadPdf(invoice)}
            onCopy={() => handleCopy(invoice)}
            onCopyAndCancel={() => handleCopyAndCancel(invoice)}
            onCancel={() => handleCancel(invoice)}
            getStatusBadge={getStatusBadge}
            actionLoading={actionLoading}
          />
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-3 w-10">
                  <Input type="checkbox" checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length} onChange={toggleSelectAll} className="w-4 h-4" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceNumber')}>Fatura No<SortIcon field="invoiceNumber" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('party')}>Alıcı<SortIcon field="party" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('totalAmount')}>Tutar<SortIcon field="totalAmount" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('invoiceDate')}>Tarih<SortIcon field="invoiceDate" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('status')}>Durum<SortIcon field="status" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice: OutgoingInvoiceResponse) => (
                <tr
                  key={invoice.invoiceId}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${selectedIds.has(invoice.invoiceId) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  onClick={() => {
                    if ((invoice.status || '').toUpperCase() === 'DRAFT') {
                      navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } });
                    } else {
                      handleViewPdf(invoice);
                    }
                  }}
                >
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <Input type="checkbox" checked={selectedIds.has(invoice.invoiceId)} onChange={() => toggleSelect(invoice.invoiceId)} className="w-4 h-4" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {invoice.partyFirstName} {invoice.partyLastName}
                    </div>
                    {renderDocumentBadges(invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(invoice.totalAmount), 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {getStatusBadge(invoice.status, invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="relative" ref={activeMenu === invoice.invoiceId ? menuRef : null}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMenu(activeMenu === invoice.invoiceId ? null : invoice.invoiceId)}
                        className="p-1.5"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {activeMenu === invoice.invoiceId && (
                        <div className="absolute right-0 z-50 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          {(invoice.status || '').toUpperCase() === 'DRAFT' ? (
                            <>
                              <Button variant="ghost" fullWidth onClick={() => { setActiveMenu(null); navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } }); }} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                                <FileText className="w-4 h-4" /> Taslağı Düzenle
                              </Button>
                              <div className="border-t border-gray-100 dark:border-gray-700" />
                              <Button
                                variant="ghost"
                                fullWidth
                                onClick={() => handleCancel(invoice)}
                                disabled={actionLoading === `cancel-${invoice.invoiceId}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
                              >
                                <XCircle className="w-4 h-4" />
                                {actionLoading === `cancel-${invoice.invoiceId}` ? 'İşleniyor...' : 'Taslağı Sil'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" fullWidth onClick={() => handleViewPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                                <Eye className="w-4 h-4" /> Fatura Görüntüle
                              </Button>
                              <Button variant="ghost" fullWidth onClick={() => handleDownloadPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                                <Download className="w-4 h-4" /> PDF İndir
                              </Button>
                              <Button variant="ghost" fullWidth onClick={() => handleCopy(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                                <Copy className="w-4 h-4" /> Faturayı Kopyala (Taslak)
                              </Button>
                              <div className="border-t border-gray-100 dark:border-gray-700" />
                              <Button
                                variant="ghost"
                                fullWidth
                                onClick={() => handleCopyAndCancel(invoice)}
                                disabled={!!actionLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 justify-start h-auto"
                              >
                                <Copy className="w-4 h-4" />
                                {actionLoading?.startsWith(`cancel-`) ? 'İşleniyor...' : 'Kopyala ve İptal Et'}
                              </Button>
                              <Button
                                variant="ghost"
                                fullWidth
                                onClick={() => handleCancel(invoice)}
                                disabled={actionLoading === `cancel-${invoice.invoiceId}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
                              >
                                <XCircle className="w-4 h-4" />
                                {actionLoading === `cancel-${invoice.invoiceId}` ? 'İşleniyor...' : 'İptal Et'}
                              </Button>
                            </>
                          )}
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Giden fatura bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Arama kriterlerinize uygun giden fatura yok.
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedIds.size} fatura seçildi</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={handleBulkCancel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors h-auto">
            <Ban className="w-4 h-4" /> Toplu İptal
          </Button>
          <Button variant="ghost" onClick={handleBulkExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors h-auto">
            <Download className="w-4 h-4" /> CSV Dışa Aktar
          </Button>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors h-auto">
            <X className="w-4 h-4" /> Seçimi Kaldır
          </Button>
        </div>
      )}

      {/* PDF Viewer Modal */}
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
                <Button
                  variant="ghost"
                  onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={pdfModal.blobUrl} className="w-full h-full border-0" title="Fatura PDF" />
            </div>
          </div>
        </div>
      )}

      {/* Status Modal with BirFatura Log History */}
      {statusModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setStatusModal(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fatura Durumu</h2>
              <Button
                variant="ghost"
                onClick={() => setStatusModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Fatura No</p><p className="text-sm font-medium text-gray-900 dark:text-white">{statusModal.invoiceNumber}</p></div>
                <div><p className="text-xs text-gray-500">Alıcı</p><p className="text-sm font-medium text-gray-900 dark:text-white">{statusModal.partyFirstName} {statusModal.partyLastName}</p></div>
                <div><p className="text-xs text-gray-500">Tarih</p><p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(statusModal.invoiceDate)}</p></div>
                <div><p className="text-xs text-gray-500">Tutar</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(statusModal.totalAmount), 'TRY')}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Mevcut Durum</p>
                  {getStatusBadge(statusModal.status)}
                </div>
              </div>

              {/* BirFatura Log History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  İşlem Geçmişi
                </h3>
                {logsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    Yükleniyor...
                  </div>
                ) : statusLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">İşlem geçmişi bulunamadı.</p>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4">
                      {statusLogs.map((log, idx) => (
                        <div key={log.id ?? idx} className="relative pl-4">
                          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-800" />
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{log.description || log.status || 'Adım'}</p>
                          {(log.createDate || log.createTime) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {log.createDate ? `${log.createDate} ` : ''}{log.createTime ? log.createTime.split('.')[0] : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Button variant="outline" onClick={() => setStatusModal(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Mobile Card Component ───────────────────────────────────────────────────
interface InvoiceMobileCardProps {
  invoice: OutgoingInvoiceResponse;
  onView: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onCopyAndCancel: () => void;
  onCancel: () => void;
  getStatusBadge: (status: string, invoice?: OutgoingInvoiceResponse) => React.ReactNode;
  actionLoading: string | null;
}

function InvoiceMobileCard({ invoice, onView, onDownload, onCopy, onCopyAndCancel, onCancel, getStatusBadge, actionLoading }: InvoiceMobileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
      {/* Tappable card body */}
      <div
        className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
        onClick={onView}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {invoice.partyFirstName} {invoice.partyLastName}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {getStatusBadge(invoice.status)}
            {/* Actions ⋮ button */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 text-gray-400"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onView(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                    <Eye className="w-4 h-4" /> Görüntüle
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onDownload(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                    <Download className="w-4 h-4" /> PDF İndir
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCopy(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start h-auto">
                    <Copy className="w-4 h-4" /> Kopyala (Taslak)
                  </Button>
                  <div className="border-t border-gray-100 dark:border-gray-700" />
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCopyAndCancel(); }} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 justify-start h-auto">
                    <Copy className="w-4 h-4" /> Kopyala ve İptal Et
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCancel(); }} disabled={actionLoading === `cancel-${invoice.invoiceId}`} className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto">
                    <XCircle className="w-4 h-4" /> İptal Et
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(invoice.totalAmount), 'TRY')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(invoice.invoiceDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
