import React, { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loading
} from '@x-ear/ui-web';
import { Plus, RefreshCw, FileText, Eye, CheckCircle, Send, AlertCircle } from 'lucide-react';
import { Party } from '../../types/party/party-base.types';
import { ResponseEnvelopeListSaleRead } from '../../api/generated/schemas/responseEnvelopeListSaleRead';
import { SaleRead } from '../../api/generated/schemas/saleRead';
// import { PaymentRecordRead } from '../../api/generated/schemas/paymentRecordRead';
// Local definition since schema is missing
interface PaymentRecordRead {
  id: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  status?: string;
  notes?: string;
}
import { PartySaleFormRefactored } from '../forms/party-sale-form/PartySaleFormRefactored';
import { CollectionModal } from './modals/CollectionModal';
import PromissoryNoteModal from './modals/PromissoryNoteModal';
import EditSaleModal from './modals/EditSaleModal';
import { ReturnExchangeModal } from './modals/ReturnExchangeModal';
import ProformaModal from './modals/ProformaModal';
import { useToastHelpers } from '@x-ear/ui-web';
import { SalesSummaryCards } from './SalesSummaryCards';
import { SalesFilters } from './SalesFilters';
import { SalesTableView } from './party/SalesTableView';
import { listSales } from '@/api/client/sales.client';
import { PARTY_SALES_DATA } from '../../constants/storage-keys';

interface DeviceReplacement {
  id: string;
  partyId: string;
  oldDeviceId?: string;
  newInventoryId?: string;
  oldDeviceInfo: string;
  newDeviceInfo: string;
  status: 'pending_invoice' | 'invoice_created' | 'completed';
  createdAt: string;
  returnInvoice?: {
    id: string;
    invoiceNumber: string;
    supplierName?: string;
    supplierInvoiceNumber?: string;
    gibSent?: boolean;
    gibSentDate?: string;
    invoiceNote?: string;
  };
}

interface PartySalesTabProps {
  party: Party;
}

export default function PartySalesTab({ party }: PartySalesTabProps) {
  const { warning } = useToastHelpers(); // Add toast helper

  // Modal states
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNoteModal, setShowPromissoryNoteModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [showReturnExchangeModal, setShowReturnExchangeModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRead | undefined>(undefined);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [amountRangeMin, setAmountRangeMin] = useState('');
  const [amountRangeMax, setAmountRangeMax] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSales] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // SGK states
  // const [sgkPartyInfo, setSgkPartyInfo] = useState<{
  //   hasInsurance: boolean;
  //   coveragePercentage: number;
  // } | null>(null);
  // const [sgkLoading, setSgkLoading] = useState(false);
  const [sgkCoverageCalculation, setSgkCoverageCalculation] = useState<{
    totalCoverage: number;
    partyPayment: number;
    deviceCoverage?: any;
    batteryCoverage?: any;
    totalCoveragePercentage?: number;
  } | null>(null);

  // Sales data state
  const [sales, setSales] = useState<SaleRead[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Device replacements state
  const [deviceReplacements, setDeviceReplacements] = useState<DeviceReplacement[]>([]);
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [showDeviceReplacementModal, setShowDeviceReplacementModal] = useState(false);
  // const [selectedReplacement, setSelectedReplacement] = useState<DeviceReplacement | null>(null);

  const loadPartySales = async () => {
    if (!party.id) return;

    setSalesLoading(true);
    setSalesError(null);

    try {
      console.log('🔄 Loading party sales for:', party.id);

      const response = await listSales({ search: party.id });

      console.log('📊 API Response:', response);

      // Unwrap response
      let salesData: SaleRead[] = [];
      // Type guard for ResponseEnvelope
      if (Array.isArray(response)) {
        salesData = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        // Safe cast after check
        salesData = (response as ResponseEnvelopeListSaleRead).data || [];
      }

      console.log('💎 Raw salesData before transform:', salesData);

      // GOLDEN PATH: Use Backend Type Directly (No more manual mapping)
      // The API now returns exactly what we need, including computed fields.
      const transformedSales = salesData;

      console.log('✅ Sales loaded (Golden Path):', transformedSales);

      setSales(transformedSales);

      // Cache sales data in localStorage for offline fallback
      try {
        const cacheKey = `${PARTY_SALES_DATA}_${party.id}`;
        const cacheData = {
          sales: transformedSales,
          timestamp: Date.now(),
          partyId: party.id
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('💾 Sales data cached to localStorage');
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache sales data:', cacheError);
      }

    } catch (error) {
      console.error('❌ Error loading party sales:', error);
      setSalesError('Satış verileri yüklenirken hata oluştu');

      // Try to load from localStorage fallback
      try {
        const cacheKey = `${PARTY_SALES_DATA}_${party.id}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsedCache.timestamp;
          const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

          if (cacheAge < maxCacheAge && parsedCache.partyId === party.id) {
            console.log('📱 Loading sales from localStorage fallback');
            setSales(parsedCache.sales || []);
            setSalesError('Çevrimdışı veriler gösteriliyor (son güncelleme: ' +
              new Date(parsedCache.timestamp).toLocaleString('tr-TR') + ')');
          } else {
            console.log('⏰ Cached data is too old or for different party');
            setSales([]);
          }
        } else {
          console.log('📭 No cached sales data found');
          setSales([]);
        }
      } catch (fallbackError) {
        console.error('❌ Error loading from localStorage fallback:', fallbackError);
        setSales([]);
      }
    } finally {
      setSalesLoading(false);
    }
  };

  const loadSGKPartyInfo = async () => {
    if (!party.id) return;

    /*
    setSgkLoading(true);
    try {
      // TODO: Implement SGK service
      const sgkInfo = {
        hasInsurance: false,
        coveragePercentage: 0
      };
      setSgkPartyInfo(sgkInfo);

      if (sgkInfo?.hasInsurance) {
        calculateSGKCoverage(sgkInfo);
      }
    } catch (error) {
      console.error('Error loading SGK party info:', error);
      console.error('SGK bilgileri yüklenirken hata oluştu');
    } finally {
      setSgkLoading(false);
    }
    */
  };

  const loadDeviceReplacements = async () => {
    if (!party.id) return;

    setReplacementsLoading(true);
    try {
      // TODO: Implement device replacements API call
      // const api = getXEarCRMAPIAutoGenerated();
      // const response = await api.replacementsGetPartyReplacements(party.id);

      // Mock response for now
      setDeviceReplacements([]);
    } catch (error) {
      console.error('Error loading device replacements:', error);
      setDeviceReplacements([]);
    } finally {
      setReplacementsLoading(false);
    }
  };

  // Load SGK party info
  useEffect(() => {
    if (party && party.id) {
      loadSGKPartyInfo();
      loadPartySales();
      loadDeviceReplacements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.id]);

  // Listen for data change events from other tabs (like Device updates)
  useEffect(() => {
    const handleDataChange = () => {
      // Debug logging disabled to reduce console noise
      // console.log('🔄 [PartySalesTab] Received xEar:dataChanged event, reloading sales...');
      loadPartySales();
    };

    window.addEventListener('xEar:dataChanged', handleDataChange);
    return () => {
      window.removeEventListener('xEar:dataChanged', handleDataChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const calculateSGKCoverage = (sgkInfo: any) => {
    const deviceCoverage = sgkInfo.deviceEntitlement?.hasEntitlement
      ? {
        maxCoverage: 15000,
        coveragePercentage: sgkInfo.coveragePercentage || 80,
        remainingEntitlement: sgkInfo.deviceEntitlement.remainingQuantity || 0
      }
      : null;

    const batteryCoverage = sgkInfo.batteryEntitlement?.hasEntitlement
      ? {
        maxCoverage: 500,
        coveragePercentage: 100,
        remainingEntitlement: sgkInfo.batteryEntitlement.remainingQuantity || 0
      }
      : null;

    setSgkCoverageCalculation({
      totalCoverage: 0,
      partyPayment: 0,
      deviceCoverage,
      batteryCoverage,
      totalCoveragePercentage: sgkInfo.coveragePercentage || 0
    });
  };

  // Filter sales
  const filteredSales = useMemo(() => {
    let filtered = sales;

    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }

    if (amountRangeMin) {
      filtered = filtered.filter(sale => (sale.totalAmount ?? 0) >= parseFloat(amountRangeMin));
    }

    if (amountRangeMax) {
      filtered = filtered.filter(sale => (sale.totalAmount ?? 0) <= parseFloat(amountRangeMax));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.saleDate || '').getTime();
          bValue = new Date(b.saleDate || '').getTime();
          break;
        case 'amount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        if (!aValue) return 1;
        if (!bValue) return -1;
        return aValue > bValue ? 1 : -1;
      } else {
        if (!aValue) return 1;
        if (!bValue) return -1;
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, amountRangeMin, amountRangeMax, sortBy, sortOrder]);

  // Event handlers with proper typing
  /*
  const handleNewSale = (saleData: SaleRead) => {
    console.log('New sale created:', saleData);
    loadPartySales();
    setShowNewSaleModal(false);
  };

  const handleEditSale = (sale: SaleRead) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  };

  const handleDeleteSale = (saleId: string) => {
    console.log('Delete sale:', saleId);
    // TODO: Implement delete functionality
  };
  */

  const handleExportSales = (sales: SaleRead[]) => {
    console.log('Export sales:', sales);
    // TODO: Implement export functionality
  };

  const handlePrintSales = (sales: SaleRead[]) => {
    console.log('Print sales:', sales);
    // TODO: Implement print functionality
  };

  const handleCreateSale = () => setShowNewSaleModal(true);
  const handleEditSaleClick = (sale: SaleRead) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  };
  const handleCollectionClick = (sale: SaleRead) => {
    setSelectedSale(sale);
    setShowCollectionModal(true);
  };
  const handlePromissoryNoteClick = (sale: SaleRead) => {
    setSelectedSale(sale);
    setShowPromissoryNoteModal(true);
  };
  /*
  const handleQueryPartyRights = async () => {
    await loadSGKPartyInfo();
  };
  */

  // Function to safely open modals that require a sale
  const handleSaleAction = () => {
    // This logic is tricky because the header buttons don't have a sale selected contextually
    // So we just warn the user.
    warning('Lütfen işlem yapmak istediğiniz satışı listeden seçiniz.');
  };

  return (
    <div className="space-y-6">
      {/* SGK Party Info Card */}
      {/* SGK Party Info Card - Commented out as requested
      <SGKInfoCard
        sgkPartyInfo={sgkPartyInfo}
        sgkLoading={sgkLoading}
        sgkCoverageCalculation={sgkCoverageCalculation}
        onQueryPartyRights={handleQueryPartyRights}
      /> */}

      {/* Sales Summary Cards */}
      <SalesSummaryCards
        sales={filteredSales}
        sgkCoverageCalculation={sgkCoverageCalculation}
      />

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Satış İşlemleri</h3>
        <div className="flex space-x-2">
          <Button onClick={handleCreateSale} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Button>
          <Button onClick={() => setShowProformaModal(true)} variant="outline">
            Proforma
          </Button>
          {/* 
          <Button onClick={() => handleSaleAction(() => setShowCollectionModal(true))} variant="outline">
            Tahsilat
          </Button>
          <Button onClick={() => handleSaleAction(() => setShowPromissoryNoteModal(true))} variant="outline">
            Senet
          </Button> 
          */}
          <Button onClick={() => handleSaleAction()} variant="outline">
            İade/Değişim
          </Button>
          <Button onClick={() => handleSaleAction()} variant="outline">
            Cihaz Değişimi
          </Button>
        </div>
      </div>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Satış Geçmişi</CardTitle>
            <div className="flex items-center space-x-2">
              {/* View Toggle Buttons - Commented out for now, forcing table view */}
              {/* <div className="flex border border-gray-300 rounded-md">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4 mr-1" />
                  Tablo
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-l-none"
                >
                  <Grid className="w-4 h-4 mr-1" />
                  Kartlar
                </Button>
              </div> */}
            </div>
          </div>

          <SalesFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paymentMethodFilter={paymentMethodFilter}
            setPaymentMethodFilter={setPaymentMethodFilter}
            amountRangeMin={amountRangeMin}
            setAmountRangeMin={setAmountRangeMin}
            amountRangeMax={amountRangeMax}
            setAmountRangeMax={setAmountRangeMax}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            selectedSales={selectedSales}
            onExportSales={() => handleExportSales(filteredSales)}
            onPrintSales={() => handlePrintSales(filteredSales)}
            onBulkCollection={() => setShowCollectionModal(true)}
            onBulkPromissoryNote={() => setShowPromissoryNoteModal(true)}
          />
        </CardHeader>
        <CardContent>
          {/* Sales Display */}
          {salesLoading ? (
            <div className="text-center py-8">
              <Loading className="w-8 h-8 mx-auto mb-4" />
              <p className="text-gray-500">Satış verileri yükleniyor...</p>
            </div>
          ) : salesError ? (
            <div className="text-center py-8 text-red-600">
              <p>{salesError}</p>
              <Button
                onClick={loadPartySales}
                className="mt-4"
                variant="outline"
              >
                Tekrar Dene
              </Button>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz satış kaydı bulunmuyor.
            </div>
          ) : (
            // viewMode === 'table' ? (
            // console.log('📋 Rendering table view, sales count:', filteredSales.length),
            <SalesTableView
              sales={filteredSales}
              partyId={party.id || ''}
              onSaleClick={(sale) => handleEditSaleClick(sale as SaleRead)}
              onEditSale={(sale) => handleEditSaleClick(sale as SaleRead)}
              onCollectPayment={(sale) => handleCollectionClick(sale as SaleRead)}
              onManagePromissoryNotes={(sale) => handlePromissoryNoteClick(sale as SaleRead)}
            />
          )}
        </CardContent>
      </Card>

      {/* Device Replacements */}
      {deviceReplacements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
              <RefreshCw className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
              Cihaz Değişimleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {replacementsLoading ? (
              <div className="text-center py-4">
                <Loading className="w-6 h-6 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Cihaz değişimleri yükleniyor...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deviceReplacements.map((replacement, index) => (
                  <div key={replacement.id} className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Cihaz Değişimi #{index + 1}</h4>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${replacement.status === 'pending_invoice' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                            replacement.status === 'invoice_created' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                              replacement.status === 'completed' && replacement.returnInvoice?.gibSent ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                replacement.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                  'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            }`}>
                            {
                              replacement.status === 'pending_invoice' ? 'Fatura Bekliyor' :
                                replacement.status === 'invoice_created' && !replacement.returnInvoice?.gibSent ? 'Fatura Oluşturuldu' :
                                  replacement.status === 'completed' && replacement.returnInvoice?.gibSent ? 'GİB\'e Gönderildi ✓' :
                                    replacement.status === 'completed' ? 'Tamamlandı' : 'Beklemede'
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Tarih:</strong> {new Date(replacement.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded p-2">
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Eski Cihaz</p>
                            <p className="text-xs text-gray-900 dark:text-gray-300">{replacement.oldDeviceInfo}</p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded p-2">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Yeni Cihaz</p>
                            <p className="text-xs text-gray-900 dark:text-gray-300">{replacement.newDeviceInfo}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {replacement.status === 'pending_invoice' ? (
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                          onClick={() => {/* Open return invoice modal */ }}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          İade Faturası
                        </Button>
                      ) : replacement.returnInvoice?.gibSent ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {/* Preview invoice */ }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Önizle
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                            disabled
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            GİB'e Gönderildi
                          </Button>
                        </>
                      ) : replacement.returnInvoice ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {/* Preview invoice */ }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Önizle
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => {/* Send to GIB */ }}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            GİB'e Gönder
                          </Button>
                        </>
                      ) : null}
                    </div>

                    {replacement.returnInvoice && (
                      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/50">
                        <p className="text-xs text-green-600 flex items-center mb-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          İade faturası oluşturuldu: {replacement.returnInvoice.invoiceNumber}
                        </p>
                        {replacement.returnInvoice.gibSent && replacement.returnInvoice.gibSentDate && (
                          <p className="text-xs text-green-700 font-semibold flex items-center mb-1">
                            <Send className="w-3 h-3 mr-1" />
                            GİB'e gönderildi: {new Date(replacement.returnInvoice.gibSentDate).toLocaleString('tr-TR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                        {replacement.returnInvoice.supplierInvoiceNumber && (
                          <p className="text-xs text-gray-600">
                            <FileText className="w-3 h-3 mr-1" />
                            İadeye Konu Fatura: {replacement.returnInvoice.supplierInvoiceNumber}
                          </p>
                        )}
                        {replacement.returnInvoice.supplierName && (
                          <p className="text-xs text-gray-600">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Tedarikçi: {replacement.returnInvoice.supplierName}
                          </p>
                        )}
                        {replacement.returnInvoice.invoiceNote && (
                          <p className="text-xs text-amber-700 mt-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {replacement.returnInvoice.invoiceNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Yeni Satış</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewSaleModal(false)}
                >
                  ×
                </Button>
              </div>
              <PartySaleFormRefactored
                partyId={party.id || ''}
                onSaleComplete={() => {
                  console.log('Sale completed, refreshing sales list');
                  setShowNewSaleModal(false);
                  loadPartySales();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCollectionModal && selectedSale && (
        <div className="fixed inset-0 z-[9999]">
          <CollectionModal
            isOpen={showCollectionModal}
            onClose={() => setShowCollectionModal(false)}
            party={party}
            sale={selectedSale as any}
            onPaymentCreate={(paymentData: PaymentRecordRead) => {
              console.log('Payment created:', paymentData);
              setShowCollectionModal(false);
              // Refresh sales list after payment
              loadPartySales();
            }}
          />
        </div>
      )}

      {showPromissoryNoteModal && selectedSale && (
        <div className="fixed inset-0 z-[9999]">
          <PromissoryNoteModal
            isOpen={showPromissoryNoteModal}
            onClose={() => setShowPromissoryNoteModal(false)}
            party={party}
            sale={selectedSale}
            onSave={(noteData) => {
              console.log('Promissory note saved:', noteData);
              setShowPromissoryNoteModal(false);
            }}
          />
        </div>
      )}

      {showEditSaleModal && selectedSale && (
        <div className="fixed inset-0 z-[9999]">
          <EditSaleModal
            isOpen={showEditSaleModal}
            onClose={() => setShowEditSaleModal(false)}
            party={party}
            sale={selectedSale}
            onSaleUpdate={(saleData) => {
              console.log('Sale updated:', saleData);
              setShowEditSaleModal(false);
              // Refresh sales list after updating sale
              loadPartySales();
            }}
          />
        </div>
      )}

      {/* Return Exchange Modal Wrapper */}
      {showReturnExchangeModal && selectedSale && (
        <div className="fixed inset-0 z-[9999]">
          <ReturnExchangeModal
            isOpen={showReturnExchangeModal}
            onClose={() => setShowReturnExchangeModal(false)}
            party={party}
            sale={selectedSale}
            onReturnExchangeCreate={() => {
              setShowReturnExchangeModal(false);
              loadPartySales();
            }}
          />
        </div>
      )}

      {/* Proforma Modal Wrapper - Add z-index */}
      {showProformaModal && (
        <div className="fixed inset-0 z-[9999]">
          <ProformaModal
            isOpen={showProformaModal}
            onClose={() => setShowProformaModal(false)}
            party={party}
            onProformaCreate={(data) => {
              console.log('Proforma created:', data);
              setShowProformaModal(false);
            }}
          />
        </div>
      )}

      {/* Device Replacement Modal */}
      {showDeviceReplacementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cihaz Değişimi</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeviceReplacementModal(false)}
                >
                  ×
                </Button>
              </div>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Cihaz değişimi özelliği implementasyonu devam ediyor.
                <br />
                Legacy sistemdeki device replacement logic'i React'e taşınıyor.
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeviceReplacementModal(false)}
                >
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { PartySalesTab };