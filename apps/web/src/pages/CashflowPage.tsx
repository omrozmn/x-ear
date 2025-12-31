/**
 * CashflowPage Component
 * Main cashflow management page
 */
import React, { useState, useMemo } from 'react';
import { Button, Modal, Pagination } from '@x-ear/ui-web';
import { Plus, RefreshCw, Download, Filter, Trash2 } from 'lucide-react';
import { CashflowStats } from '../components/cashflow/CashflowStats';
import { CashflowFilters } from '../components/cashflow/CashflowFilters';
import { CashflowTable } from '../components/cashflow/CashflowTable';
import { CashflowModal } from '../components/cashflow/CashflowModal';
import {
  useCashRecords,
  useCreateCashRecord,
  useUpdateCashRecord,
  useDeleteCashRecord,
} from '../hooks/useCashflow';
import { CashRecordDetailModal } from '../components/cashflow/CashRecordDetailModal';
import type { CashflowFilters as CashflowFiltersType, CashRecord } from '../types/cashflow';

export function CashflowPage() {
  const [filters, setFilters] = useState<CashflowFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<CashRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Hooks
  const { data, isLoading, error, refetch } = useCashRecords(filters);
  const createMutation = useCreateCashRecord();
  const updateMutation = useUpdateCashRecord();
  const deleteMutation = useDeleteCashRecord();

  // Extract and filter records from response
  const records = useMemo(() => {
    const recordData = Array.isArray(data) ? data : (data?.data || []);
    if (!recordData) return [];

    // Parse inventory info from description if not present (backend compatibility)
    let filtered = recordData.map((record: any) => {
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

    // Client-side filtering as backup (backend should handle this)
    if (filters.transactionType) {
      filtered = filtered.filter(r => r.transactionType === filters.transactionType);
    }

    if (filters.recordType) {
      filtered = filtered.filter(r => r.recordType === filters.recordType);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.patientName?.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [data, filters]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalIncome = records
      .filter((r) => r.transactionType === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpense = records
      .filter((r) => r.transactionType === 'expense')
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);

    return {
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
    };
  }, [records]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return records.slice(startIndex, endIndex);
  }, [records, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(records.length / itemsPerPage);

  // Handlers
  const handleRefresh = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: CashflowFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSaveRecord = async (formData: any) => {
    await createMutation.mutateAsync(formData);
  };

  const handleRecordClick = (record: CashRecord) => {
    setSelectedRecord(record);
  };

  const handleUpdateRecord = async (id: string, data: Partial<CashRecord>) => {
    await updateMutation.mutateAsync({ id, data });
    setSelectedRecord(null);
  };

  const handleDeleteRecord = (record: CashRecord) => {
    setRecordToDelete(record);
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
    // Prepare CSV data
    const headers = ['Tarih', 'İşlem Türü', 'Kayıt Türü', 'Hasta', 'Tutar', 'Açıklama'];
    const csvData = [
      headers.join(','),
      ...records.map((record) => {
        const date = new Date(record.date).toLocaleDateString('tr-TR');
        const type = record.transactionType === 'income' ? 'Gelir' : 'Gider';
        const amount = record.amount.toFixed(2);
        return [
          date,
          type,
          record.recordType,
          record.patientName || '',
          amount,
          record.description || '',
        ]
          .map((field) => `"${field}"`)
          .join(',');
      }),
    ].join('\n');

    // Create and download file
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kasa Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-2">
              Gelir ve gider kayıtlarınızı yönetin
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
            <Button onClick={() => setShowNewRecordModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kayıt
            </Button>
          </div>
        </div>

        {/* Stats */}
        <CashflowStats stats={stats} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Gizle' : 'Göster'}
          </Button>
        </div>

        {showFilters && (
          <CashflowFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        )}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Kasa Kayıtları</h3>
          <p className="text-sm text-gray-500 mt-1">{records.length} kayıt</p>
        </div>

        {error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-red-600">Bir hata oluştu</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : (
          <>
            <CashflowTable
              records={paginatedRecords}
              isLoading={isLoading}
              onRecordClick={handleRecordClick}
              onDeleteRecord={handleDeleteRecord}
            />

            {totalPages > 1 && (
              <div className="border-t border-gray-200 p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={records.length}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CashflowModal
        isOpen={showNewRecordModal}
        onClose={() => setShowNewRecordModal(false)}
        onSave={handleSaveRecord}
        isLoading={createMutation.isPending}
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
        title="Kaydı Sil"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Bu kaydı silmek istediğinizden emin misiniz?
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {recordToDelete?.patientName || 'Kayıt'} - {recordToDelete?.amount} ₺
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Bu işlem geri alınamaz. Kayıt kalıcı olarak silinecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRecordToDelete(null)}>
              İptal
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CashflowPage;
