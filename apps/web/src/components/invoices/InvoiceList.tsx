import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Invoice, InvoiceFilters, InvoiceStatus } from '../../types/invoice';
import { invoiceService } from '../../services/invoice.service';

interface InvoiceListProps {
  onInvoiceSelect?: (invoice: Invoice) => void;
  filters?: InvoiceFilters;
  showActions?: boolean;
  compact?: boolean;
}

export function InvoiceList({ 
  onInvoiceSelect, 
  filters, 
  showActions = true, 
  compact = false 
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
      } else {
        loadInvoices(filters);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    onInvoiceSelect?.(invoice);
  };

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
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Fatura ara (numara, müşteri adı, vergi no...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      {/* Invoice List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {invoices.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              Fatura bulunamadı
            </li>
          ) : (
            invoices.map((invoice) => (
              <li
                key={invoice.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedInvoice?.id === invoice.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleInvoiceClick(invoice)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{invoice.patientName}</span>
                          {invoice.billingAddress?.taxNumber && (
                            <span>VN: {invoice.billingAddress?.taxNumber}</span>
                          )}
                          <span>{formatDate(invoice.createdAt)}</span>
                          {invoice.dueDate && (
                            <span>Vade: {formatDate(invoice.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.grandTotal)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invoice.items.length} kalem
                      </p>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center space-x-2">
                        {/* Status Actions */}
                        {invoice.status === 'draft' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(invoice, 'sent');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            variant='default'>
                            Gönder
                          </Button>
                        )}
                        
                        {invoice.status === 'sent' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(invoice, 'paid');
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                            variant='default'>
                            Ödendi
                          </Button>
                        )}
                        
                        {['draft', 'sent'].includes(invoice.status) && (
                          <Button
                            onClick={(e) => handleDeleteInvoice(invoice, e)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            variant='default'>
                            Sil
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
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