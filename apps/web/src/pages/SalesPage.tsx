import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, Button, DatePicker, Input } from '@x-ear/ui-web';
import { ShoppingCart, Download, Search, FileText, ChevronLeft, ChevronRight, ChevronUp, ChevronDown as ChevronDownIcon, X, RefreshCw, Filter, CheckSquare, Square, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useListSales } from '@/api/client/sales.client';
import type { SaleRead } from '@/api/generated/schemas';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

export function SalesPage() {
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return sortDir === 'asc' ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDownIcon className="inline w-3 h-3 ml-1" />;
  };

  const { data, isLoading, isFetching, refetch } = useListSales({
    page: isMobile ? 1 : currentPage,
    per_page: isMobile ? mobileVisibleCount : perPage,
    search: debouncedSearch || undefined,
    include_details: true,
  });

  const salesList: SaleRead[] = useMemo(() => {
    const payload = data?.data;
    return Array.isArray(payload) ? payload : [];
  }, [data]);

  const totalCount = data?.meta?.total ?? salesList.length;
  const totalPages = data?.meta?.totalPages ?? (Math.ceil(totalCount / perPage) || 1);
  const hasMoreMobile = isMobile && salesList.length < totalCount;

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

  const sortedSales = useMemo(() => {
    let list = [...salesList];

    if (dateFrom) {
      const fromStr = dateFrom.toISOString().split('T')[0];
      list = list.filter((sale) => sale.saleDate && String(sale.saleDate) >= fromStr);
    }
    if (dateTo) {
      const toStr = dateTo.toISOString().split('T')[0];
      list = list.filter((sale) => sale.saleDate && String(sale.saleDate) <= toStr);
    }
    if (!sortField) return list;

    list.sort((a: SaleRead, b: SaleRead) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortField === 'patient') {
        const pa = a.patient as { firstName?: string; lastName?: string } | undefined;
        const pb = b.patient as { firstName?: string; lastName?: string } | undefined;
        av = pa ? `${pa.firstName || ''} ${pa.lastName || ''}`.trim() : '';
        bv = pb ? `${pb.firstName || ''} ${pb.lastName || ''}`.trim() : '';
      } else if (sortField === 'productName') {
        av = a.productName || a.brand || '';
        bv = b.productName || b.brand || '';
      } else if (sortField === 'saleDate') {
        av = String(a.saleDate || '');
        bv = String(b.saleDate || '');
      } else if (sortField === 'finalAmount') {
        av = Number(a.finalAmount || a.totalAmount || 0);
        bv = Number(b.finalAmount || b.totalAmount || 0);
      } else if (sortField === 'status') {
        av = String(a.status || '');
        bv = String(b.status || '');
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [salesList, sortField, sortDir, dateFrom, dateTo]);

  const totalAmount = useMemo(
    () => sortedSales.reduce((sum: number, sale: SaleRead) => sum + Number(sale.finalAmount || sale.totalAmount || 0), 0),
    [sortedSales]
  );
  const averageAmount = sortedSales.length > 0 ? totalAmount / sortedSales.length : 0;

  const getStatusBadge = (status?: string | null) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    const labels: Record<string, string> = {
      draft: 'Taslak',
      confirmed: 'Onaylandı',
      delivered: 'Teslim Edildi',
      paid: 'Ödendi',
      cancelled: 'İptal Edildi',
    };
    const value = (status || 'draft').toLowerCase();
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[value] || styles.draft}`}>{labels[value] || status || 'Taslak'}</span>;
  };

  const getPatientName = (sale: SaleRead) => {
    const patient = sale.patient as { firstName?: string; lastName?: string } | undefined;
    if (patient?.firstName || patient?.lastName) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    return null;
  };

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const exportToCsv = useCallback(() => {
    const items = selectedIds.size > 0 ? sortedSales.filter((sale) => selectedIds.has(String(sale.id))) : sortedSales;
    const headers = ['Hasta Adı', 'Hasta ID', 'Ürün', 'Marka', 'Model', 'Tutar', 'Tarih', 'Durum', 'Seri No'];
    const rows = items.map((sale) => {
      const patient = sale.patient as { firstName?: string; lastName?: string } | undefined;
      const name = (patient?.firstName || patient?.lastName) ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '';
      return [
        name,
        sale.partyId || '',
        sale.productName || '',
        sale.brand || '',
        sale.model || '',
        String(sale.finalAmount || sale.totalAmount || 0),
        sale.saleDate ? String(sale.saleDate) : '',
        sale.status || '',
        sale.serialNumber || '',
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `satislar_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('CSV dışa aktarıldı');
  }, [selectedIds, sortedSales]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedSales.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedSales.map((sale) => String(sale.id))));
  };

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const renderMobileCards = () => (
    <div className="block md:hidden space-y-3 mt-3">
      {sortedSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Satış kaydı bulunamadı</h3>
          <p className="text-gray-500 text-sm mt-1">Kriterlere uygun satış yok.</p>
        </div>
      ) : sortedSales.map((sale) => (
        <div
          key={sale.id}
          onClick={() => {
            if (isMobileSelectionMode) toggleSelect(String(sale.id));
            else if (sale.partyId) navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId } });
          }}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
            selectedIds.has(String(sale.id)) ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'
          )}
        >
          {isMobileSelectionMode && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {selectedIds.has(String(sale.id)) ? <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />}
            </div>
          )}
          <div className={cn('p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors', isMobileSelectionMode && 'pr-12')}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{getPatientName(sale) ?? '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{sale.productName || sale.brand || '-'}</p>
              </div>
              <div className="shrink-0">{getStatusBadge(sale.status as string)}</div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Tarih</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{sale.saleDate ? formatDate(String(sale.saleDate)) : '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Tutar</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(Number(sale.finalAmount || sale.totalAmount || 0), 'TRY')}</p>
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
        <span className="ml-3 text-gray-600 dark:text-gray-400">Satışlar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Satışlar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tüm hastaların satış kayıtlarını görüntüleyin ve yönetin</p>
        </div>
        <div className="hidden md:flex gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={exportToCsv}>
            <Download size={18} />
            Dışa Aktar
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleRefresh}>
            <RefreshCw size={18} />
            Yenile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Satış</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totalAmount, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <ShoppingCart className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-6 md:h-6" />
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
              <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(averageAmount, 'TRY')}</p>
            </div>
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-2xl">
              <CreditCard className="text-green-600 dark:text-green-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input data-allow-raw="true" type="checkbox" checked={sortedSales.length > 0 && selectedIds.size === sortedSales.length} onChange={toggleSelectAll} className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('patient')}>Hasta<SortIcon field="patient" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('productName')}>Ürün<SortIcon field="productName" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('finalAmount')}>Tutar<SortIcon field="finalAmount" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('saleDate')}>Tarih<SortIcon field="saleDate" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('status')}>Durum<SortIcon field="status" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedSales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedIds.has(String(sale.id)) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-3 py-4">
                      <input data-allow-raw="true" type="checkbox" checked={selectedIds.has(String(sale.id))} onChange={() => toggleSelect(String(sale.id))} className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{getPatientName(sale) ?? <span className="text-gray-400">—</span>}</div>
                      {sale.partyId && <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{sale.partyId.slice(0, 8)}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{sale.productName || sale.brand || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(sale.finalAmount || sale.totalAmount || 0), 'TRY')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{sale.saleDate ? formatDate(String(sale.saleDate)) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(sale.status as string)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button variant="ghost" size="sm" onClick={() => sale.partyId && navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId } })}>Hasta Detayı</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedSales.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Satış kaydı bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Arama kriterlerinize uygun satış kaydı yok.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Toplam {totalCount} kayıt</span>
                <select
                  data-allow-raw="true"
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={10}>10 / sayfa</option>
                  <option value={20}>20 / sayfa</option>
                  <option value={50}>50 / sayfa</option>
                  <option value={100}>100 / sayfa</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>İlk</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}><ChevronLeft size={16} />Önceki</Button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-2">Sayfa {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>Sonraki<ChevronRight size={16} /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>Son</Button>
              </div>
            </div>
          )}
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
          <Button variant="ghost" onClick={exportToCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors h-auto"><Download className="w-4 h-4" /> CSV Dışa Aktar</Button>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto"><X className="w-4 h-4" /> Seçimi Kaldır</Button>
        </div>
      )}
    </div>
  );
}
