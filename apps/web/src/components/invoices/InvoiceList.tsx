import { Button, Input } from '@x-ear/ui-web';
import { Eye, Edit2, FileText, Truck, FilePlus, Copy, Trash2 } from 'lucide-react';
import InvoiceBulkOperations from '../invoice/InvoiceBulkOperations';
import { InvoicePreviewModal } from '../modals/InvoicePreviewModal';
import { useState, useEffect } from 'react';
import { Invoice, InvoiceFilters, InvoiceStatus } from '../../types/invoice';
import { invoiceService } from '../../services/invoice.service';

interface InvoiceListProps {
  onInvoiceSelect?: (invoice: Invoice) => void;
  filters?: InvoiceFilters;
  onFiltersChange?: (filters: InvoiceFilters) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function InvoiceList({ 
  onInvoiceSelect, 
  filters, 
  onFiltersChange,
  onSelectionChange,
  showActions = true, 
  compact = false 
}: InvoiceListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load invoices
  const loadInvoices = async (searchFilters?: InvoiceFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoiceService.getInvoices({
        ...filters,
        ...searchFilters,
        page: currentPage,
        limit: 10
      });
      
      setInvoices(result.invoices);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faturalar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data and handle search
  useEffect(() => {
    invoiceService.initializeData().then(() => {
      loadInvoices();
    });
  }, [currentPage]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        loadInvoices({
          ...filters,
          search: searchTerm.trim()
        });
        // Sync search with parent filters if callback available
        if (onFiltersChange && filters?.search !== searchTerm.trim()) {
          onFiltersChange({ ...(filters || {}), search: searchTerm.trim() });
        }
      } else {
        loadInvoices(filters);
        if (onFiltersChange && filters?.search) {
          onFiltersChange({ ...(filters || {}), search: undefined });
        }
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  // Notify parent when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedIds));
    }
  }, [selectedIds, onSelectionChange]);

  // When parent filters change, reflect searchTerm
  useEffect(() => {
    if (filters?.search !== undefined && filters.search !== searchTerm) {
      setSearchTerm(filters.search || '');
    }
  }, [filters?.search]);

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    onInvoiceSelect?.(invoice);
  };

  const toggleSelect = (invoiceId: string, event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId); else next.add(invoiceId);
      return next;
    });
  };

  const selectAllOnPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(invoices.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm('Seçili faturaları silmek istediğinize emin misiniz?')) return;
    try {
      for (const id of Array.from(selectedIds)) {
        await invoiceService.deleteInvoice(id);
      }
      setSelectedIds(new Set());
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu silme hatası');
    }
  };

  const handleBulkCopy = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await invoiceService.copyInvoice(id);
      }
      setSelectedIds(new Set());
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu kopyalama hatası');
    }
  };

  const handleBulkCopyCancel = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await invoiceService.copyInvoiceWithCancellation(id);
      }
      setSelectedIds(new Set());
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu kopyala+iptal hatası');
    }
  };

  const handleBulkIssue = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await invoiceService.sendInvoice(id);
      }
      setSelectedIds(new Set());
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu gönderim hatası');
    }
  };

  const openPreview = (invoice: Invoice, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPreviewInvoice(invoice);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewInvoice(null);
  };

  // Close contextual menu when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!openMenuId) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      // If click happened inside a menu or its toggle button, keep it open
      if (target.closest('[data-invoice-menu]') || target.closest('[data-invoice-menu-button]')) return;
      setOpenMenuId(null);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (!openMenuId) return;
      if (ev.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [openMenuId]);

  const handleDeleteInvoice = async (invoice: Invoice, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm(`${invoice.invoiceNumber} numaralı faturayı silmek istediğinizden emin misiniz?`)) {
      try {
        await invoiceService.deleteInvoice(invoice.id);
        loadInvoices(); // Reload list
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fatura silinirken hata oluştu');
      }
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    try {
      if (newStatus === 'sent') {
        await invoiceService.sendInvoice(invoice.id);
      } else if (newStatus === 'paid') {
        await invoiceService.markAsPaid(invoice.id);
      } else if (newStatus === 'cancelled') {
        await invoiceService.cancelInvoice(invoice.id);
      }
      loadInvoices(); // Reload list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fatura durumu güncellenirken hata oluştu');
    }
  };

  const getStatusColor = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'sent': return 'Gönderildi';
      case 'paid': return 'Ödendi';
      case 'overdue': return 'Vadesi Geçti';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Faturalar yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk operations component (uses typed service/client) */}
      {selectedIds.size > 0 && (
        <div className="p-3">
          <InvoiceBulkOperations
            selectedInvoices={Array.from(selectedIds).map(id => invoices.find(i => i.id === id)).filter(Boolean) as any}
            onBulkActionComplete={(action) => { setSelectedIds(new Set()); loadInvoices(); }}
            onSelectionClear={() => setSelectedIds(new Set())}
          />
        </div>
      )}
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
            <Input
              type="text"
              placeholder="Belge ara (numara, müşteri adı, vergi no...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      {/* header area — removed dev badge */}
      {/* Invoice List with headers */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Header Row */}
        <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
          <div className="flex flex-col">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                aria-label="Tümünü seç"
                onChange={(e) => selectAllOnPage(e.target.checked)}
                className="h-4 w-4"
              />
              <span>Tümünü seç</span>
            </label>
            <div className="mt-1 text-sm text-gray-500">Belge No</div>
          </div>
          <div>Müşteri</div>
          <div>Durum</div>
          <div className="text-left">Tutar</div>
          <div className="text-right">İşlemler</div>
        </div>
        <ul className="divide-y divide-gray-200">
          {invoices.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">Fatura bulunamadı</li>
          ) : (
            invoices.map((invoice) => {
              return (
                <li
                  key={invoice.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedInvoice?.id === invoice.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleInvoiceClick(invoice)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <input
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={(e) => toggleSelect(invoice.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.createdAt || '')}</p>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.patientName}</div>
                      <div className="text-xs text-gray-500">{invoice.billingAddress?.taxNumber ? `VN: ${invoice.billingAddress?.taxNumber}` : invoice.patientPhone}</div>
                    </div>

                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{getStatusText(invoice.status)}</span>
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.grandTotal || 0)}</p>
                      <div className="text-xs text-gray-500">{invoice.currency}</div>
                    </div>

                    <div className="flex items-center justify-end space-x-2">
                      {showActions && (
                        <div className="flex items-center space-x-2">
                          <Button onClick={(e) => openPreview(invoice, e)} className="text-gray-700 hover:text-gray-900 p-1" variant='default' title="Önizle" aria-label="Önizle">
                            <Eye size={16} />
                          </Button>

                          <Button onClick={(e) => { e.stopPropagation(); onInvoiceSelect?.(invoice); }} className="text-indigo-600 hover:text-indigo-800 p-1" variant='default' title="Düzenle" aria-label="Düzenle">
                            <Edit2 size={16} />
                          </Button>

                          {invoice.status === 'draft' && (
                            <Button onClick={async (e) => { e.stopPropagation(); try { const res = await invoiceService.issueInvoice(invoice.id); if (!res.success) { setError(res.error || 'Fatura kesme başarısız'); } else { await loadInvoices(); } } catch(err) { setError(err instanceof Error ? err.message : 'Fatura keserken hata'); } }} className="text-blue-600 hover:text-blue-800 p-1" variant='default' title="Fatura Kes" aria-label="Fatura Kes">
                              <FilePlus size={16} />
                            </Button>
                          )}

                          {invoice.status === 'sent' && (
                            <>
                              <Button onClick={(e) => { e.stopPropagation(); invoiceService.generateInvoicePdf(invoice.id).then(res => { if (res.success && res.data) invoiceService.previewPdfBlob(res.data); }); }} className="text-gray-700 hover:text-gray-900 p-1" variant='default' title="Fatura Aç" aria-label="Fatura Aç">
                                <FileText size={16} />
                              </Button>
                              <Button onClick={(e) => { e.stopPropagation(); const saleId = (invoice as any).saleId || ''; invoiceService.generateSaleInvoicePdf(saleId); }} className="text-gray-700 hover:text-gray-900 p-1" variant='default' title="Kargo Aç" aria-label="Kargo Aç">
                                <Truck size={16} />
                              </Button>
                            </>
                          )}

                          <div className="relative">
                            <button data-invoice-menu-button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === invoice.id ? null : invoice.id); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMenuId(openMenuId === invoice.id ? null : invoice.id); } }} className="p-1 text-gray-600 hover:text-gray-800 rounded-md" aria-label="İşlemler" aria-expanded={openMenuId === invoice.id}>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                            </button>

                            {openMenuId === invoice.id && (
                              <div data-invoice-menu className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice, e); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50">Kaydı Sil</button>
                                <button onClick={async (e) => { e.stopPropagation(); try { await invoiceService.copyInvoice(invoice.id); await loadInvoices(); } catch(err){ setError(err instanceof Error ? err.message : 'Kopyalama hatası'); } finally { setOpenMenuId(null); } }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Kopyala</button>
                                <button onClick={async (e) => { e.stopPropagation(); try { await invoiceService.copyInvoiceWithCancellation(invoice.id); await loadInvoices(); } catch(err){ setError(err instanceof Error ? err.message : 'Kopyala+İptal hatası'); } finally { setOpenMenuId(null); } }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Kopyala ve İptal Et</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        {/* Preview Modal (uses shared modal component) */}
        <InvoicePreviewModal
          isOpen={previewOpen}
          onClose={closePreview}
          invoice={previewInvoice}
        />
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              variant='default'>
              Önceki
            </Button>
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              variant='default'>
              Sonraki
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  variant='default'>
                  Önceki
                </Button>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  variant='default'>
                  Sonraki
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}