import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, Button, DatePicker, Input, Select, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { ShoppingCart, Search, FileText, X, RefreshCw, Filter, CheckSquare, CreditCard, Square } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useNavigate } from '@tanstack/react-router';
import { useListIncomingInvoices } from '@/api/client/invoices.client';
import type { IncomingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/generated/schemas';
import { ONBOARDING_PURCHASES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { ExportDropdown } from '@/components/common/ExportDropdown';

export function PurchasesPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(25);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem(ONBOARDING_PURCHASES_DISMISSED));
  const [selectedInvoice, setSelectedInvoice] = useState<IncomingInvoiceResponse | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading, isFetching, refetch } = useListIncomingInvoices({
    page: isMobile ? 1 : currentPage,
    per_page: isMobile ? mobileVisibleCount : perPage,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    supplier_name: debouncedSearch || undefined,
    date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
    date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
  });

  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const hasMoreMobile = isMobile && invoiceList.length < totalCount;

  useEffect(() => {
    if (!isMobile) return;
    setMobileVisibleCount(25);
    setSelectedIds(new Set());
    setIsMobileSelectionMode(false);
  }, [isMobile, debouncedSearch, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!isMobile || !hasMoreMobile || !loadMoreRef.current || isLoading || isFetching) return;

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setMobileVisibleCount((prev) => Math.min(prev + 25, totalCount));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, hasMoreMobile, isLoading, isFetching, totalCount]);

  const totalPurchases = useMemo(
    () => invoiceList.reduce((sum: number, invoice: IncomingInvoiceResponse) => sum + Number(invoice.totalAmount || 0), 0),
    [invoiceList]
  );

  const supplierCount = useMemo(
    () => new Set(invoiceList.map((invoice: IncomingInvoiceResponse) => invoice.supplierTaxNumber).filter(Boolean)).size,
    [invoiceList]
  );

  const sortedInvoices = useMemo(() => {
    const list = [...invoiceList];
    if (!sortField) return list;

    list.sort((a: IncomingInvoiceResponse, b: IncomingInvoiceResponse) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortField === 'supplierName') { av = a.supplierName || ''; bv = b.supplierName || ''; }
      else if (sortField === 'invoiceNumber') { av = a.invoiceNumber || ''; bv = b.invoiceNumber || ''; }
      else if (sortField === 'invoiceDate') { av = a.invoiceDate || ''; bv = b.invoiceDate || ''; }
      else if (sortField === 'totalAmount') { av = Number(a.totalAmount || 0); bv = Number(b.totalAmount || 0); }
      else if (sortField === 'status') { av = a.status || ''; bv = b.status || ''; }

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
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{labels[status] || status}</span>;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const purchaseExportHeaders = useMemo(() => ['Fatura No', 'Tedarikçi', 'VKN', 'Tutar', 'Tarih', 'Durum'], []);

  const getPurchaseExportRows = useCallback(() => {
    const selected = selectedIds.size > 0
      ? sortedInvoices.filter((invoice: IncomingInvoiceResponse) => selectedIds.has(String(invoice.invoiceId)))
      : sortedInvoices;
    return selected.map((invoice: IncomingInvoiceResponse) => [
      invoice.invoiceNumber || '', invoice.supplierName || '', invoice.supplierTaxNumber || '',
      String(invoice.totalAmount || 0), invoice.invoiceDate || '', invoice.status || '',
    ]);
  }, [selectedIds, sortedInvoices]);

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderMobileCards = () => (
    <div className="block md:hidden space-y-3 mt-3">
      {sortedInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Alış kaydı bulunamadı</h3>
          <p className="text-gray-500 text-sm mt-1">Henüz gelen faturadan oluşturulmuş alış kaydı yok.</p>
        </div>
      ) : sortedInvoices.map((invoice: IncomingInvoiceResponse) => (
        <div
          key={invoice.invoiceId}
          onClick={() => {
            if (isMobileSelectionMode) toggleSelect(String(invoice.invoiceId));
            else setSelectedInvoice(invoice);
          }}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
            selectedIds.has(String(invoice.invoiceId)) ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'
          )}
        >
          {isMobileSelectionMode && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {selectedIds.has(String(invoice.invoiceId)) ? <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />}
            </div>
          )}
          <div className={cn('p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors', isMobileSelectionMode && 'pr-12')}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invoice.supplierName || '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{invoice.invoiceNumber || 'Fatura No Yok'}</p>
              </div>
              <div className="shrink-0">{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Tarih</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Tutar</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(Number(invoice.totalAmount || 0), invoice.currency || 'TRY')}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

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
      <DesktopPageHeader
        title="Alışlar"
        description="Gelen faturalardan oluşturulan alış kayıtları"
        icon={<ShoppingCart className="h-6 w-6" />}
        eyebrow={{ tr: 'Satın Alma', en: 'Purchasing' }}
        actions={(
          <>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/incoming' })}>
              <FileText size={18} />
              Gelen Faturalar
            </Button>
            <ExportDropdown
              headers={purchaseExportHeaders}
              getRows={getPurchaseExportRows}
              filename="alislar"
            />
            <Button variant="outline" className="flex items-center gap-2" onClick={handleRefresh}>
              <RefreshCw size={18} />
              Yenile
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Alış</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totalPurchases, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <ShoppingCart className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Fatura</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl">
              <FileText className="text-purple-600 dark:text-purple-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Tedarikçi</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{supplierCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-2xl">
              <CreditCard className="text-green-600 dark:text-green-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {showBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
          <FileText className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
            Bu sayfada gelen faturalardan oluşan alış kayıtları listelenir. Fatura önizleme için Gelen Faturalar sayfasını kullanın.
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setShowBanner(false); localStorage.setItem(ONBOARDING_PURCHASES_DISMISSED, '1'); }} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0">
            <X size={18} />
          </Button>
        </div>
      )}

      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Tedarikçi ara..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4"
                fullWidth
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters((value) => !value)} className="shrink-0 flex items-center gap-2">
              <Filter size={18} />
              Filtreler
            </Button>
            <Button variant="outline" onClick={() => setIsMobileSelectionMode((value) => !value)} className="shrink-0 flex items-center gap-2 md:hidden">
              <CheckSquare size={18} />
              {isMobileSelectionMode ? 'Kapat' : 'Seç'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_auto_auto] gap-3">
              <DatePicker placeholder="Başlangıç" value={dateFrom} onChange={(date) => { setDateFrom(date); setCurrentPage(1); }} />
              <DatePicker placeholder="Bitiş" value={dateTo} onChange={(date) => { setDateTo(date); setCurrentPage(1); }} />
              <Select
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'RECEIVED', label: 'Alındı' },
                  { value: 'PROCESSED', label: 'İşlendi' },
                  { value: 'PAID', label: 'Ödendi' },
                ]}
              />
              <Button variant="outline" onClick={clearFilters}>Temizle</Button>
              <Button onClick={handleRefresh} className="flex items-center gap-2"><RefreshCw size={18} />Ara</Button>
            </div>
          )}
        </div>
      </Card>

      {isMobile ? renderMobileCards() : (
        <Card>
          <DataTable<IncomingInvoiceResponse>
            data={sortedInvoices}
            loading={isLoading}
            rowKey={(inv) => String(inv.invoiceId)}
            emptyText="Alış kaydı bulunamadı"
            hoverable
            striped
            sortable
            onSort={(key, dir) => {
              if (dir) { setSortField(key); setSortDir(dir); }
              else { setSortField(''); }
            }}
            rowSelection={{
              selectedRowKeys: Array.from(selectedIds),
              onChange: (keys) => setSelectedIds(new Set(keys.map(String))),
            }}
            pagination={{
              current: currentPage,
              pageSize: perPage,
              total: totalCount,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (p: number, ps: number) => { setCurrentPage(p); setPerPage(ps); },
            }}
            columns={[
              {
                key: 'invoiceNumber',
                title: 'Fatura No',
                sortable: true,
                render: (_: unknown, inv: IncomingInvoiceResponse) => inv.invoiceNumber,
              },
              {
                key: 'supplierName',
                title: 'Tedarikçi',
                sortable: true,
                render: (_: unknown, inv: IncomingInvoiceResponse) => (
                  <div>
                    <div className="text-sm text-gray-900 dark:text-white">{inv.supplierName}</div>
                    {inv.supplierTaxNumber && <div className="text-xs text-gray-500 dark:text-gray-400">VKN: {inv.supplierTaxNumber}</div>}
                  </div>
                ),
              },
              {
                key: 'totalAmount',
                title: 'Tutar',
                sortable: true,
                render: (_: unknown, inv: IncomingInvoiceResponse) => (
                  <span className="font-semibold">{formatCurrency(Number(inv.totalAmount), inv.currency || 'TRY')}</span>
                ),
              },
              {
                key: 'invoiceDate',
                title: 'Tarih',
                sortable: true,
                render: (_: unknown, inv: IncomingInvoiceResponse) => formatDate(inv.invoiceDate),
              },
              {
                key: 'status',
                title: 'Durum',
                sortable: true,
                render: (_: unknown, inv: IncomingInvoiceResponse) => getStatusBadge(inv.status),
              },
              {
                key: '_actions',
                title: 'İşlemler',
                render: (_: unknown, inv: IncomingInvoiceResponse) => (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}>Detay</Button>
                ),
              },
            ] as Column<IncomingInvoiceResponse>[]}
          />
        </Card>
      )}

      {isMobile && hasMoreMobile && <div ref={loadMoreRef} className="h-10 w-full" aria-hidden="true" />}
      {isMobile && isFetching && !isLoading && (
        <div className="flex justify-center pb-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className={`fixed ${isMobile ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 w-[90%] md:w-auto overflow-x-auto whitespace-nowrap`}>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedIds.size} kayıt seçildi</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <ExportDropdown
            headers={purchaseExportHeaders}
            getRows={getPurchaseExportRows}
            filename="alislar"
            variant="ghost"
            label="Dışa Aktar"
            compact
            iconClassName="text-blue-600"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"
          />
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto"><X className="w-4 h-4" /> Seçimi Kaldır</Button>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Alış Detayı</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></Button>
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(selectedInvoice.totalAmount), selectedInvoice.currency || 'TRY')}</p>
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
