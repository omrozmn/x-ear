import React, { useState } from 'react';
import { usePatientSales } from '../hooks/patient/usePatientSales';
import { useSalesFilters } from '../hooks/patient/useSalesFilters';
import { PatientSaleFormRefactored as PatientSaleForm } from './forms/patient-sale-form/PatientSaleFormRefactored';
import { InvoiceModal } from './modals/InvoiceModal';
import { CollectionModal } from './modals/CollectionModal';
import { PromissoryNotesModal } from './modals/PromissoryNotesModal';
import { InstallmentModal } from './modals/InstallmentModal';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { SalesStatistics } from './patient/SalesStatistics';
import { SalesFilters } from './patient/SalesFilters';
import { SalesList } from './patient/SalesList';
import { patientApiService } from '../services/patient/patient-api.service';
import { DollarSign, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@x-ear/ui-web';

interface PatientSalesTabProps {
  patientId: string;
  tabCount?: number;
  sales?: any[];
}

export const PatientSalesTab: React.FC<PatientSalesTabProps> = ({
  patientId,
  tabCount,
  sales: propSales
}) => {
  const { sales: hookSales, isLoading: salesLoading, error: salesError, refresh } = usePatientSales(propSales ? undefined : patientId);
  const sales = propSales || hookSales;
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showFilters,
    setShowFilters,
    filteredSales,
    clearFilters,
    hasActiveFilters
  } = useSalesFilters(sales);
  
  console.log('PatientSalesTab - sales:', sales);
  console.log('PatientSalesTab - filteredSales:', filteredSales);
  console.log('PatientSalesTab - salesLoading:', salesLoading);
  console.log('PatientSalesTab - salesError:', salesError);
  
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Record<string, unknown> | null>(null);
  const [_isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNotesModal, setShowPromissoryNotesModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Record<string, unknown> | null>(null);

  if (salesLoading) {
    return (
      <div className="p-6" role="status" aria-label="Satışlar yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="grid gap-4">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (salesError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Satışlar yüklenirken hata oluştu</h3>
              <p className="mt-2 text-sm text-red-700">
                Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSaleClick = (sale: Record<string, unknown>) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleCreateSale = () => {
    setEditingSale(null);
    setShowSaleForm(true);
  };

  const _handleSaveSale = async (saleData: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      if (editingSale) {
        await patientApiService.updateSale(editingSale.id as string, saleData);
      } else {
        await patientApiService.createSale(patientId, saleData);
      }
      
      setShowSaleForm(false);
      setEditingSale(null);
      
      if (refresh) {
        refresh(patientId);
      }
    } catch (error) {
      console.error('Failed to save sale:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseForm = () => {
    setShowSaleForm(false);
    setEditingSale(null);
  };

  // Modal handlers
  const handleShowInvoice = (sale: Record<string, unknown>) => {
    setSelectedSale(sale);
    setShowInvoiceModal(true);
  };

  const handleShowCollection = (sale: Record<string, unknown>) => {
    setSelectedSale(sale);
    setShowCollectionModal(true);
  };

  const handleShowPromissoryNotes = (sale: Record<string, unknown>) => {
    setSelectedSale(sale);
    setShowPromissoryNotesModal(true);
  };

  const handleShowInstallments = (sale: Record<string, unknown>) => {
    setSelectedSale(sale);
    setShowInstallmentModal(true);
  };

  const handleCollectPayment = async (paymentData: any) => {
    try {
      console.log('Collecting payment:', paymentData);
      setShowCollectionModal(false);
      setSelectedSale(null);
      
      if (refresh) {
        refresh(patientId);
      }
    } catch (error) {
      console.error('Failed to collect payment:', error);
      throw error;
    }
  };

  const handleCollectPromissoryNote = async (noteId: string, amount: number, paymentMethod: string) => {
    try {
      console.log('Collecting promissory note:', { noteId, amount, paymentMethod });
      setShowPromissoryNotesModal(false);
      setSelectedSale(null);
      
      if (refresh) {
        refresh(patientId);
      }
    } catch (error) {
      console.error('Failed to collect promissory note:', error);
      throw error;
    }
  };

  const handlePayInstallment = async (installmentId: string, amount: number, paymentMethod: string) => {
    try {
      console.log('Paying installment:', { installmentId, amount, paymentMethod });
      setShowInstallmentModal(false);
      setSelectedSale(null);
      
      if (refresh) {
        refresh(patientId);
      }
    } catch (error) {
      console.error('Failed to pay installment:', error);
      throw error;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" aria-hidden="true" />
          Hasta Satışları {tabCount !== undefined && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {tabCount}
            </span>
          )}
        </h3>
        <Button
          onClick={handleCreateSale}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Satış
        </Button>
      </div>

      <SalesFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        onPaymentMethodFilterChange={setPaymentMethodFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filteredCount={filteredSales.length}
        totalCount={sales.length}
        onClearFilters={clearFilters}
      />

      <SalesStatistics sales={filteredSales} isVisible={filteredSales.length > 0} />

      <SalesList
        sales={sales}
        filteredSales={filteredSales}
        hasActiveFilters={hasActiveFilters}
        onSaleClick={handleSaleClick}
        onCreateInvoice={handleShowInvoice}
        onViewInvoice={handleShowInvoice}
        onManagePromissoryNotes={handleShowPromissoryNotes}
        onCollectPayment={handleShowCollection}
        onManageInstallments={handleShowInstallments}
      />
      
      {/* Sale Form Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSale ? 'Satış Düzenle' : 'Yeni Satış'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PatientSaleForm
                patientId={patientId}
                onSaleComplete={() => {
                  handleCloseForm();
                  if (refresh) {
                    refresh(patientId);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedSale(null);
        }}
        patientId={selectedSale?.patientId as string}
        onSuccess={(invoice) => {
          console.log('Invoice created:', invoice);
        }}
        onError={(error) => {
          console.error('Invoice creation error:', error);
        }}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => {
          setShowCollectionModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale as any}
        onCollectPayment={handleCollectPayment}
      />

      {/* Promissory Notes Modal */}
      <PromissoryNotesModal
        isOpen={showPromissoryNotesModal}
        onClose={() => {
          setShowPromissoryNotesModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale as any}
        onCollectNote={handleCollectPromissoryNote}
      />

      {/* Installment Modal */}
      <InstallmentModal
        isOpen={showInstallmentModal}
        onClose={() => {
          setShowInstallmentModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale as any}
        onPayInstallment={handlePayInstallment}
      />
    </div>
  );
};