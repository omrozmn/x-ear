import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Input, Select, DatePicker, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { FileText, Download, Filter, Search, AlertCircle, CheckCircle, ShoppingCart, X, Eye, MoreVertical, Copy, XCircle, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useListIncomingInvoices } from '@/api/client/invoices.client';
import type { IncomingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/generated/schemas';
import toast from 'react-hot-toast';
import { ONBOARDING_INCOMING_INVOICES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/api/orval-mutator';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';
import { ExportDropdown } from '@/components/common/ExportDropdown';
import { PermissionGate } from '@/components/PermissionGate';

async function fetchInvoiceDocument(invoiceId: number | string, format: 'pdf' | 'html' | 'xml', renderMode: 'auto' | 'local' | 'remote' = 'auto'): Promise<{ data: ArrayBuffer; contentType: string }> {
  const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}&render_mode=${renderMode}`, {
    responseType: 'arraybuffer',
  });
  const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
  return { data: resp.data, contentType };
}

async function postInvoiceAction(invoiceId: number | string, action: 'accept' | 'reject' | 'cancel', body?: object): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/${action}`, body ?? {});
}

async function markInvoiceRead(invoiceId: number | string): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/mark-read`);
}

async function syncInvoicesFromProvider(): Promise<{ incoming: number; outgoing: number }> {
  const resp = await apiClient.post<{ data: { incoming: number; outgoing: number } }>('/api/birfatura/sync-invoices', {});
  return resp.data?.data ?? { incoming: 0, outgoing: 0 };
}

export function IncomingInvoicesPage() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(25);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(25);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem(ONBOARDING_INCOMING_INVOICES_DISMISSED));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('invoiceDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const menuRef = useRef<HTMLDivElement>(null);
  // Invoice viewer modal
  const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string; fileName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
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

  useEffect(() => {
    if (!isMobile) return;
    setMobileVisibleCount(25);
    setSelectedIds(new Set());
  }, [isMobile, debouncedSearch, statusFilter, dateFrom, dateTo]);


  const { data, isLoading, isFetching, refetch } = useListIncomingInvoices({
    page: isMobile ? 1 : currentPage,
    per_page: isMobile ? mobileVisibleCount : perPage,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    supplier_name: debouncedSearch || undefined,
    date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
    date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
    sort_field: sortField || undefined,
    sort_dir: sortField ? sortDir : undefined,
  });

  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const pendingCount = data?.data?.pendingCount ?? 0;
  const processedCount = data?.data?.processedCount ?? 0;
  const hasMoreMobile = isMobile && invoiceList.length < totalCount;

  useEffect(() => {
    if (!isMobile || !hasMoreMobile || !mobileLoadMoreRef.current) return;

    const node = mobileLoadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetching) {
          setMobileVisibleCount((prev) => Math.min(prev + 25, totalCount));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, hasMoreMobile, isFetching, totalCount]);

  const renderDocumentBadges = (invoice: IncomingInvoiceResponse) => {
    const inv = invoice;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${inv.documentKind === 'despatch' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300'}`}>
          {inv.documentKindLabel || (inv.documentKind === 'despatch' ? 'E-İrsaliye' : 'E-Fatura')}
        </span>
        {inv.profileId && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground">
            {inv.profileId}
          </span>
        )}
        {inv.invoiceTypeCode && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {inv.invoiceTypeCode}
          </span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const isProcessed = status === 'RECEIVED' || status === 'PROCESSED' || status === 'PAID';
    const style = isProcessed
      ? 'bg-success/10 text-success'
      : 'bg-destructive/10 text-red-800 dark:text-red-400';
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

  const filteredInvoices = invoiceList;

  const handleViewPdf = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('Fatura yükleniyor...');
    try {
      void markInvoiceRead(invoice.invoiceId).catch(() => undefined);
      const { data: buf, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
      const isPdf = contentType.includes('application/pdf');
      const mimeType = isPdf ? 'application/pdf' : 'text/html';
      const blob = new Blob([buf], { type: mimeType });
      const baseUrl = URL.createObjectURL(blob);
      const url = isPdf ? `${baseUrl}#pagemode=none&toolbar=1` : baseUrl;
      if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
      toast.dismiss(toastId);
      const fileName = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
      setPdfModal({ open: true, blobUrl: url, title: `${invoice.invoiceNumber} — ${invoice.supplierName}`, fileName });
    } catch {
      toast.error('Fatura yüklenemedi', { id: toastId });
    }
  };

  const handleOpenRemoteHtml = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading('HTML görünümü hazırlanıyor...');
    try {
      const { data: buf } = await fetchInvoiceDocument(invoice.invoiceId, 'html', 'remote');
      const blob = new Blob([buf], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('HTML görünümü açıldı', { id: toastId });
    } catch {
      toast.error('HTML görünümü açılamadı', { id: toastId });
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

  const handleAccept = async (invoice: IncomingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`accept-${invoice.invoiceId}`);
    try {
      await postInvoiceAction(invoice.invoiceId, 'accept');
      void markInvoiceRead(invoice.invoiceId).catch(() => undefined);
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
      void markInvoiceRead(invoice.invoiceId).catch(() => undefined);
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredInvoices.map((inv: IncomingInvoiceResponse) => String(inv.invoiceId))));
  };
  const handleBulkAccept = async () => {
    const count = selectedIds.size;
    const toastId = toast.loading(`${count} fatura kabul ediliyor...`);
    try {
      await Promise.all(Array.from(selectedIds).map(id => postInvoiceAction(id, 'accept')));
      toast.success(`${count} fatura kabul edildi`, { id: toastId });
      setSelectedIds(new Set()); refetch();
    } catch { toast.error('Toplu kabul işlemi başarısız', { id: toastId }); }
  };
  const handleBulkReject = async () => {
    const count = selectedIds.size;
    const toastId = toast.loading(`${count} fatura reddediliyor...`);
    try {
      await Promise.all(Array.from(selectedIds).map(id => postInvoiceAction(id, 'reject', { reason: 'Toplu reddetme' })));
      toast.success(`${count} fatura reddedildi`, { id: toastId });
      setSelectedIds(new Set()); refetch();
    } catch { toast.error('Toplu reddetme işlemi başarısız', { id: toastId }); }
  };
  const handleSyncFromProvider = async () => {
    setSyncLoading(true);
    const toastId = toast.loading('GİB\'den faturalar çekiliyor...');
    try {
      await syncInvoicesFromProvider();
      toast.success('Senkronizasyon başlatıldı. Faturalar birkaç dakika içinde görünecektir.', { id: toastId });
      setTimeout(() => refetch(), 5000);
    } catch {
      toast.error('Fatura çekme işlemi başarısız', { id: toastId });
    } finally {
      setSyncLoading(false);
    }
  };
  const incomingExportHeaders = useMemo(() => ['Fatura No', 'Tedarikçi', 'VKN', 'Tutar', 'Tarih', 'Durum'], []);

  const getIncomingExportRows = useCallback(() => {
    const selected = selectedIds.size > 0
      ? filteredInvoices.filter((inv: IncomingInvoiceResponse) => selectedIds.has(String(inv.invoiceId)))
      : filteredInvoices;
    return selected.map((inv: IncomingInvoiceResponse) => [
      inv.invoiceNumber || '', inv.supplierName || '', inv.supplierTaxNumber || '',
      String(inv.totalAmount || 0), inv.invoiceDate || '', inv.status || '',
    ]);
  }, [selectedIds, filteredInvoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-muted-foreground">Gelen faturalar yükleniyor...</span>
      </div>
    );
  }

  const incomingInvoiceColumns: Column<IncomingInvoiceResponse>[] = [
    {
      key: 'invoiceNumber',
      title: 'Fatura No',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'supplierName',
      title: 'Tedarikçi',
      sortable: true,
      render: (_, invoice) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{invoice.supplierName}</div>
          {renderDocumentBadges(invoice)}
          {invoice.supplierTaxNumber && (
            <div className="text-xs text-muted-foreground">VKN: {invoice.supplierTaxNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      title: 'Tutar',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(invoice.totalAmount), invoice.currency || 'TRY')}
        </span>
      ),
    },
    {
      key: 'invoiceDate',
      title: 'Tarih',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm text-muted-foreground">{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, invoice) => (
        <div>
          {getStatusBadge(invoice.status)}
          {invoice.isConvertedToPurchase && (
            <div className="text-xs text-success mt-1 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              Alışa dönüştürüldü
            </div>
          )}
        </div>
      ),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      render: (_, invoice) => (
        <div className="relative" ref={activeMenu === String(invoice.invoiceId) ? menuRef : null}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === String(invoice.invoiceId) ? null : String(invoice.invoiceId)); }}
            className="p-1.5"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {activeMenu === String(invoice.invoiceId) && (
            <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-lg">
              <Button variant="ghost" fullWidth onClick={() => handleViewPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                <Eye className="w-4 h-4" /> Fatura Görüntüle
              </Button>
              <Button variant="ghost" fullWidth onClick={() => handleDownloadPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                <Download className="w-4 h-4" /> PDF İndir
              </Button>
              <Button variant="ghost" fullWidth onClick={() => handleOpenRemoteHtml(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                <FileText className="w-4 h-4" /> HTML Aç
              </Button>
              <Button variant="ghost" fullWidth onClick={() => handleCopy(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                <Copy className="w-4 h-4" /> Kopyala
              </Button>
              <div className="border-t border-border" />
              <Button
                variant="ghost"
                fullWidth
                onClick={() => handleAccept(invoice)}
                disabled={actionLoading === `accept-${invoice.invoiceId}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-success hover:bg-success/10 dark:hover:bg-green-900/20 disabled:opacity-50 justify-start h-auto"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading === `accept-${invoice.invoiceId}` ? 'İşleniyor...' : 'Kabul Et'}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => handleReject(invoice)}
                disabled={actionLoading === `reject-${invoice.invoiceId}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
              >
                <XCircle className="w-4 h-4" />
                {actionLoading === `reject-${invoice.invoiceId}` ? 'İşleniyor...' : 'Reddet'}
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <DesktopPageHeader
        title="Gelen Faturalar"
        description="GİB'den gelen faturalar"
        icon={<ShoppingCart className="h-6 w-6" />}
        eyebrow={{ tr: 'Gelen Kuyruğu', en: 'Incoming Queue' }}
        actions={(
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={handleSyncFromProvider}
              disabled={syncLoading}
            >
              <RefreshCw size={18} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? 'Çekiliyor...' : 'Faturaları Çek'}
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => refetch()}>
              <Download size={18} />
              Yenile
            </Button>
          </div>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Toplam Fatura</p>
              <p className="text-lg md:text-2xl font-bold text-primary mt-1">{totalCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-primary/10 rounded-2xl">
              <FileText className="text-primary w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Bekleyen</p>
              <p className="text-lg md:text-2xl font-bold text-success mt-1">{pendingCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-success/10 rounded-2xl">
              <CheckCircle className="text-success w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Alışa Dönüştürülen</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{processedCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl">
              <ShoppingCart className="text-purple-600 dark:text-purple-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Auto-conversion info banner */}
      {showBanner && (
        <div className="bg-success/10 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
          <ShoppingCart className="text-success flex-shrink-0" size={20} />
          <p className="text-sm text-success flex-1">
            Gelen faturalar otomatik olarak alış kaydına dönüştürülmektedir. Manuel işlem gerekmez.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem(ONBOARDING_INCOMING_INVOICES_DISMISSED, '1');
            }}
            className="text-green-400 hover:text-success dark:hover:text-green-200 flex-shrink-0"
          >
            <X size={18} />
          </Button>
        </div>
      )}

      <Card className="p-3 md:hidden">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="text"
                placeholder="Tedarikçi adı veya fatura no ara..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="w-full pl-10 pr-4"
                fullWidth
              />
            </div>
            <Button variant="outline" onClick={() => setShowMobileFilters((value) => !value)} className="shrink-0 flex items-center gap-2">
              <Filter size={18} />
              Filtreler
            </Button>
            <Button variant="outline" onClick={() => setIsMobileSelectionMode((value) => !value)} className="shrink-0 flex items-center gap-2">
              <CheckSquare size={18} />
              {isMobileSelectionMode ? 'Kapat' : 'Seç'}
            </Button>
          </div>

          {showMobileFilters && (
            <div className="grid grid-cols-1 gap-3">
              <DatePicker
                placeholder="Başlangıç"
                value={dateFrom}
                onChange={(date) => { setDateFrom(date); setCurrentPage(1); }}
              />
              <DatePicker
                placeholder="Bitiş"
                value={dateTo}
                onChange={(date) => { setDateTo(date); setCurrentPage(1); }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'RECEIVED', label: 'İşlenen' },
                  { value: 'rejected', label: 'Reddedilen' }
                ]}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setDateFrom(null); setDateTo(null); setStatusFilter('all'); setSearchTerm(''); setCurrentPage(1); }}>Temizle</Button>
                <Button onClick={() => refetch()} className="flex items-center gap-2">
                  <RefreshCw size={18} />
                  Ara
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      <Card className="hidden md:block p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Tedarikçi adı veya fatura no ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-10 pr-4"
              fullWidth
            />
          </div>
          <div className="flex gap-2 items-end">
            <DatePicker
              placeholder="Başlangıç"
              value={dateFrom}
              onChange={(date) => { setDateFrom(date); setCurrentPage(1); }}
              className="w-[140px]"
            />
            <DatePicker
              placeholder="Bitiş"
              value={dateTo}
              onChange={(date) => { setDateTo(date); setCurrentPage(1); }}
              className="w-[140px]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2"
              options={[
                { value: 'all', label: 'Tüm Durumlar' },
                { value: 'RECEIVED', label: 'İşlenen' },
                { value: 'rejected', label: 'Reddedilen' }
              ]}
            />
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <RefreshCw size={18} />
              Ara
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile Selection Action Bar (< md) */}
      {isMobileSelectionMode && (
        <div className="md:hidden flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={() => setIsMobileSelectionMode(false)} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Kapat
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-primary font-medium">
            {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? 'Hiçbiri' : 'Tümünü Seç'}
          </Button>
        </div>
      )}

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-3 mt-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Gelen fatura bulunamadı</h3>
          </div>
        ) : filteredInvoices.map((invoice: IncomingInvoiceResponse) => (
          <IncomingInvoiceMobileCard
            key={invoice.invoiceId}
            invoice={invoice}
            onView={() => handleViewPdf(invoice)}
            onAccept={() => handleAccept(invoice)}
            onReject={() => handleReject(invoice)}
            onDownload={() => handleDownloadPdf(invoice)}
            getStatusBadge={getStatusBadge}
            actionLoading={actionLoading}
            isSelectionMode={isMobileSelectionMode}
            isSelected={selectedIds.has(String(invoice.invoiceId))}
            onToggleSelect={() => toggleSelect(String(invoice.invoiceId))}
          />
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <Card className="hidden md:block">
        <DataTable<IncomingInvoiceResponse>
          data={filteredInvoices}
          columns={incomingInvoiceColumns}
          loading={isLoading}
          rowKey={(inv) => String(inv.invoiceId)}
          onRowClick={(invoice) => handleViewPdf(invoice)}
          rowSelection={{
            selectedRowKeys: Array.from(selectedIds),
            onChange: (keys) => setSelectedIds(new Set(keys.map(String))),
          }}
          sortable
          onSort={(key, dir) => { if (dir) { setSortField(key); setSortDir(dir); } else { setSortField(''); } }}
          pagination={{
            current: currentPage,
            pageSize: perPage,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: [10, 25, 50, 100],
            onChange: (p) => { setCurrentPage(p); },
          }}
        />
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-3xl md:w-auto">
          <div className="rounded-2xl border border-border bg-white/95 shadow-2xl backdrop-blur dark:bg-gray-800/95">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border md:hidden">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedIds.size} fatura seçildi</p>
                <p className="text-xs text-muted-foreground">Toplu işlem seçerek devam edebilirsin</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-9 rounded-xl px-3 text-muted-foreground hover:bg-muted dark:hover:bg-gray-700">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 md:hidden">
              <Button variant="ghost" onClick={handleBulkAccept} className="flex items-center justify-center gap-2 rounded-xl bg-success/10 px-3 py-3 text-sm font-semibold text-success hover:bg-success/10 dark:hover:bg-green-900/30 h-auto">
                <CheckCircle className="w-4 h-4" /> Kabul Et
              </Button>
              <Button variant="ghost" onClick={handleBulkReject} className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/30 h-auto">
                <XCircle className="w-4 h-4" /> Reddet
              </Button>
              <PermissionGate permission="invoices.documents.download.view">
                <ExportDropdown
                  headers={incomingExportHeaders}
                  getRows={getIncomingExportRows}
                  filename="gelen_faturalar"
                  variant="ghost"
                  label="Dışa Aktar"
                  compact
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-3 text-sm font-semibold text-primary hover:bg-primary/10 dark:hover:bg-blue-900/30 h-auto"
                />
              </PermissionGate>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-3 text-sm font-semibold text-foreground hover:bg-accent dark:hover:bg-gray-600 h-auto">
                <X className="w-4 h-4" /> Temizle
              </Button>
            </div>

            <div className="hidden md:flex items-center gap-4 px-6 py-3 whitespace-nowrap">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} fatura seçildi</span>
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
              <Button variant="ghost" onClick={handleBulkAccept} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-success hover:bg-success/10 dark:hover:bg-green-900/20 rounded-2xl transition-colors h-auto">
                <CheckCircle className="w-4 h-4" /> Toplu Kabul
              </Button>
              <Button variant="ghost" onClick={handleBulkReject} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 rounded-2xl transition-colors h-auto">
                <XCircle className="w-4 h-4" /> Toplu Reddet
              </Button>
              <PermissionGate permission="invoices.documents.download.view">
                <ExportDropdown
                  headers={incomingExportHeaders}
                  getRows={getIncomingExportRows}
                  filename="gelen_faturalar"
                  variant="ghost"
                  label="Dışa Aktar"
                  compact
                  iconClassName="text-primary"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"
                />
              </PermissionGate>
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto">
                <X className="w-4 h-4" /> Seçimi Kaldır
              </Button>
            </div>
          </div>
        </div>
      )}

      {isMobile && hasMoreMobile && (
        <div ref={mobileLoadMoreRef} className="h-10 w-full" aria-hidden="true" />
      )}

      {isMobile && isFetching && !isLoading && (
        <div className="flex justify-center pb-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {pdfModal?.open && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">{pdfModal.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={pdfModal.blobUrl.split('#')[0]}
                  download={pdfModal.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white premium-gradient tactile-press rounded-xl"
                >
                  <Download size={15} />
                  İndir
                </a>
                <Button
                  variant="ghost"
                  onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                  className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"
                >
                  <X size={24} />
                </Button>
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

// ─── Mobile Card Component ────────────────────────────────────────────────────
interface IncomingInvoiceMobileCardProps {
  invoice: IncomingInvoiceResponse;
  onView: () => void;
  onAccept: () => void;
  onReject: () => void;
  onDownload: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  actionLoading: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function IncomingInvoiceMobileCard({ invoice, onView, onAccept, onReject, onDownload, getStatusBadge, actionLoading, isSelectionMode, isSelected, onToggleSelect }: IncomingInvoiceMobileCardProps) {
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
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all", isSelected ? "border-blue-500 bg-primary/10/50 dark:border-blue-500" : "border-border")}>
      {isSelectionMode && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {isSelected ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-gray-300" />
          )}
        </div>
      )}
      {/* Tappable card body */}
      <div
        className={cn("p-4 cursor-pointer active:bg-muted dark:active:bg-gray-800 transition-colors", isSelectionMode && "pr-12")}
        onClick={() => {
          if (isSelectionMode && onToggleSelect) onToggleSelect();
          else onView();
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.supplierName}</p>
            {invoice.supplierTaxNumber && (
              <p className="text-xs text-muted-foreground">VKN: {invoice.supplierTaxNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {getStatusBadge(invoice.status)}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-xl">
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onView(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Eye className="w-4 h-4" /> Görüntüle
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onDownload(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Download className="w-4 h-4" /> PDF İndir
                  </Button>
                  <div className="border-t border-border" />
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => { setMenuOpen(false); onAccept(); }}
                    disabled={actionLoading === `accept-${invoice.invoiceId}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-success hover:bg-success/10 dark:hover:bg-green-900/20 disabled:opacity-50 justify-start h-auto"
                  >
                    <CheckCircle className="w-4 h-4" /> Kabul Et
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => { setMenuOpen(false); onReject(); }}
                    disabled={actionLoading === `reject-${invoice.invoiceId}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
                  >
                    <XCircle className="w-4 h-4" /> Reddet
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(Number(invoice.totalAmount), invoice.currency || 'TRY')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(invoice.invoiceDate)}
          </span>
        </div>
        {invoice.isConvertedToPurchase && (
          <div className="mt-2 text-xs text-success flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> Alışa dönüştürüldü
          </div>
        )}
      </div>
    </div>
  );
}
