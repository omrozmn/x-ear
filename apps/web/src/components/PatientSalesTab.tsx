import React, { useState, useMemo } from 'react';
import { usePatientSales } from '../hooks/patient/usePatientSales';
import { PatientSaleCard } from './patient/PatientSaleCard';
import { PatientSaleForm } from './forms/PatientSaleForm';
import { InvoiceModal } from './modals/InvoiceModal';
import { CollectionModal } from './modals/CollectionModal';
import { PromissoryNotesModal } from './modals/PromissoryNotesModal';
import { InstallmentModal } from './modals/InstallmentModal';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { patientApiService } from '../services/patient/patient-api.service';
import { DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp, Plus, Search, Filter } from 'lucide-react';

interface PatientSalesTabProps {
  patientId: string;
  tabCount?: number;
}

export const PatientSalesTab: React.FC<PatientSalesTabProps> = ({
  patientId,
  tabCount
}) => {
  const { sales, isLoading: salesLoading, error: salesError, refresh } = usePatientSales(patientId);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNotesModal, setShowPromissoryNotesModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered and searched sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          sale.productId?.toLowerCase().includes(term) ||
          sale.paymentMethod?.toLowerCase().includes(term) ||
          sale.soldBy?.toLowerCase().includes(term) ||
          sale.notes?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const saleDate = new Date(sale.saleDate);
        if (dateFrom && saleDate < new Date(dateFrom)) return false;
        if (dateTo && saleDate > new Date(dateTo + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, dateFrom, dateTo]);

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
              <p className="mt-1 text-sm text-red-700">
                {typeof salesError === 'string' ? salesError : salesError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSaleClick = (sale: any) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleCreateSale = () => {
    setEditingSale(null);
    setShowSaleForm(true);
  };

  const handleSaveSale = async (saleData: any) => {
    setIsSaving(true);
    try {
      if (editingSale) {
        // Update existing sale
        await patientApiService.updateSale(editingSale.id, saleData);
      } else {
        // Create new sale
        await patientApiService.createSale(patientId, saleData);
      }
      
      // Close form
      setShowSaleForm(false);
      setEditingSale(null);
      
      // Refresh sales data
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
  const handleShowInvoice = (sale: any) => {
    setSelectedSale(sale);
    setShowInvoiceModal(true);
  };

  const handleShowCollection = (sale: any) => {
    setSelectedSale(sale);
    setShowCollectionModal(true);
  };

  const handleShowPromissoryNotes = (sale: any) => {
    setSelectedSale(sale);
    setShowPromissoryNotesModal(true);
  };

  const handleShowInstallments = (sale: any) => {
    setSelectedSale(sale);
    setShowInstallmentModal(true);
  };

  const handleCollectPayment = async (paymentData: any) => {
    try {
      // TODO: Implement API call to collect payment
      // await patientApiService.collectPayment(selectedSale.id, paymentData);
      
      console.log('Collecting payment:', paymentData);
      
      setShowCollectionModal(false);
      setSelectedSale(null);
      
      // Refresh sales data
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
      // TODO: Implement API call to collect promissory note
      // await patientApiService.collectPromissoryNote(noteId, {
      //   amount,
      //   paymentMethod
      // });
      
      console.log('Collecting promissory note:', { noteId, amount, paymentMethod });
      
      // Refresh sales data
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
      // TODO: Implement API call to pay installment
      // await patientApiService.payInstallment(installmentId, {
      //   amount,
      //   paymentMethod
      // });
      
      console.log('Paying installment:', { installmentId, amount, paymentMethod });
      
      // Refresh sales data
      if (refresh) {
        refresh(patientId);
      }
    } catch (error) {
      console.error('Failed to pay installment:', error);
      throw error;
    }
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const completedSales = filteredSales.filter(sale => sale.paymentStatus === 'completed').length;
  const totalPaid = filteredSales.reduce((sum, sale) => sum + sale.paidAmount, 0);
  const totalRemaining = filteredSales.reduce((sum, sale) => sum + (sale.remainingAmount || 0), 0);
  const totalSGKSupport = filteredSales.reduce((sum, sale) => sum + (sale.sgkCoverage || 0), 0);

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
        <button
          onClick={handleCreateSale}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Satış
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Satışlarda ara... (ürün, ödeme yöntemi, satıcı, notlar)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              showFilters
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtreler
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tümü</option>
                <option value="completed">Tamamlandı</option>
                <option value="pending">Bekliyor</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tümü</option>
                <option value="cash">Nakit</option>
                <option value="card">Kredi Kartı</option>
                <option value="installment">Taksit</option>
                <option value="insurance">Sigorta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {(searchTerm || statusFilter !== 'all' || paymentMethodFilter !== 'all' || dateFrom || dateTo) && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredSales.length} / {sales.length} satış gösteriliyor
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPaymentMethodFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {filteredSales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Toplam Satış</p>
                <p className="text-lg font-semibold text-blue-900">{sales.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Tamamlanan</p>
                <p className="text-lg font-semibold text-green-900">{completedSales}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-yellow-600">Ödenen</p>
                <p className="text-lg font-semibold text-yellow-900">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY'
                  }).format(totalPaid)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">SGK Desteği</p>
                <p className="text-lg font-semibold text-purple-900">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY'
                  }).format(totalSGKSupport)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredSales.length === 0 ? (
        <div className="text-center py-12" role="status">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {sales.length === 0 ? 'Henüz satış yapılmamış' : 'Filtreye uygun satış bulunamadı'}
          </h3>
          <p className="text-gray-500">
            {sales.length === 0 
              ? 'Bu hastaya henüz satış işlemi gerçekleştirilmemiş.'
              : 'Lütfen filtre kriterlerinizi kontrol edin.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta satışları listesi">
          {filteredSales.map((sale) => (
            <div key={sale.id} role="listitem">
              <PatientSaleCard
                sale={sale}
                onSaleClick={handleSaleClick}
                onCreateInvoice={handleShowInvoice}
                onViewInvoice={handleShowInvoice}
                onManagePromissoryNotes={handleShowPromissoryNotes}
                onCollectPayment={handleShowCollection}
                onManageInstallments={handleShowInstallments}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Sale Form Modal */}
      <PatientSaleForm
        patientId={patientId}
        sale={editingSale}
        isOpen={showSaleForm}
        onClose={handleCloseForm}
        onSave={handleSaveSale}
        isLoading={isSaving}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedSale(null);
        }}
        patientId={selectedSale?.patientId}
        onSuccess={(invoice) => {
          console.log('Invoice created:', invoice);
          // TODO: Refresh sales data
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
        sale={selectedSale}
        onCollectPayment={handleCollectPayment}
      />

      {/* Promissory Notes Modal */}
      <PromissoryNotesModal
        isOpen={showPromissoryNotesModal}
        onClose={() => {
          setShowPromissoryNotesModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onCollectNote={handleCollectPromissoryNote}
      />

      {/* Installment Modal */}
      <InstallmentModal
        isOpen={showInstallmentModal}
        onClose={() => {
          setShowInstallmentModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onPayInstallment={handlePayInstallment}
      />
    </div>
  );
};