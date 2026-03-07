import React, { useState, useMemo } from 'react';
import { Card, Button } from '@x-ear/ui-web';
import { ShoppingCart, Download, Filter, Search, FileText, DollarSign, ChevronLeft, ChevronRight, ChevronUp, ChevronDown as ChevronDownIcon, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useListSales } from '@/api/generated/sales/sales';
import type { SaleRead } from '@/api/generated/schemas';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';

export function SalesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(25);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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

  const { data, isLoading, refetch } = useListSales({
    page: currentPage,
    per_page: perPage,
    search: debouncedSearch || undefined,
    include_details: true,
  });

  // ResponseEnvelope[List[SaleRead]] → data.data is the array
  const salesList: SaleRead[] = useMemo(() => {
    const d = data?.data;
    if (Array.isArray(d)) return d;
    return [];
  }, [data]);

  const totalCount = data?.meta?.total ?? salesList.length;
  const totalPages = data?.meta?.totalPages ?? (Math.ceil(totalCount / perPage) || 1);

  const totalAmount = useMemo(() =>
    salesList.reduce((sum: number, s: SaleRead) => sum + Number(s.finalAmount || s.totalAmount || 0), 0),
    [salesList]
  );

  const sortedSales = useMemo(() => {
    let list = [...salesList];
    // Client-side date filtering
    if (dateFrom) list = list.filter(s => s.saleDate && String(s.saleDate) >= dateFrom);
    if (dateTo) list = list.filter(s => s.saleDate && String(s.saleDate) <= dateTo);
    if (!sortField) return list;
    list.sort((a: SaleRead, b: SaleRead) => {
      let av: any, bv: any;
      if (sortField === 'patient') {
        const pa = a.patient as any; const pb = b.patient as any;
        av = pa ? `${pa.firstName || ''} ${pa.lastName || ''}`.trim() : '';
        bv = pb ? `${pb.firstName || ''} ${pb.lastName || ''}`.trim() : '';
      } else if (sortField === 'productName') { av = a.productName || a.brand || ''; bv = b.productName || b.brand || ''; }
      else if (sortField === 'saleDate') { av = String(a.saleDate || ''); bv = String(b.saleDate || ''); }
      else if (sortField === 'finalAmount') { av = Number(a.finalAmount || a.totalAmount || 0); bv = Number(b.finalAmount || b.totalAmount || 0); }
      else if (sortField === 'status') { av = String(a.status || ''); bv = String(b.status || ''); }
      else { av = ''; bv = ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [salesList, sortField, sortDir]);

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
    const s = (status || 'draft').toLowerCase();
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[s] || styles.draft}`}>
        {labels[s] || status || 'Taslak'}
      </span>
    );
  };

  const getPatientName = (sale: SaleRead) => {
    const p = sale.patient as any;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return null;
  };

  const exportToCsv = () => {
    const items = selectedIds.size > 0 ? sortedSales.filter((s: SaleRead) => selectedIds.has(String(s.id))) : sortedSales;
    const headers = ['Hasta Adı', 'Hasta ID', 'Ürün', 'Marka', 'Model', 'Tutar', 'Tarih', 'Durum', 'Seri No'];
    const rows = items.map((s: SaleRead) => {
      const p = s.patient as any;
      const name = (p?.firstName || p?.lastName) ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
      return [
        name,
        s.partyId || '',
        s.productName || '',
        s.brand || '',
        s.model || '',
        String(s.finalAmount || s.totalAmount || 0),
        s.saleDate ? String(s.saleDate) : '',
        s.status || '',
        s.serialNumber || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satislar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (selectedIds.size > 0) { toast.success('Seçili kayıtlar CSV olarak dışa aktarıldı'); setSelectedIds(new Set()); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedSales.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedSales.map((s: SaleRead) => String(s.id))));
  };

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tüm Hasta Satışları</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tüm hastaların satış kayıtlarını görüntüleyin ve yönetin</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={exportToCsv}>
            <Download size={18} />
            Dışa Aktar
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => refetch()}>
            <Filter size={18} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Satış</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(totalAmount, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Kayıt</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FileText className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ortalama</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {salesList.length > 0 ? formatCurrency(totalAmount / salesList.length, 'TRY') : '₺0'}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Hasta adı, ürün veya seri no ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(dateFrom || dateTo || searchTerm) && (
            <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); setSearchTerm(''); setCurrentPage(1); }} className="whitespace-nowrap">
              Temizle
            </Button>
          )}
        </div>
      </Card>

      {/* Sales Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={sortedSales.length > 0 && selectedIds.size === sortedSales.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
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
              {sortedSales.map((sale: SaleRead) => (
                <tr key={sale.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedIds.has(String(sale.id)) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-3 py-4">
                    <input type="checkbox" checked={selectedIds.has(String(sale.id))} onChange={() => toggleSelect(String(sale.id))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {getPatientName(sale) ?? <span className="text-gray-400">—</span>}
                    </div>
                    {sale.partyId && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                        {sale.partyId.slice(0, 8)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {sale.productName || sale.brand || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(sale.finalAmount || sale.totalAmount || 0), 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {sale.saleDate ? formatDate(String(sale.saleDate)) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(sale.status as string)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId! } })}
                    >
                      Hasta Detayı
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {salesList.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Satış kaydı bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Arama kriterlerinize uygun satış kaydı yok.
            </p>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedIds.size} kayıt seçildi</span>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
            <button onClick={exportToCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
              <Download className="w-4 h-4" /> CSV Dışa Aktar
            </button>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
            <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Seçimi Kaldır
            </button>
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
    </div>
  );
}