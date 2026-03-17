import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, ArrowUpCircle, ArrowDownCircle, TrendingUp, Filter } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { useHaptic } from '@/hooks/useHaptic';
import { formatCurrency } from '@/utils/format';
import { Button, Modal } from '@x-ear/ui-web';
import { Trash2 } from 'lucide-react';
import {
  useCashRecords,
  useCreateCashRecord,
  useDeleteCashRecord,
} from '@/hooks/useCashflow';
import { CashflowModal } from '@/components/cashflow/CashflowModal';
import { CashRecordDetailModal } from '@/components/cashflow/CashRecordDetailModal';
import { useUpdateCashRecord } from '@/hooks/useCashflow';
import type { CashflowFilters as CashflowFiltersType, CashRecord, CashRecordFormData } from '@/types/cashflow';
import { PermissionGate } from '@/components/PermissionGate';
import { useLocation, useNavigate } from '@tanstack/react-router';

export const MobileCashflowPage: React.FC = () => {
  const { t } = useTranslation('cashflow');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<CashRecord | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const { triggerSelection } = useHaptic();

  const requestedTransactionType = useMemo(() => {
    const value = (location.search as Record<string, unknown>)?.new;
    return value === 'income' || value === 'expense' ? value : undefined;
  }, [location.search]);

  const filters: CashflowFiltersType = useMemo(() => ({
    search: searchValue || undefined,
    transactionType: filterType as CashflowFiltersType['transactionType'] || undefined,
  }), [searchValue, filterType]);

  const { data, isLoading, refetch } = useCashRecords(filters);
  const createMutation = useCreateCashRecord();
  const updateMutation = useUpdateCashRecord();
  const deleteMutation = useDeleteCashRecord();

  const records = useMemo(() => {
    const recordData = Array.isArray(data) ? data : ((data as unknown as Record<string, unknown>)?.data as CashRecord[] || []);
    if (!recordData) return [];

    let filtered = recordData.map((record: CashRecord & { description?: string }) => {
      if (!record.inventoryItemId && record.description) {
        const inventoryMatch = record.description.match(/\[INVENTORY:([^:]+):([^\]]+)\]/);
        if (inventoryMatch) {
          return {
            ...record,
            inventoryItemId: inventoryMatch[1],
            inventoryItemName: inventoryMatch[2],
            description: record.description.replace(inventoryMatch[0], '').trim(),
          };
        }
      }
      return record;
    });

    if (filters.transactionType) {
      filtered = filtered.filter(r => r.transactionType === filters.transactionType);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.partyName?.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [data, filters]);

  const stats = useMemo(() => {
    const totalIncome = records
      .filter((r) => r.transactionType === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = records
      .filter((r) => r.transactionType === 'expense')
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);
    return { totalIncome, totalExpense, netCashFlow: totalIncome - totalExpense };
  }, [records]);

  const visibleRecords = records.slice(0, visibleCount);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleCloseNewRecordModal = () => {
    setShowNewRecordModal(false);
    if (requestedTransactionType) {
      navigate({ to: '/cashflow' });
    }
  };

  const handleSaveRecord = async (formData: CashRecordFormData) => {
    await createMutation.mutateAsync(formData);
  };

  const handleUpdateRecord = async (id: string, data: Partial<CashRecord>) => {
    await updateMutation.mutateAsync({ id, data });
    setSelectedRecord(null);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteMutation.mutateAsync(recordToDelete.id);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const handleExport = () => {
    const headers = [t('columns.date', 'Tarih'), t('columns.transactionType', 'İşlem Türü'), t('columns.recordType', 'Kayıt Türü'), t('columns.patient', 'Hasta'), t('columns.amount', 'Tutar'), t('columns.description', 'Açıklama')];
    const csvData = [
      headers.join(','),
      ...records.map((record) => {
        const date = new Date(record.date).toLocaleDateString('tr-TR');
        const type = record.transactionType === 'income' ? t('income', 'Gelir') : t('expense', 'Gider');
        const amount = record.amount.toFixed(2);
        return [date, type, record.recordType, record.partyName || '', amount, record.description || '']
          .map((field) => `"${field}"`)
          .join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kasa-kayitlari-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    if (requestedTransactionType) {
      setShowNewRecordModal(true);
    }
  }, [requestedTransactionType]);

  return (
    <MobileLayout>
      <MobileHeader
        title={t('pageTitle', 'Kasa Yönetimi')}
        showBack={false}
        actions={
          <div className="flex items-center gap-1">
            <PermissionGate permission="finance.payments.export.view">
              <button data-allow-raw="true" onClick={handleExport} className="p-2 text-muted-foreground">
                <Download className="h-5 w-5" />
              </button>
            </PermissionGate>
            <button
              data-allow-raw="true"
              onClick={() => { setShowFilters(!showFilters); triggerSelection(); }}
              className={`p-2 rounded-xl ${showFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="px-4 pb-3 bg-white dark:bg-gray-900 border-b border-border sticky top-14 z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            data-allow-raw="true"
            type="text"
            placeholder={t('searchPlaceholder', 'Kayıt ara...')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all border border-transparent focus:border-primary-100 dark:focus:border-primary-900 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
            <button
              data-allow-raw="true"
              onClick={() => { setFilterType(''); triggerSelection(); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !filterType ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('all', 'Tümü')}
            </button>
            <button
              data-allow-raw="true"
              onClick={() => { setFilterType('income'); triggerSelection(); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'income' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('income', 'Gelir')}
            </button>
            <button
              data-allow-raw="true"
              onClick={() => { setFilterType('expense'); triggerSelection(); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'expense' ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('expense', 'Gider')}
            </button>
          </div>
        )}
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-950">
          {/* Stats Carousel */}
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x hide-scrollbar">
            <div className="min-w-[140px] bg-green-500 bg-opacity-90 p-4 rounded-2xl text-white snap-start flex flex-col justify-between h-24 active:scale-95 transition-all">
              <ArrowUpCircle className="h-5 w-5 opacity-80" />
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalIncome)}</p>
                <p className="text-xs opacity-80">{t('income', 'Gelir')}</p>
              </div>
            </div>
            <div className="min-w-[140px] bg-red-500 bg-opacity-90 p-4 rounded-2xl text-white snap-start flex flex-col justify-between h-24 active:scale-95 transition-all">
              <ArrowDownCircle className="h-5 w-5 opacity-80" />
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalExpense)}</p>
                <p className="text-xs opacity-80">{t('expense', 'Gider')}</p>
              </div>
            </div>
            <div className={`min-w-[140px] ${stats.netCashFlow >= 0 ? 'bg-blue-500' : 'bg-amber-500'} bg-opacity-90 p-4 rounded-2xl text-white snap-start flex flex-col justify-between h-24 active:scale-95 transition-all`}>
              <TrendingUp className="h-5 w-5 opacity-80" />
              <div>
                <p className="text-lg font-bold">{formatCurrency(Math.abs(stats.netCashFlow))}</p>
                <p className="text-xs opacity-80">Net</p>
              </div>
            </div>
          </div>

          {/* Records List */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 px-1">{records.length} {t('records', 'kayıt')}</p>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
              </div>
            ) : visibleRecords.length > 0 ? (
              <div className="space-y-3">
                {visibleRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => { setSelectedRecord(record); triggerSelection(); }}
                    className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-border shadow-sm active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          record.transactionType === 'income'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {record.transactionType === 'income' ? (
                            <ArrowUpCircle className="h-5 w-5" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {record.partyName || record.description || t('record', 'Kayıt')}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              record.transactionType === 'income'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {record.transactionType === 'income' ? t('income', 'Gelir') : t('expense', 'Gider')}
                            </span>
                            {record.recordType && (
                              <span className="text-[10px] text-muted-foreground">
                                {record.recordType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-sm ${
                          record.transactionType === 'income'
                            ? 'text-success'
                            : 'text-destructive'
                        }`}>
                          {record.transactionType === 'income' ? '+' : '-'}{formatCurrency(Math.abs(record.amount))}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(record.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More */}
                {visibleCount < records.length && (
                  <div className="flex justify-center pt-2 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="rounded-xl"
                    >
                      {t('loadMore', 'Daha Fazla Yükle')} ({records.length - visibleCount} {t('remaining', 'kalan')})
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                  <TrendingUp className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('noRecordsFound', 'Kayıt Bulunamadı')}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('noRecordsYet', 'Henüz kasa kaydı eklenmemiş.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <PermissionGate permission="finance.cash_register">
        <FloatingActionButton onClick={() => setShowNewRecordModal(true)} />
      </PermissionGate>

      {/* Modals */}
      <CashflowModal
        isOpen={showNewRecordModal}
        onClose={handleCloseNewRecordModal}
        onSave={handleSaveRecord}
        isLoading={createMutation.isPending}
        lockedTransactionType={requestedTransactionType}
      />

      <CashRecordDetailModal
        record={selectedRecord}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdate={handleUpdateRecord}
        isLoading={updateMutation.isPending}
      />

      <Modal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        title={t('deleteRecord', 'Kaydı Sil')}
        size="md"
      >
        <div className="space-y-4 dark:text-gray-200">
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-red-200 dark:border-red-800 rounded-2xl">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 dark:text-red-400">
                {t('deleteConfirm', 'Bu kaydı silmek istediğinizden emin misiniz?')}
              </h3>
              <p className="mt-1 text-sm text-destructive">
                {recordToDelete?.partyName || t('record', 'Kayıt')} - {recordToDelete?.amount} ₺
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRecordToDelete(null)}>{t('cancel', 'İptal')}</Button>
            <PermissionGate permission="finance.cash_register">
              <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? t('deleting', 'Siliniyor...') : t('delete', 'Sil')}
              </Button>
            </PermissionGate>
          </div>
        </div>
      </Modal>
    </MobileLayout>
  );
};

export default MobileCashflowPage;
