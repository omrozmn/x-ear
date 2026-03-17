import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, DatePicker, Input, Select, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { ShoppingCart, Search, FileText, X, RefreshCw, Filter, CheckSquare, CreditCard, Square, Plus } from 'lucide-react';
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
import { PermissionGate } from '@/components/PermissionGate';
import { ManualPurchaseModal } from '@/components/purchases/ManualPurchaseModal';
import { useCreateManualPurchase, useManualPurchases, useRecordManualPurchasePayment, type ManualPurchaseRead } from '@/hooks/useManualPurchases';

interface PurchaseTableRow {
  id: string;
  source: 'invoice' | 'manual';
  invoiceNumber: string;
  supplierName: string;
  supplierTaxNumber?: string;
  totalAmount: number;
  invoiceDate?: string;
  status: string;
  currency?: string;
  description?: string;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: string;
  rawInvoice?: IncomingInvoiceResponse;
  rawPurchase?: ManualPurchaseRead;
}

export function PurchasesPage() {
  const { t } = useTranslation('purchases');
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
  const [selectedManualPurchase, setSelectedManualPurchase] = useState<ManualPurchaseRead | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('cash');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading, isFetching, refetch } = useListIncomingInvoices({
    page: 1,
    per_page: 500,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    supplier_name: debouncedSearch || undefined,
    date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
    date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
  });
  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const { data: manualPurchases = [] } = useManualPurchases();
  const createManualPurchaseMutation = useCreateManualPurchase();
  const recordManualPurchasePaymentMutation = useRecordManualPurchasePayment();

  useEffect(() => {
    if (!isMobile) return;
    setMobileVisibleCount(25);
    setSelectedIds(new Set());
    setIsMobileSelectionMode(false);
  }, [isMobile, debouncedSearch, statusFilter, dateFrom, dateTo]);

  const purchaseRows = useMemo<PurchaseTableRow[]>(() => {
    const invoiceRows = invoiceList.map((invoice): PurchaseTableRow => ({
      id: `invoice-${invoice.invoiceId}`,
      source: 'invoice',
      invoiceNumber: invoice.invoiceNumber || '',
      supplierName: invoice.supplierName || '—',
      supplierTaxNumber: invoice.supplierTaxNumber || undefined,
      totalAmount: Number(invoice.totalAmount || 0),
      invoiceDate: invoice.invoiceDate || undefined,
      status: invoice.status || 'RECEIVED',
      currency: invoice.currency || 'TRY',
      description: undefined,
      rawInvoice: invoice,
    }));
    const manualRows = manualPurchases.map((purchase): PurchaseTableRow => ({
      id: `manual-${purchase.id}`,
      source: 'manual',
      invoiceNumber: purchase.referenceNumber || 'MANUEL',
      supplierName: purchase.supplierName || '—',
      totalAmount: Number(purchase.totalAmount || 0),
      invoiceDate: purchase.purchaseDate || undefined,
      status: purchase.status || 'APPROVED',
      currency: purchase.currency || 'TRY',
      description: purchase.notes || undefined,
      paidAmount: Number(purchase.paidAmount || 0),
      remainingAmount: Number(purchase.remainingAmount || 0),
      paymentMethod: purchase.paymentMethod || undefined,
      rawPurchase: purchase,
    }));
    return [...manualRows, ...invoiceRows];
  }, [invoiceList, manualPurchases]);

  const filteredPurchaseRows = useMemo(() => {
    let rows = [...purchaseRows];

    if (debouncedSearch) {
      const term = debouncedSearch.toLocaleLowerCase('tr-TR');
      rows = rows.filter((row) =>
        row.supplierName.toLocaleLowerCase('tr-TR').includes(term) ||
        row.invoiceNumber.toLocaleLowerCase('tr-TR').includes(term) ||
        (row.description || '').toLocaleLowerCase('tr-TR').includes(term)
      );
    }

    if (statusFilter !== 'all') {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (dateFrom) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      rows = rows.filter((row) => row.invoiceDate && String(row.invoiceDate) >= fromStr);
    }

    if (dateTo) {
      const toStr = dateTo.toISOString().split('T')[0];
      rows = rows.filter((row) => row.invoiceDate && String(row.invoiceDate) <= toStr);
    }

    return rows;
  }, [dateFrom, dateTo, debouncedSearch, purchaseRows, statusFilter]);

  const totalCount = filteredPurchaseRows.length;
  const hasMoreMobile = isMobile && mobileVisibleCount < totalCount;

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
    () => filteredPurchaseRows.reduce((sum: number, row: PurchaseTableRow) => sum + Number(row.totalAmount || 0), 0),
    [filteredPurchaseRows]
  );

  const supplierCount = useMemo(
    () => new Set(filteredPurchaseRows.map((row: PurchaseTableRow) => row.supplierName).filter(Boolean)).size,
    [filteredPurchaseRows]
  );

  const sortedInvoices = useMemo(() => {
    const list = [...filteredPurchaseRows];
    if (!sortField) return list;

    list.sort((a: PurchaseTableRow, b: PurchaseTableRow) => {
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
  }, [filteredPurchaseRows, sortField, sortDir]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sortedInvoices.slice(startIndex, endIndex);
  }, [currentPage, perPage, sortedInvoices]);

  const mobileVisibleInvoices = useMemo(
    () => sortedInvoices.slice(0, mobileVisibleCount),
    [mobileVisibleCount, sortedInvoices]
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RECEIVED: 'bg-primary/10 text-blue-800 dark:text-blue-400',
      PROCESSED: 'bg-success/10 text-success',
      PAID: 'bg-success/10 text-success',
      PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      APPROVED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300',
      MANUAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    };
    const labels: Record<string, string> = {
      RECEIVED: 'Alındı',
      PROCESSED: 'İşlendi',
      PAID: 'Ödendi',
      PARTIAL: 'Kısmi Ödendi',
      APPROVED: 'Açık',
      MANUAL: 'Manuel',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-muted text-foreground'}`}>{labels[status] || status}</span>;
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
      ? sortedInvoices.filter((invoice: PurchaseTableRow) => selectedIds.has(invoice.id))
      : sortedInvoices;
    return selected.map((invoice: PurchaseTableRow) => [
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

  const handleCreateManualPurchase = useCallback(async (payload: Parameters<typeof createManualPurchaseMutation.mutateAsync>[0]) => {
    await createManualPurchaseMutation.mutateAsync(payload);
    await refetch();
  }, [createManualPurchaseMutation, refetch]);

  const selectedManualPurchaseIds = useMemo(
    () => sortedInvoices.filter((row) => selectedIds.has(row.id) && row.source === 'manual' && Number(row.remainingAmount || 0) > 0).map((row) => row.rawPurchase?.id).filter(Boolean) as string[],
    [selectedIds, sortedInvoices]
  );

  const handleBulkMarkPaid = useCallback(async () => {
    if (selectedManualPurchaseIds.length === 0) return;
    await recordManualPurchasePaymentMutation.mutateAsync({
      purchaseIds: selectedManualPurchaseIds,
      paymentMethod: bulkPaymentMethod,
    });
    setShowBulkPaymentModal(false);
    setSelectedIds(new Set());
    await refetch();
  }, [bulkPaymentMethod, recordManualPurchasePaymentMutation, refetch, selectedManualPurchaseIds]);

  const renderMobileCards = () => (
    <div className="block md:hidden space-y-3 mt-3">
      {mobileVisibleInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Alış kaydı bulunamadı</h3>
          <p className="text-muted-foreground text-sm mt-1">Henüz gelen faturadan oluşturulmuş alış kaydı yok.</p>
        </div>
      ) : mobileVisibleInvoices.map((invoice: PurchaseTableRow) => (
        <div
          key={invoice.id}
          onClick={() => {
            if (isMobileSelectionMode) toggleSelect(invoice.id);
            else if (invoice.source === 'manual') setSelectedManualPurchase(invoice.rawPurchase || null);
            else setSelectedInvoice(invoice.rawInvoice || null);
          }}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
            selectedIds.has(invoice.id) ? 'border-blue-500 bg-primary/10/50 dark:border-blue-500' : 'border-border'
          )}
        >
          {isMobileSelectionMode && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {selectedIds.has(invoice.id) ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-gray-300" />}
            </div>
          )}
          <div className={cn('p-4 cursor-pointer active:bg-muted dark:active:bg-gray-800 transition-colors', isMobileSelectionMode && 'pr-12')}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invoice.supplierName || '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.invoiceNumber || invoice.description || 'Kayıt Yok'}</p>
              </div>
              <div className="shrink-0">{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="border-t border-border pt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Tarih</p>
                <p className="text-sm font-medium text-foreground">{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tutar</p>
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
        <span className="ml-3 text-muted-foreground">Alış kayıtları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DesktopPageHeader
        title={t('pageTitle', 'Alışlar')}
        description={t('pageDescription', 'Gelen faturalar ve manuel alış kayıtları')}
        icon={<ShoppingCart className="h-6 w-6" />}
        eyebrow={{ tr: 'Satın Alma', en: 'Purchasing' }}
        actions={(
          <>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/incoming' })}>
              <FileText size={18} />
              {t('incomingInvoices', 'Gelen Faturalar')}
            </Button>
            <PermissionGate permission="invoices.documents.download.view">
              <ExportDropdown
                headers={purchaseExportHeaders}
                getRows={getPurchaseExportRows}
                filename="alislar"
              />
            </PermissionGate>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleRefresh}>
              <RefreshCw size={18} />
              {t('refresh', 'Yenile')}
            </Button>
            <div className="ml-auto">
              <PermissionGate permission="invoices.create">
                <Button className="flex items-center gap-2" onClick={() => setShowNewPurchaseModal(true)}>
                  <Plus size={18} />
                  {t('newPurchase', 'Yeni Alış')}
                </Button>
              </PermissionGate>
            </div>
          </>
        )}
      />

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Toplam Alış</p>
              <p className="text-lg md:text-2xl font-bold text-primary mt-1">{formatCurrency(totalPurchases, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-primary/10 rounded-2xl">
              <ShoppingCart className="text-primary w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Toplam Fatura</p>
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
              <p className="text-xs md:text-sm text-muted-foreground">Tedarikçi</p>
              <p className="text-lg md:text-2xl font-bold text-success mt-1">{supplierCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-success/10 rounded-2xl">
              <CreditCard className="text-success w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {showBanner && (
        <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
          <FileText className="text-primary flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
            Bu sayfada sadece alış kayıtları listelenir. Kasa giderleri için Kasa sayfasını, fatura önizleme için Gelen Faturalar sayfasını kullanın.
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setShowBanner(false); localStorage.setItem(ONBOARDING_PURCHASES_DISMISSED, '1'); }} className="text-blue-400 hover:text-primary dark:hover:text-blue-200 flex-shrink-0">
            <X size={18} />
          </Button>
        </div>
      )}

      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
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
                  { value: 'APPROVED', label: 'Açık' },
                  { value: 'PARTIAL', label: 'Kısmi Ödendi' },
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
          <DataTable<PurchaseTableRow>
            data={paginatedInvoices}
            loading={isLoading}
            rowKey={(inv) => inv.id}
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
                render: (_: unknown, inv: PurchaseTableRow) => inv.invoiceNumber || 'MANUEL',
              },
              {
                key: 'supplierName',
                title: 'Tedarikçi',
                sortable: true,
                render: (_: unknown, inv: PurchaseTableRow) => (
                  <div>
                    <div className="text-sm text-gray-900 dark:text-white">{inv.supplierName}</div>
                    {inv.supplierTaxNumber ? (
                      <div className="text-xs text-muted-foreground">VKN: {inv.supplierTaxNumber}</div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'totalAmount',
                title: 'Tutar',
                sortable: true,
                render: (_: unknown, inv: PurchaseTableRow) => (
                  <span className="font-semibold">{formatCurrency(Number(inv.totalAmount), inv.currency || 'TRY')}</span>
                ),
              },
              {
                key: 'invoiceDate',
                title: 'Tarih',
                sortable: true,
                render: (_: unknown, inv: PurchaseTableRow) => inv.invoiceDate ? formatDate(inv.invoiceDate) : '-',
              },
              {
                key: 'status',
                title: 'Durum',
                sortable: true,
                render: (_: unknown, inv: PurchaseTableRow) => getStatusBadge(inv.status),
              },
              {
                key: '_actions',
                title: 'İşlemler',
                render: (_: unknown, inv: PurchaseTableRow) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (inv.source === 'manual') setSelectedManualPurchase(inv.rawPurchase || null);
                      else if (inv.rawInvoice) setSelectedInvoice(inv.rawInvoice);
                    }}
                  >
                    Detay
                  </Button>
                ),
              },
            ] as Column<PurchaseTableRow>[]}
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
        <div className={`fixed ${isMobile ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-2xl px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 w-[90%] md:w-auto overflow-x-auto whitespace-nowrap`}>
          <span className="text-sm font-medium text-foreground">{selectedIds.size} kayıt seçildi</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <PermissionGate permission="invoices.documents.download.view">
            <ExportDropdown
              headers={purchaseExportHeaders}
              getRows={getPurchaseExportRows}
              filename="alislar"
              variant="ghost"
              label="Dışa Aktar"
              compact
              iconClassName="text-primary"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"
            />
          </PermissionGate>
          {selectedManualPurchaseIds.length > 0 ? (
            <>
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
              <PermissionGate permission="invoices.create">
                <Button variant="ghost" onClick={() => setShowBulkPaymentModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-colors h-auto">
                  <CreditCard className="w-4 h-4" />
                  Ödendi İşaretle
                </Button>
              </PermissionGate>
            </>
          ) : null}
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto"><X className="w-4 h-4" /> Seçimi Kaldır</Button>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Alış Detayı</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"><X size={24} /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tedarikçi</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.supplierName}</p>
                </div>
                {selectedInvoice.supplierTaxNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">VKN</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.supplierTaxNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Tutar</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(selectedInvoice.totalAmount), selectedInvoice.currency || 'TRY')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarih</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <div className="mt-0.5">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border bg-gray-50 dark:bg-gray-900">
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}

      {selectedManualPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={() => setSelectedManualPurchase(null)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manuel Alış Detayı</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedManualPurchase.supplierName}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedManualPurchase(null)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"><X size={24} /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(selectedManualPurchase.totalAmount), selectedManualPurchase.currency || 'TRY')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ödenen</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(selectedManualPurchase.paidAmount), selectedManualPurchase.currency || 'TRY')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kalan</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(selectedManualPurchase.remainingAmount), selectedManualPurchase.currency || 'TRY')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <div className="mt-0.5">{getStatusBadge(selectedManualPurchase.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarih</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedManualPurchase.purchaseDate ? formatDate(selectedManualPurchase.purchaseDate) : '-'}</p>
                </div>
                {selectedManualPurchase.notes ? (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Not</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedManualPurchase.notes}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border bg-gray-50 dark:bg-gray-900">
              <Button variant="outline" onClick={() => setSelectedManualPurchase(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}

      {showBulkPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={() => setShowBulkPaymentModal(false)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ödendi Olarak İşaretle</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedManualPurchaseIds.length} manuel alış için kalan tutar kasaya gider olarak işlenecek.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowBulkPaymentModal(false)}><X size={20} /></Button>
            </div>
            <div className="p-6">
              <Select
                label="Ödeme Şekli"
                value={bulkPaymentMethod}
                onChange={(event) => setBulkPaymentMethod(event.target.value)}
                options={[
                  { value: 'cash', label: 'Nakit' },
                  { value: 'card', label: 'Kart' },
                  { value: 'transfer', label: 'Havale/EFT' },
                  { value: 'check', label: 'Çek' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border bg-gray-50 dark:bg-gray-900">
              <Button variant="outline" onClick={() => setShowBulkPaymentModal(false)}>İptal</Button>
              <Button onClick={handleBulkMarkPaid} disabled={recordManualPurchasePaymentMutation.isPending}>
                {recordManualPurchasePaymentMutation.isPending ? 'İşleniyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ManualPurchaseModal
        isOpen={showNewPurchaseModal}
        isLoading={createManualPurchaseMutation.isPending}
        onClose={() => setShowNewPurchaseModal(false)}
        onSubmit={handleCreateManualPurchase}
      />

    </div>
  );
}
