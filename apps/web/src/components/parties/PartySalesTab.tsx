import React, { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loading
} from '@x-ear/ui-web';
import { Plus } from 'lucide-react';
import { Party } from '../../types/party/party-base.types';
import { Sale } from '../../types/party/party-communication.types';
import { ResponseEnvelopeListSaleRead } from '../../api/generated/schemas/responseEnvelopeListSaleRead';
import { SaleRead } from '../../api/generated/schemas/saleRead';
import { ExtendedSaleRead } from '@/types/extended-sales';
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

import ProformaModal from './modals/ProformaModal';
import DocumentViewer from '../sgk/DocumentViewer';
import type { SGKDocument } from '../../types/sgk';
import { SalesSummaryCards } from './SalesSummaryCards';
import { SalesFilters } from './SalesFilters';
import { SalesTableView } from './party/SalesTableView';

import { listPartySales } from '@/api/client/parties.client';
import { PARTY_SALES_DATA } from '../../constants/storage-keys';

interface PartySalesTabProps {
  party: Party;
}

export default function PartySalesTab({ party }: PartySalesTabProps) {
  // Modal states
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNoteModal, setShowPromissoryNoteModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRead | undefined>(undefined);
  const [editSaleInitialTab, setEditSaleInitialTab] = useState<'details' | 'payments' | 'notes'>('details');

  // PDF Viewer state for proforma
  const [showProformaPdfViewer, setShowProformaPdfViewer] = useState(false);
  const [proformaPdfDocument, setProformaPdfDocument] = useState<SGKDocument | null>(null);

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

  // Sales data state
  const [sales, setSales] = useState<SaleRead[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [, setDeviceReplacements] = useState<unknown[]>([]);
  const [, setReplacementsLoading] = useState(false);

  const [showDeviceReplacementModal, setShowDeviceReplacementModal] = useState(false);
  // const [selectedReplacement, setSelectedReplacement] = useState<DeviceReplacement | null>(null);

  const loadPartySales = async () => {
    if (!party.id) return;

    setSalesLoading(true);
    setSalesError(null);

    try {
      console.log('🔄 Loading party sales for:', party.id);

      // Use the correct endpoint for party-specific sales
      const response = await listPartySales(party.id);

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



  // calculateSGKCoverage function removed - not used in component
  // Was used to calculate SGK coverage details but functionality not implemented

  // Filter sales
  const filteredSales = useMemo(() => {
    const extendedSales = sales as unknown as ExtendedSaleRead[];
    let filtered = extendedSales;

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

  const tableSales = useMemo(
    () =>
      filteredSales.map((sale) => ({
        ...sale,
        saleDate: sale.saleDate ?? sale.createdAt ?? '',
      })),
    [filteredSales]
  );

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
    setEditSaleInitialTab('details');
    setShowEditSaleModal(true);
  };
  const handlePromissoryNoteClick = (sale: SaleRead) => {
    setSelectedSale(sale);
    setEditSaleInitialTab('notes'); // Open notes tab directly
    setShowEditSaleModal(true); // Open EditSaleModal instead of PromissoryNoteModal
  };
  /*
  const handleQueryPartyRights = async () => {
    await loadSGKPartyInfo();
  };
  */

  // Function to safely open modals that require a sale
  // const handleSaleAction = () => {
  //   // This logic is tricky because the header buttons don't have a sale selected contextually
  //   // So we just warn the user.
  //   warning('Lütfen işlem yapmak istediğiniz satışı listeden seçiniz.');
  // };

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
        sales={filteredSales as unknown as SaleRead[]}
      />

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Satış İşlemleri</h3>
        <div className="flex space-x-2">
          <Button onClick={handleCreateSale} className="premium-gradient tactile-press">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Button>
          <Button onClick={() => setShowProformaModal(true)} variant="outline">
            Proforma
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
              {/* <div className="flex border border-gray-300 rounded-xl">
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
            onExportSales={() => handleExportSales(filteredSales as unknown as SaleRead[])}
            onPrintSales={() => handlePrintSales(filteredSales as unknown as SaleRead[])}
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
              sales={tableSales as never}
              partyId={party.id || ''}
              onSaleClick={(sale) => handleEditSaleClick(sale as SaleRead)}
              onEditSale={(sale) => handleEditSaleClick(sale as SaleRead)}
              onManagePromissoryNotes={(sale) => handlePromissoryNoteClick(sale as SaleRead)}
            />
          )}
        </CardContent>
      </Card>



      {/* Modals */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Yeni Satış</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowNewSaleModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 !p-1 !h-auto"
                  aria-label="Kapat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
            sale={selectedSale as unknown as Sale}
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
            initialTab={editSaleInitialTab}
            onSaleUpdate={(saleData) => {
              console.log('Sale updated:', saleData);
              setShowEditSaleModal(false);
              // Refresh sales list after updating sale
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
            onProformaCreate={(data, pdfBlob, fileName) => {
              console.log('Proforma created:', data);
              setShowProformaModal(false);

              // Open PDF viewer with the generated proforma
              const pdfUrl = URL.createObjectURL(pdfBlob);
              const sgkDoc: SGKDocument = {
                id: 'proforma-preview',
                partyId: party.id || '',
                filename: fileName,
                documentType: 'fatura',
                fileUrl: pdfUrl,
                fileSize: pdfBlob.size,
                mimeType: 'application/pdf',
                processingStatus: 'completed',
                uploadedBy: 'system',
                uploadedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              setProformaPdfDocument(sgkDoc);
              setShowProformaPdfViewer(true);
            }}
          />
        </div>
      )}

      {/* Proforma PDF Viewer */}
      {proformaPdfDocument && (
        <DocumentViewer
          document={proformaPdfDocument}
          isOpen={showProformaPdfViewer}
          onClose={() => {
            // Clean up blob URL
            if (proformaPdfDocument.fileUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(proformaPdfDocument.fileUrl);
            }
            setShowProformaPdfViewer(false);
            setProformaPdfDocument(null);
          }}
          onDownload={(doc) => {
            if (doc.fileUrl) {
              const link = window.document.createElement('a');
              link.href = doc.fileUrl;
              link.download = doc.filename || 'proforma.pdf';
              window.document.body.appendChild(link);
              link.click();
              window.document.body.removeChild(link);
            }
          }}
        />
      )}

      {/* Device Replacement Modal */}
      {showDeviceReplacementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
