import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useEffect, useCallback } from 'react';
import { Invoice, InvoiceFilters, InvoiceTemplate } from '../types/invoice';

import { InvoiceModal } from '../components/modals/InvoiceModal';
import { InvoiceBulkOperations } from '../components/invoice/InvoiceBulkOperations';
import { InvoiceTemplateManager } from '../components/templates/InvoiceTemplateManager';
import { EFaturaXMLGenerator } from '../components/invoice/EFaturaXMLGenerator';
import { InvoiceFilters as InvoiceFiltersComponent } from '../components/invoices/InvoiceFilters';
import { InvoiceStats } from '../components/invoices/InvoiceStats';

interface InvoiceManagementPageProps {
  className?: string;
}

interface PageState {
  invoices: Invoice[];
  selectedInvoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  filters: InvoiceFilters;
  currentView: 'list' | 'templates' | 'bulk' | 'xml';
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'quick' | 'template';
  invoice: Invoice | null;
  template: InvoiceTemplate | null;
}

export const InvoiceManagementPage: React.FC<InvoiceManagementPageProps> = ({
  className = ''
}) => {
  const [state, setState] = useState<PageState>({
    invoices: [],
    selectedInvoices: [],
    isLoading: true,
    error: null,
    filters: {},
    currentView: 'list'
  });

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    invoice: null,
    template: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load invoices on component mount
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Mock data for demonstration
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          type: 'service',
          status: 'sent',
          patientName: 'Ahmet Yılmaz',
          patientPhone: '+90 532 123 4567',
          patientTcNumber: '12345678901',
          billingAddress: {
            name: 'Ahmet Yılmaz',
            address: 'Atatürk Cad. No:123',
            city: 'İstanbul',
            district: 'Kadıköy',
            postalCode: '34710',
            country: 'Türkiye',
            taxNumber: '1234567890',
            taxOffice: 'Kadıköy Vergi Dairesi'
          },
          issueDate: '2024-01-15',
          dueDate: '2024-02-15',
          paymentMethod: 'credit_card',
          items: [
            {
              id: '1',
              name: 'Genel Muayene',
              description: 'Rutin kontrol muayenesi',
              quantity: 1,
              unitPrice: 150,
              discount: 0,
              taxRate: 18,
              taxAmount: 27,
              totalPrice: 177
            }
          ],
          subtotal: 150,
          totalDiscount: 0,
          taxes: [
            {
              type: 'kdv',
              rate: 18,
              baseAmount: 150,
              taxAmount: 27
            }
          ],
          totalTax: 27,
          grandTotal: 177,
          currency: 'TRY',
          notes: 'Genel muayene hizmeti',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          createdBy: 'admin'
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          type: 'service',
          status: 'draft',
          patientName: 'Fatma Demir',
          patientPhone: '+90 533 987 6543',
          billingAddress: {
            name: 'Fatma Demir',
            address: 'İnönü Bulvarı No:456',
            city: 'Ankara',
            district: 'Çankaya',
            postalCode: '06100',
            country: 'Türkiye'
          },
          issueDate: '2024-01-16',
          dueDate: '2024-02-16',
          items: [
            {
              id: '2',
              name: 'Diş Tedavisi',
              description: 'Kanal tedavisi',
              quantity: 1,
              unitPrice: 500,
              discount: 50,
              discountType: 'amount',
              taxRate: 18,
              taxAmount: 81,
              totalPrice: 531
            }
          ],
          subtotal: 500,
          totalDiscount: 50,
          taxes: [
            {
              type: 'kdv',
              rate: 18,
              baseAmount: 450,
              taxAmount: 81
            }
          ],
          totalTax: 81,
          grandTotal: 531,
          currency: 'TRY',
          createdAt: '2024-01-16T14:30:00Z',
          updatedAt: '2024-01-16T14:30:00Z',
          createdBy: 'admin'
        }
      ];

      setState(prev => ({
        ...prev,
        invoices: mockInvoices,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Faturalar yüklenirken hata oluştu',
        isLoading: false
      }));
    }
  }, []);

  // Filter invoices based on search and filters
  const filteredInvoices = React.useMemo(() => {
    let filtered = state.invoices;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.patientName.toLowerCase().includes(query) ||
        invoice.patientPhone?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.type === typeFilter);
    }

    return filtered;
  }, [state.invoices, searchQuery, statusFilter, typeFilter]);

  const handleCreateInvoice = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: 'create',
      invoice: null,
      template: null
    });
  }, []);

  const handleQuickInvoice = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: 'quick',
      invoice: null,
      template: null
    });
  }, []);

  const handleEditInvoice = useCallback((invoice: Invoice) => {
    // For edit mode, we'll use create mode with initial data
    setModalState({
      isOpen: true,
      mode: 'create',
      invoice,
      template: null
    });
  }, []);

  const handleViewInvoice = useCallback((invoice: Invoice) => {
    // For view mode, we'll show invoice details in a separate component
    console.log('Viewing invoice:', invoice);
    // TODO: Implement view modal or navigate to detail page
  }, []);

  const handleUseTemplate = useCallback((template: InvoiceTemplate) => {
    setModalState({
      isOpen: true,
      mode: 'template',
      invoice: null,
      template
    });
  }, []);

  const handleInvoiceSelect = useCallback((invoice: Invoice, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedInvoices: selected
        ? [...prev.selectedInvoices, invoice]
        : prev.selectedInvoices.filter(i => i.id !== invoice.id)
    }));
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedInvoices: selected ? [...filteredInvoices] : []
    }));
  }, [filteredInvoices]);

  const handleBulkActionComplete = useCallback((action: string, results: any) => {
    // Refresh invoices after bulk action
    loadInvoices();
    
    // Clear selection
    setState(prev => ({ ...prev, selectedInvoices: [] }));
    
    // Show success message
    console.log(`Bulk action ${action} completed:`, results);
  }, [loadInvoices]);

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: 'create',
      invoice: null,
      template: null
    });
  }, []);

  const handleModalSubmit = useCallback(async (data: any) => {
    try {
      // Handle form submission based on mode
      switch (modalState.mode) {
        case 'create':
          // Create new invoice or update existing if invoice is provided
          if (modalState.invoice) {
            console.log('Updating invoice:', data);
          } else {
            console.log('Creating invoice:', data);
          }
          break;
        case 'quick':
          // Create quick invoice
          console.log('Creating quick invoice:', data);
          break;
        case 'template':
          // Create invoice from template
          console.log('Creating invoice from template:', data);
          break;
      }
      
      // Refresh invoices
      await loadInvoices();
      
      // Close modal
      closeModal();
    } catch (error) {
      console.error('Error submitting invoice:', error);
    }
  }, [modalState.mode, modalState.invoice, loadInvoices, closeModal]);

  if (state.isLoading) {
    return (
      <div className={`invoice-management-loading ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Faturalar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`invoice-management-page ${className}`}>
      {/* Header */}
      <div className="page-header mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Fatura Yönetimi</h1>
          
          <div className="header-actions flex gap-3">
            <Button
              onClick={handleQuickInvoice}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              variant='default'>
              ⚡ Hızlı Fatura
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              variant='default'>
              + Yeni Fatura
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="view-tabs border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'list', label: 'Fatura Listesi', icon: '📋' },
              { key: 'templates', label: 'Şablonlar', icon: '📄' },
              { key: 'bulk', label: 'Toplu İşlemler', icon: '⚡' },
              { key: 'xml', label: 'E-Fatura XML', icon: '🏛️' }
            ].map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setState(prev => ({ ...prev, currentView: tab.key as any }))}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  state.currentView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                variant='default'>
                {tab.icon} {tab.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>
      {/* Error Display */}
      {state.error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="text-red-400 hover:text-red-600"
                variant='default'>
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Content based on current view */}
      {state.currentView === 'list' && (
        <div className="invoice-list-view">
          {/* Filters */}
          <div className="filters-section bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arama
                </label>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Fatura no, hasta adı..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Tüm Durumlar' },
                    { value: 'draft', label: 'Taslak' },
                    { value: 'sent', label: 'Gönderildi' },
                    { value: 'approved', label: 'Onaylandı' },
                    { value: 'paid', label: 'Ödendi' },
                    { value: 'cancelled', label: 'İptal' }
                  ]}
                  placeholder="Durum seçiniz"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip
                </label>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Tüm Tipler' },
                    { value: 'service', label: 'Hizmet' },
                    { value: 'sale', label: 'Satış' },
                    { value: 'proforma', label: 'Proforma' },
                    { value: 'sgk', label: 'SGK' }
                  ]}
                  placeholder="Tip seçiniz"
                  className="w-full"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={loadInvoices}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  variant='default'>
                  🔄 Yenile
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Operations */}
          {state.selectedInvoices.length > 0 && (
            <div className="mb-6">
              <InvoiceBulkOperations
                selectedInvoices={state.selectedInvoices}
                onBulkActionComplete={handleBulkActionComplete}
                onSelectionClear={() => setState(prev => ({ ...prev, selectedInvoices: [] }))}
              />
            </div>
          )}

          {/* Invoice Table */}
          <div className="invoice-table bg-white rounded-lg shadow overflow-hidden">
            <div className="table-header bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center">
                <Input
                  type="checkbox"
                  checked={state.selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="mr-3"
                />
                <span className="font-medium text-gray-900">
                  {filteredInvoices.length} fatura
                </span>
              </div>
            </div>

            <div className="table-body">
              {filteredInvoices.length === 0 ? (
                <div className="empty-state text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Fatura bulunamadı
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Arama kriterlerinizi değiştirin veya yeni fatura oluşturun
                  </p>
                  <Button
                    onClick={handleCreateInvoice}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    variant='default'>
                    Yeni Fatura Oluştur
                  </Button>
                </div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    selected={state.selectedInvoices.some(i => i.id === invoice.id)}
                    onSelect={(selected) => handleInvoiceSelect(invoice, selected)}
                    onEdit={() => handleEditInvoice(invoice)}
                    onView={() => handleViewInvoice(invoice)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {state.currentView === 'templates' && (
        <InvoiceTemplateManager
          onTemplateSelect={handleUseTemplate}
          onTemplateCreate={() => console.log('Template created')}
          onTemplateUpdate={() => console.log('Template updated')}
          onTemplateDelete={() => console.log('Template deleted')}
        />
      )}
      {state.currentView === 'bulk' && (
        <div className="bulk-operations-view">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Toplu İşlemler</h2>
            <p className="text-gray-600">
              Birden fazla fatura seçerek toplu işlemler gerçekleştirebilirsiniz.
            </p>
          </div>
          
          <InvoiceBulkOperations
            selectedInvoices={state.selectedInvoices}
            onBulkActionComplete={handleBulkActionComplete}
            onSelectionClear={() => setState(prev => ({ ...prev, selectedInvoices: [] }))}
          />
        </div>
      )}
      {state.currentView === 'xml' && (
        <div className="xml-generator-view">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-Fatura XML Oluşturucu</h2>
            <p className="text-gray-600">
              Faturalarınızı e-fatura XML formatında oluşturun ve GİB'e gönderin.
            </p>
          </div>
          
          {state.selectedInvoices.length > 0 ? (
            state.selectedInvoices.map(invoice => (
              <div key={invoice.id} className="mb-6">
                <EFaturaXMLGenerator invoice={invoice} />
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏛️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                XML oluşturmak için fatura seçin
              </h3>
              <p className="text-gray-600">
                Fatura listesinden XML oluşturmak istediğiniz faturaları seçin
              </p>
            </div>
          )}
        </div>
      )}
      {/* Invoice Modal */}
      {modalState.isOpen && (
        <InvoiceModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          onClose={closeModal}
          onSuccess={handleModalSubmit}
          initialData={modalState.invoice ? {
            patientName: modalState.invoice.patientName,
            invoiceNumber: modalState.invoice.invoiceNumber,
            type: modalState.invoice.type,
            issueDate: modalState.invoice.issueDate,
            dueDate: modalState.invoice.dueDate,
            items: modalState.invoice.items?.map(item => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              taxRate: item.taxRate
            })) || [],
            notes: modalState.invoice.notes,
            billingAddress: modalState.invoice.billingAddress
          } : undefined}
        />
      )}
    </div>
  );
};

// Invoice Row Component
interface InvoiceRowProps {
  invoice: Invoice;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onView: () => void;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({
  invoice,
  selected,
  onSelect,
  onEdit,
  onView
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Gönderildi', color: 'bg-blue-100 text-blue-800' },
      approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' },
      paid: { label: 'Ödendi', color: 'bg-green-100 text-green-800' },
      overdue: { label: 'Gecikmiş', color: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="invoice-row border-b border-gray-200 px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center">
        <Input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mr-4"
        />
        
        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
          <div>
            <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
            <div className="text-sm text-gray-500">{invoice.issueDate}</div>
          </div>
          
          <div>
            <div className="font-medium text-gray-900">{invoice.patientName}</div>
            <div className="text-sm text-gray-500">{invoice.patientPhone}</div>
          </div>
          
          <div>
            {getStatusBadge(invoice.status)}
          </div>
          
          <div>
            <span className="text-sm text-gray-500 capitalize">{invoice.type}</span>
          </div>
          
          <div className="text-right">
            <div className="font-medium text-gray-900">
              ₺{invoice.grandTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div className="text-sm text-gray-500">{invoice.currency}</div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              onClick={onView}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Görüntüle"
              variant='default'>
              👁️
            </Button>
            <Button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Düzenle"
              variant='default'>
              ✏️
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;