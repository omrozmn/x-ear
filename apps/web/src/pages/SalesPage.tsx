import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, Button, DatePicker, Input, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { ShoppingCart, Search, FileText, X, RefreshCw, Filter, CheckSquare, CreditCard, Square, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useCreateSales, useListSales } from '@/api/client/sales.client';
import type { SaleCreate, SaleRead } from '@/api/generated/schemas';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from '@tanstack/react-router';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { ExportDropdown } from '@/components/common/ExportDropdown';
import { ManualSaleModal } from '@/components/sales/ManualSaleModal';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/PermissionGate';
import { useTranslation } from 'react-i18next';

interface SalesTableRow {
  id: string;
  source: 'sale';
  partyId?: string;
  patientName?: string | null; // legacy
  productName: string;
  amount: number;
  saleDate?: string;
  status: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  description?: string;
  rawSale?: SaleRead;
}

export function SalesPage() {
  const { t } = useTranslation('sales');
  const { hasPermission } = usePermissions();
  const canViewAmounts = hasPermission('sensitive.sales.list.amounts.view');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(25);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);


  const { data, isLoading, isFetching, refetch } = useListSales({
    page: 1,
    per_page: 100,
    search: debouncedSearch || undefined,
    include_details: true,
  });
  const salesList: SaleRead[] = useMemo(() => {
    const payload = data?.data;
    return Array.isArray(payload) ? payload : [];
  }, [data]);
  const createSaleMutation = useCreateSales();

  useEffect(() => {
    if (!isMobile) return;
    setMobileVisibleCount(25);
    setSelectedIds(new Set());
    setIsMobileSelectionMode(false);
  }, [isMobile, debouncedSearch, dateFrom, dateTo]);

  const salesRows = useMemo<SalesTableRow[]>(() => {
    return salesList.map((sale): SalesTableRow => {
      const patient = sale.patient as { firstName?: string; lastName?: string } | undefined;
      return {
        id: `sale-${sale.id}`,
        source: 'sale',
        partyId: sale.partyId || undefined,
        patientName: (patient?.firstName || patient?.lastName) ? `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() : null, // legacy
        productName: sale.productName || sale.brand || '-',
        amount: Number(sale.finalAmount || sale.totalAmount || 0),
        saleDate: sale.saleDate ? String(sale.saleDate) : undefined,
        status: String(sale.status || 'draft'),
        serialNumber: sale.serialNumber || undefined,
        brand: sale.brand || undefined,
        model: sale.model || undefined,
        rawSale: sale,
      };
    });
  }, [salesList]);

  const totalCount = salesRows.length;
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

  const sortedSales = useMemo(() => {
    let list = [...salesRows];

    if (dateFrom) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      list = list.filter((sale) => sale.saleDate && String(sale.saleDate) >= fromStr);
    }
    if (dateTo) {
      const toStr = dateTo.toISOString().split('T')[0];
      list = list.filter((sale) => sale.saleDate && String(sale.saleDate) <= toStr);
    }
    if (!sortField) return list;

    list.sort((a: SalesTableRow, b: SalesTableRow) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortField === 'patient') {
        av = a.patientName || ''; // legacy
        bv = b.patientName || ''; // legacy
      } else if (sortField === 'productName') {
        av = a.productName || a.brand || '';
        bv = b.productName || b.brand || '';
      } else if (sortField === 'saleDate') {
        av = String(a.saleDate || '');
        bv = String(b.saleDate || '');
      } else if (sortField === 'finalAmount') {
        av = Number(a.amount || 0);
        bv = Number(b.amount || 0);
      } else if (sortField === 'status') {
        av = String(a.status || '');
        bv = String(b.status || '');
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [salesRows, sortField, sortDir, dateFrom, dateTo]);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sortedSales.slice(startIndex, endIndex);
  }, [currentPage, perPage, sortedSales]);

  const mobileVisibleSales = useMemo(
    () => sortedSales.slice(0, mobileVisibleCount),
    [mobileVisibleCount, sortedSales]
  );

  const totalAmount = useMemo(
    () => sortedSales.reduce((sum: number, sale: SalesTableRow) => sum + Number(sale.amount || 0), 0),
    [sortedSales]
  );
  const averageAmount = sortedSales.length > 0 ? totalAmount / sortedSales.length : 0;
  const protectedCurrency = (amount: number) => canViewAmounts ? formatCurrency(amount, 'TRY') : 'Bu rol icin gizli';

  const getStatusBadge = (status?: string | null) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-foreground/20',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
      confirmed: 'bg-primary/10 text-blue-800 dark:text-blue-400',
      completed: 'bg-success/10 text-success',
      delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      paid: 'bg-success/10 text-success',
      cancelled: 'bg-destructive/10 text-red-800 dark:text-red-400',
      manual: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    };
    const labels: Record<string, string> = {
      draft: 'Taslak',
      pending: 'Beklemede',
      confirmed: 'Onaylandı',
      completed: 'Tamamlandı',
      delivered: 'Teslim Edildi',
      partial: 'Kısmi',
      paid: 'Ödendi',
      cancelled: 'İptal Edildi',
      manual: 'Manuel',
    };
    const value = (status || 'draft').toLowerCase();
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[value] || styles.draft}`}>{labels[value] || status || 'Taslak'}</span>;
  };

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const salesExportHeaders = useMemo(() => [t('columns.patientName', 'Hasta Adı'), t('columns.patientId', 'Hasta ID'), t('columns.product', 'Ürün'), t('columns.brand', 'Marka'), t('columns.model', 'Model'), t('columns.amount', 'Tutar'), t('columns.date', 'Tarih'), t('columns.status', 'Durum'), t('columns.serialNumber', 'Seri No')], [t]); // legacy

  const getSalesExportRows = useCallback(() => {
    const items = selectedIds.size > 0 ? sortedSales.filter((sale) => selectedIds.has(sale.id)) : sortedSales;
    return items.map((sale) => {
      return [
        sale.patientName || '', // legacy
        sale.partyId || '',
        sale.productName || '',
        sale.brand || '',
        sale.model || '',
        String(sale.amount || 0),
        sale.saleDate ? String(sale.saleDate) : '',
        sale.status || '',
        sale.serialNumber || '',
      ];
    });
  }, [selectedIds, sortedSales]);

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

  const handleCreateSale = useCallback(async (payload: SaleCreate) => {
    await createSaleMutation.mutateAsync({ data: payload });
    await refetch();
  }, [createSaleMutation, refetch]);

  const renderMobileCards = () => (
    <div className="block md:hidden space-y-3 mt-3">
      {mobileVisibleSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Satış kaydı bulunamadı</h3>
          <p className="text-muted-foreground text-sm mt-1">Kriterlere uygun satış yok.</p>
        </div>
      ) : mobileVisibleSales.map((sale) => (
        <div
          key={sale.id}
          onClick={() => {
            if (isMobileSelectionMode) toggleSelect(String(sale.id));
            else if (sale.partyId) navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId } });
          }}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
            selectedIds.has(String(sale.id)) ? 'border-blue-500 bg-primary/10/50 dark:border-blue-500' : 'border-border'
          )}
        >
          {isMobileSelectionMode && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {selectedIds.has(String(sale.id)) ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-gray-300" />}
            </div>
          )}
          <div className={cn('p-4 cursor-pointer active:bg-muted dark:active:bg-gray-800 transition-colors', isMobileSelectionMode && 'pr-12')}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sale.patientName ?? '—'}</p>{/* legacy */}
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{sale.productName || sale.brand || sale.description || '-'}</p>
              </div>
              <div className="shrink-0">{getStatusBadge(sale.status as string)}</div>
            </div>
            <div className="border-t border-border pt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Tarih</p>
                <p className="text-sm font-medium text-foreground">{sale.saleDate ? formatDate(String(sale.saleDate)) : '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tutar</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{protectedCurrency(Number(sale.amount || 0))}</p>
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
        <span className="ml-3 text-muted-foreground">{t('loading', 'Satışlar yükleniyor...')}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DesktopPageHeader
        title={t('pageTitle', 'Satışlar')}
        description={t('pageDescription', 'Tüm hastaların satış kayıtlarını görüntüleyin ve yönetin')}
        icon={<ShoppingCart className="h-6 w-6" />}
        eyebrow={{ tr: 'Gelir', en: 'Revenue' }}
        actions={(
          <>
            <PermissionGate permission="sales.list.export.view">
              <ExportDropdown
                headers={salesExportHeaders}
                getRows={getSalesExportRows}
                filename="satislar"
              />
            </PermissionGate>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleRefresh}>
              <RefreshCw size={18} />
              {t('refresh', 'Yenile')}
            </Button>
            <div className="ml-auto">
              <PermissionGate permission="sales.create">
                <Button className="flex items-center gap-2" onClick={() => setShowNewSaleModal(true)}>
                  <Plus size={18} />
                  {t('newSale', 'Yeni Satış')}
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
              <p className="text-xs md:text-sm text-muted-foreground">{t('stats.totalSales', 'Toplam Satış')}</p>
              <p className="text-lg md:text-2xl font-bold text-primary mt-1">{protectedCurrency(totalAmount)}</p>
            </div>
            <div className="p-2 md:p-3 bg-primary/10 rounded-2xl">
              <ShoppingCart className="text-primary w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Toplam Kayıt</p>
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
              <p className="text-xs md:text-sm text-muted-foreground">Ortalama</p>
              <p className="text-lg md:text-2xl font-bold text-success mt-1">{protectedCurrency(averageAmount)}</p>
            </div>
            <div className="p-2 md:p-3 bg-success/10 rounded-2xl">
              <CreditCard className="text-success w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="text"
                placeholder="Hasta adı, ürün veya seri no ara..."
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

      {isMobile ? renderMobileCards() : (
        <Card>
          <DataTable<SalesTableRow>
            data={paginatedSales}
            loading={isLoading}
            rowKey={(sale) => sale.id}
            emptyText="Satış kaydı bulunamadı"
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
                key: 'patient',
                title: 'Hasta',
                sortable: true,
                render: (_: unknown, sale: SalesTableRow) => (
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{sale.patientName ?? <span className="text-muted-foreground">—</span>}</div>{/* legacy */}
                    {sale.partyId && <div className="text-xs text-muted-foreground font-mono mt-0.5">{sale.partyId.slice(0, 8)}</div>}
                  </div>
                ),
              },
              {
                key: 'productName',
                title: 'Ürün',
                sortable: true,
                render: (_: unknown, sale: SalesTableRow) => sale.productName || sale.brand || sale.description || '-',
              },
              {
                key: 'finalAmount',
                title: 'Tutar',
                sortable: true,
                render: (_: unknown, sale: SalesTableRow) => (
                  <span className="text-sm font-semibold">{protectedCurrency(Number(sale.amount || 0))}</span>
                ),
              },
              {
                key: 'saleDate',
                title: 'Tarih',
                sortable: true,
                render: (_: unknown, sale: SalesTableRow) => sale.saleDate ? formatDate(String(sale.saleDate)) : '-',
              },
              {
                key: 'status',
                title: 'Durum',
                sortable: true,
                render: (_: unknown, sale: SalesTableRow) => getStatusBadge(sale.status as string),
              },
              {
                key: '_actions',
                title: 'İşlemler',
                render: (_: unknown, sale: SalesTableRow) => (
                  <Button variant="ghost" size="sm" onClick={() => sale.partyId && navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId } })} disabled={!sale.partyId}>Hasta Detayı</Button>
                ),
              },
            ] as Column<SalesTableRow>[]}
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
          <PermissionGate permission="sales.list.export.view">
            <ExportDropdown
              headers={salesExportHeaders}
              getRows={getSalesExportRows}
              filename="satislar"
              variant="ghost"
              label="Dışa Aktar"
              compact
              iconClassName="text-primary"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"
            />
          </PermissionGate>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto"><X className="w-4 h-4" /> Seçimi Kaldır</Button>
        </div>
      )}

      <ManualSaleModal
        isOpen={showNewSaleModal}
        isLoading={createSaleMutation.isPending}
        onClose={() => setShowNewSaleModal(false)}
        onSubmit={handleCreateSale}
      />

    </div>
  );
}
