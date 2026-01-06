import { Button, Input, Card } from '@x-ear/ui-web';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Zap, Plus, FileText, File, AlertTriangle, X, Eye, Edit2 } from 'lucide-react';
import UniversalImporter from '../components/importer/UniversalImporter';
import { useToastHelpers } from '@x-ear/ui-web';
import invoicesSchema from '../components/importer/schemas/invoices';
import { FieldDef } from '../components/importer/UniversalImporter';
import { Invoice, InvoiceFilters, InvoiceTemplate } from '../types/invoice';

import { InvoiceModal } from '../components/modals/InvoiceModal';
import { InvoiceTemplateManager } from '../components/templates/InvoiceTemplateManager';
import { InvoiceFilters as InvoiceFiltersComponent } from '../components/invoices/InvoiceFilters';
import { GovernmentInvoiceModal } from '../components/invoices/GovernmentInvoiceModal';
import { InvoiceStats } from '../components/invoices/InvoiceStats';
import { invoiceService } from '../services/invoice.service';
import { InvoiceList } from '../components/invoices/InvoiceList';

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
  stats: any;
  statsLoading: boolean;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'quick' | 'template';
  invoice: Invoice | null;
  template: InvoiceTemplate | null;
}

export const DesktopInvoicesPage: React.FC<InvoiceManagementPageProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToastHelpers();

  const [state, setState] = useState<PageState>({
    invoices: [],
    selectedInvoices: [],
    isLoading: true,
    error: null,
    filters: {},
    currentView: 'list',
    stats: {},
    statsLoading: true
  });

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    invoice: null,
    template: null
  });

  const [governmentModalOpen, setGovernmentModalOpen] = useState(false);
  const [currentInvoiceForGov, setCurrentInvoiceForGov] = useState<Invoice | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [importResult, setImportResult] = useState<null | { created: number; updated: number; errors: any[] }>(null);

  // Load invoices and stats on component mount
  useEffect(() => {
    loadInvoices();
    loadStats();
  }, []);

  // If editId query param present, open editor for that invoice
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('editId');
        if (editId) {
          const inv = await invoiceService.getInvoice(editId);
          if (inv) {
            handleEditInvoice(inv);
            // remove param to avoid re-triggering
            params.delete('editId');
            const newSearch = params.toString();
            const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
            window.history.replaceState({}, '', newUrl);
          }
        }
      } catch (err) {
        console.warn('Could not open invoice editor from editId param', err);
      }
    })();
  }, []);

  const loadStats = useCallback(async () => {
    setState(prev => ({ ...prev, statsLoading: true }));
    try {
      const stats = await invoiceService.getInvoiceStats();
      setState(prev => ({ ...prev, stats, statsLoading: false }));
    } catch (error) {
      console.error('Error loading stats:', error);
      setState(prev => ({ ...prev, statsLoading: false }));
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch real invoices from service
      const result = await invoiceService.getInvoices(state.filters);

      setState(prev => ({
        ...prev,
        invoices: result.invoices,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading invoices:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Faturalar yüklenirken hata oluştu',
        isLoading: false
      }));
    }
  }, [state.filters]);

  // Filter invoices based on filters
  const filteredInvoices = React.useMemo(() => {
    let filtered = state.invoices;

    // Apply search filter
    if (state.filters.search) {
      const query = state.filters.search.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.patientName.toLowerCase().includes(query) ||
        invoice.patientPhone?.toLowerCase().includes(query) ||
        invoice.billingAddress?.taxNumber?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (state.filters.status && state.filters.status.length > 0) {
      filtered = filtered.filter(invoice => state.filters.status!.includes(invoice.status));
    }

    // Apply type filter
    if (state.filters.type && state.filters.type.length > 0) {
      filtered = filtered.filter(invoice => state.filters.type!.includes(invoice.type as any));
    }

    // Apply date filters
    if (state.filters.issueDateFrom) {
      const from = new Date(state.filters.issueDateFrom);
      filtered = filtered.filter(invoice =>
        invoice.issueDate && new Date(invoice.issueDate) >= from
      );
    }

    if (state.filters.issueDateTo) {
      const to = new Date(state.filters.issueDateTo);
      filtered = filtered.filter(invoice =>
        invoice.issueDate && new Date(invoice.issueDate) <= to
      );
    }

    // Apply amount filters
    if (state.filters.amountMin !== undefined) {
      filtered = filtered.filter(invoice =>
        (invoice.grandTotal || invoice.totalAmount || 0) >= state.filters.amountMin!
      );
    }

    if (state.filters.amountMax !== undefined) {
      filtered = filtered.filter(invoice =>
        (invoice.grandTotal || invoice.totalAmount || 0) <= state.filters.amountMax!
      );
    }

    // Apply payment method filter
    if (state.filters.paymentMethod && state.filters.paymentMethod.length > 0) {
      filtered = filtered.filter(invoice =>
        invoice.paymentMethod && state.filters.paymentMethod!.includes(invoice.paymentMethod)
      );
    }

    // Apply GIB status filter
    if (state.filters.gibStatus) {
      filtered = filtered.filter(invoice => invoice.gibStatus === state.filters.gibStatus);
    }

    // Apply paid/overdue filters
    if (state.filters.isPaid) {
      filtered = filtered.filter(invoice => invoice.status === 'paid');
    }

    if (state.filters.isOverdue) {
      filtered = filtered.filter(invoice => invoice.status === 'overdue');
    }

    return filtered;
  }, [state.invoices, state.filters]);

  const handleCreateInvoice = useCallback(() => {
    // Navigate to new invoice page
    navigate({ to: '/invoices/new' });
  }, [navigate]);

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

  const handleFiltersChange = useCallback((newFilters: InvoiceFilters) => {
    setState(prev => ({ ...prev, filters: newFilters }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    // Filters are already applied via useMemo
    console.log('Filters applied:', state.filters);
  }, [state.filters]);

  const handleResetFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: {} }));
  }, []);

  const handleOpenGovernmentModal = useCallback((invoice?: Invoice) => {
    setCurrentInvoiceForGov(invoice || null);
    setGovernmentModalOpen(true);
  }, []);

  const handleSaveGovernmentData = useCallback((data: any) => {
    console.log('Government invoice data:', data);
    // TODO: Save to invoice
    if (currentInvoiceForGov) {
      // Update existing invoice
    }
    setGovernmentModalOpen(false);
  }, [currentInvoiceForGov]);

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
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">Fatura Yönetimi</h1>
          </div>

          <div className="header-actions flex gap-3">
            <Button onClick={() => setIsImporterOpen(true)} className="px-3 py-2">İçe Aktar</Button>
            <Button
              onClick={handleQuickInvoice}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm"
              style={{ backgroundColor: '#16a34a', color: 'white' }}
              variant='default'>
              <Zap size={18} />
              Hızlı Fatura
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              variant='default'>
              <Plus size={18} />
              Yeni Fatura
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="view-tabs border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'list', label: 'Fatura Listesi', Icon: FileText },
              // { key: 'templates', label: 'Şablonlar', Icon: File }
            ].map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setState(prev => ({ ...prev, currentView: tab.key as any }))}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${state.currentView === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                variant='default'>
                <tab.Icon size={16} />
                {tab.label}
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
              <AlertTriangle className="text-red-400" size={20} />
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
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Content based on current view */}
      {state.currentView === 'list' && (
        <div className="invoice-list-view">
          {/* Stats */}
          <InvoiceStats stats={state.stats} loading={state.statsLoading} />

          {/* Filters Component */}
          <InvoiceFiltersComponent
            filters={state.filters}
            onFiltersChange={handleFiltersChange}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />

          {/* Invoice Table (now using shared InvoiceList component) */}
          <div className="invoice-table bg-white rounded-lg shadow overflow-hidden">
            <InvoiceList
              onInvoiceSelect={(inv) => handleEditInvoice(inv)}
              filters={state.filters}
              onFiltersChange={handleFiltersChange}
              showActions={true}
              compact={false}
            />
          </div>
        </div>
      )}
      {/* {state.currentView === 'templates' && (
        <InvoiceTemplateManager
          onTemplateSelect={handleUseTemplate}
          onTemplateCreate={() => console.log('Template created')}
          onTemplateUpdate={() => console.log('Template updated')}
          onTemplateDelete={() => console.log('Template deleted')}
        />
      )} */}
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

      {/* Government Invoice Modal */}
      <GovernmentInvoiceModal
        isOpen={governmentModalOpen}
        onClose={() => setGovernmentModalOpen(false)}
        onSave={handleSaveGovernmentData}
        initialData={currentInvoiceForGov?.governmentData}
      />

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        entityFields={[
          // keep legacy keys for backend compatibility plus integrator names
          { key: 'invoiceNumber', label: 'Fatura No' },
          { key: 'eInvoiceId', label: 'Fatura No (eInvoiceId)' },
          { key: 'patientName', label: 'Hasta / Alıcı Adı' },
          { key: 'billingName', label: 'Alıcı / İsim (billingName)' },
          { key: 'patientPhone', label: 'Telefon' },
          { key: 'billingMobilePhone', label: 'Telefon (mobil)' },
          { key: 'patientTcNumber', label: 'TC Kimlik No' },
          { key: 'taxNo', label: 'Vergi No (TC/VKN)' },
          { key: 'issueDate', label: 'Düzenlenme Tarihi' },
          { key: 'invoiceDate', label: 'Fatura Tarihi (invoiceDate)' },
          { key: 'dueDate', label: 'Vade Tarihi' },
          { key: 'currency', label: 'Para Birimi' },
          { key: 'grandTotal', label: 'Toplam Tutar' },
          { key: 'totalPaidTaxIncluding', label: 'Toplam Tutar (KDV dahil)' }
        ] as FieldDef[]}
        zodSchema={invoicesSchema}
        uploadEndpoint={'/api/invoices/bulk_upload'}
        modalTitle={'Toplu Fatura Yükleme'}
        sampleDownloadUrl={'/import_samples/invoices_sample.csv'}
        onComplete={(res) => {
          if (res.errors && res.errors.length > 0) {
            showError(`Fatura import tamamlandı — Hatalı satır: ${res.errors.length}`);
          } else {
            showSuccess(`Fatura import tamamlandı — Oluşturulan: ${res.created}`);
          }
          setImportResult(res);
          loadInvoices();
          setIsImporterOpen(false);
        }}
      />
      {importResult && (
        <div className="mt-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Oluşturulan: <strong>{importResult.created}</strong></div>
                <div className="text-sm">Güncellenen: <strong>{importResult.updated}</strong></div>
                <div className="text-sm">Hatalı satır: <strong>{importResult.errors?.length || 0}</strong></div>
              </div>
              <div>
                <Button variant="outline" onClick={() => setImportResult(null)}>Kapat</Button>
              </div>
            </div>
          </Card>
        </div>
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
              <Eye size={18} />
            </Button>
            <Button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Düzenle"
              variant='default'>
              <Edit2 size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};