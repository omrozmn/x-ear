import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, Button, DatePicker, Input, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { CreditCard, DollarSign, Search, Download, RefreshCw, Filter, CheckSquare, Square, X, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { useListPaymentRecords } from '@/api/client/payments.client';
import type { PaymentRecordRead } from '@/api/generated/schemas';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/components/PermissionGate';

type PaymentRow = Omit<PaymentRecordRead, 'partyName'> & { partyName?: string };

const paymentMethodLabels: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  credit_card: 'Kredi Kartı',
  check: 'Çek',
  bank_transfer: 'Havale/EFT',
  promissory_note: 'Senet',
};

function formatPaymentMethod(method?: string): string {
  if (!method) return '—';
  return paymentMethodLabels[method.toLowerCase()] ?? method;
}

export function PaymentsPage() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading, isFetching, refetch } = useListPaymentRecords({
    page: isMobile ? 1 : currentPage,
    per_page: isMobile ? mobileVisibleCount : perPage,
  });

  const records: PaymentRow[] = useMemo(() => {
    const payload = data?.data;
    if (!Array.isArray(payload)) return [];
    return payload.map(r => ({ ...r, partyName: r.partyName ?? undefined }));
  }, [data]);

  const totalCount = data?.meta?.total ?? records.length;
  const hasMoreMobile = isMobile && records.length < totalCount;

  useEffect(() => {
    if (!isMobile) return;
    setMobileVisibleCount(25);
    setSelectedIds(new Set());
    setIsMobileSelectionMode(false);
  }, [isMobile, debouncedSearch, dateFrom, dateTo]);

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

  const filteredRecords = useMemo(() => {
    let list = [...records];

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(r =>
        (r.partyName ?? '').toLowerCase().includes(term) ||
        (r.saleId ?? '').toLowerCase().includes(term) ||
        (r.paymentMethod ?? '').toLowerCase().includes(term)
      );
    }

    if (dateFrom) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      list = list.filter(r => r.paymentDate && String(r.paymentDate) >= fromStr);
    }
    if (dateTo) {
      const toStr = dateTo.toISOString().split('T')[0];
      list = list.filter(r => r.paymentDate && String(r.paymentDate) <= toStr);
    }

    return list;
  }, [records, debouncedSearch, dateFrom, dateTo]);

  const totalAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [filteredRecords]
  );
  const averageAmount = filteredRecords.length > 0 ? totalAmount / filteredRecords.length : 0;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const exportToCsv = useCallback(() => {
    const items = selectedIds.size > 0
      ? filteredRecords.filter((r) => selectedIds.has(String(r.id)))
      : filteredRecords;
    const headers = ['Hasta Adı', 'Tutar', 'Satış ID', 'Ödeme Yöntemi', 'Tarih'];
    const rows = items.map((r) => [
      r.partyName || '',
      String(r.amount ?? 0),
      r.saleId || '',
      formatPaymentMethod(r.paymentMethod),
      r.paymentDate ? String(r.paymentDate) : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `odemeler_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('CSV dışa aktarıldı');
  }, [selectedIds, filteredRecords]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const renderMobileCards = () => (
    <div className="block md:hidden space-y-3 mt-3">
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <CreditCard className="h-8 w-8 text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ödeme kaydı bulunamadı</h3>
          <p className="text-gray-500 text-sm mt-1">Kriterlere uygun ödeme yok.</p>
        </div>
      ) : filteredRecords.map((r) => (
        <div
          key={r.id}
          onClick={() => {
            if (isMobileSelectionMode) toggleSelect(String(r.id));
          }}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
            selectedIds.has(String(r.id)) ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'
          )}
        >
          {isMobileSelectionMode && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {selectedIds.has(String(r.id)) ? <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />}
            </div>
          )}
          <div className={cn('p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors', isMobileSelectionMode && 'pr-12')}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.partyName || '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{formatPaymentMethod(r.paymentMethod)}</p>
              </div>
              {r.saleId && <span className="text-xs font-mono text-gray-400 shrink-0">{r.saleId}</span>}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Tarih</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.paymentDate ? formatDate(r.paymentDate) : '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Tutar</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(r.amount, 'TRY')}</p>
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
        <span className="ml-3 text-gray-600 dark:text-gray-400">Ödemeler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DesktopPageHeader
        title="Ödeme Takibi"
        description="Tüm hastalardan alınan ödemeleri takip edin"
        icon={<CreditCard className="h-6 w-6" />}
        eyebrow={{ tr: 'Tahsilat', en: 'Collections' }}
        actions={(
          <>
            <PermissionGate permission="finance.payments.export.view">
              <Button variant="outline" className="flex items-center gap-2" onClick={exportToCsv}>
                <Download size={18} />
                Dışa Aktar
              </Button>
            </PermissionGate>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleRefresh}>
              <RefreshCw size={18} />
              Yenile
            </Button>
          </>
        )}
      />

      {/* Stats Cards - responsive like SalesPage */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Ödeme</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalAmount, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-2xl">
              <DollarSign className="text-green-600 dark:text-green-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Kayıt</p>
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
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Ortalama</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(averageAmount, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <CreditCard className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters toolbar - same as SalesPage */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Hasta adı, satış ID veya ödeme yöntemi ara..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4"
                fullWidth
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="shrink-0 flex items-center gap-2">
              <Filter size={18} />
              Filtreler
            </Button>
            <Button variant="outline" onClick={() => setIsMobileSelectionMode((v) => !v)} className="shrink-0 flex items-center gap-2 md:hidden">
              <CheckSquare size={18} />
              {isMobileSelectionMode ? 'Kapat' : 'Seç'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3">
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
              <Button variant="outline" onClick={clearFilters}>Temizle</Button>
              <Button onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw size={18} />
                Ara
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Table or Mobile Cards */}
      {isMobile ? renderMobileCards() : (
        <Card>
          <DataTable<PaymentRow>
            data={filteredRecords}
            loading={isLoading}
            rowKey="id"
            emptyText="Ödeme bulunamadı"
            hoverable
            striped
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
              { key: 'partyName', title: 'Hasta Adı', render: (_: unknown, r: PaymentRow) => r.partyName || '—' },
              { key: 'amount', title: 'Tutar', render: (_: unknown, r: PaymentRow) => <span className="font-semibold">{formatCurrency(r.amount, 'TRY')}</span> },
              { key: 'saleId', title: 'Satış ID', render: (_: unknown, r: PaymentRow) => r.saleId ? <span className="text-xs font-mono">{r.saleId}</span> : '—' },
              { key: 'paymentMethod', title: 'Ödeme Yöntemi', render: (_: unknown, r: PaymentRow) => formatPaymentMethod(r.paymentMethod) },
              { key: 'paymentDate', title: 'Tarih', render: (_: unknown, r: PaymentRow) => r.paymentDate ? formatDate(r.paymentDate) : '—' },
            ] as Column<PaymentRow>[]}
          />
        </Card>
      )}

      {/* Mobile infinite scroll */}
      {isMobile && hasMoreMobile && <div ref={loadMoreRef} className="h-10 w-full" aria-hidden="true" />}
      {isMobile && isFetching && !isLoading && (
        <div className="flex justify-center pb-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Selection floating bar */}
      {selectedIds.size > 0 && (
        <div className={`fixed ${isMobile ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 w-[90%] md:w-auto overflow-x-auto whitespace-nowrap`}>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedIds.size} kayıt seçildi</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <PermissionGate permission="finance.payments.export.view">
            <Button variant="ghost" onClick={exportToCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"><Download className="w-4 h-4" /> CSV Dışa Aktar</Button>
          </PermissionGate>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto"><X className="w-4 h-4" /> Seçimi Kaldır</Button>
        </div>
      )}
    </div>
  );
}
