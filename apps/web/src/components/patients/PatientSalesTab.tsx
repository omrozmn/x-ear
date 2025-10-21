import React, { useState, useMemo, useEffect } from 'react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input } from '@x-ear/ui-web';
import { Plus, DollarSign, Edit, FileText, Search, Filter, Download, Printer, ChevronUp, ChevronDown, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { Sale } from '../../types/patient';
import SaleModal from './modals/SaleModal';
import CollectionModal from './modals/CollectionModal';
import PromissoryNoteModal from './modals/PromissoryNoteModal';
import EditSaleModal from './modals/EditSaleModal';
import ReturnExchangeModal from './modals/ReturnExchangeModal';
import ProformaModal from './modals/ProformaModal';
import { sgkService } from '../../services/sgk.service';
import { useToastHelpers } from '@x-ear/ui-web';

interface PatientSalesTabProps {
  patient: Patient;
}

export default function PatientSalesTab({ patient }: PatientSalesTabProps) {
  const [dateFilter, setDateFilter] = useState('all');
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNoteModal, setShowPromissoryNoteModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [showReturnExchangeModal, setShowReturnExchangeModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>(undefined);
  
  // Advanced filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [amountRangeMin, setAmountRangeMin] = useState('');
  const [amountRangeMax, setAmountRangeMax] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // SGK Integration States
  const [sgkPatientInfo, setSgkPatientInfo] = useState<any>(null);
  const [sgkLoading, setSgkLoading] = useState(false);
  const [sgkCoverageCalculation, setSgkCoverageCalculation] = useState<any>(null);

  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();

  // Load SGK patient info on component mount
  useEffect(() => {
    if (patient.id) {
      loadSGKPatientInfo();
    }
  }, [patient.id]);

  const loadSGKPatientInfo = async () => {
    if (!patient.id) return;
    
    setSgkLoading(true);
    try {
      const sgkInfo = await sgkService.getPatientSGKInfo(patient.id);
      setSgkPatientInfo(sgkInfo);
      
      // Calculate SGK coverage for potential sales
      if (sgkInfo?.hasInsurance) {
        calculateSGKCoverage(sgkInfo);
      }
    } catch (error) {
      console.error('Error loading SGK patient info:', error);
      showErrorToast('SGK bilgileri yüklenirken hata oluştu');
    } finally {
      setSgkLoading(false);
    }
  };

  const calculateSGKCoverage = (sgkInfo: any) => {
    // Calculate SGK coverage based on patient's entitlements
    const deviceCoverage = sgkInfo.deviceEntitlement?.hasEntitlement 
      ? {
          maxCoverage: 15000, // Example max SGK coverage for hearing aids
          coveragePercentage: sgkInfo.coveragePercentage || 80,
          remainingEntitlement: sgkInfo.deviceEntitlement.remainingQuantity || 0
        }
      : null;

    const batteryCoverage = sgkInfo.batteryEntitlement?.hasEntitlement
      ? {
          maxCoverage: 500, // Example max SGK coverage for batteries
          coveragePercentage: 100,
          remainingEntitlement: sgkInfo.batteryEntitlement.remainingQuantity || 0
        }
      : null;

    setSgkCoverageCalculation({
      deviceCoverage,
      batteryCoverage,
      totalCoveragePercentage: sgkInfo.coveragePercentage || 0
    });
  };

  const handleQueryPatientRights = async () => {
    if (!patient.id) return;
    
    setSgkLoading(true);
    try {
      const rightsData = await sgkService.queryPatientRights(patient.id);
      setSgkPatientInfo(rightsData);
      showSuccessToast('Hasta hakları başarıyla sorgulandı');
      
      // Recalculate coverage with updated info
      if (rightsData?.hasInsurance) {
        calculateSGKCoverage(rightsData);
      }
    } catch (error) {
      console.error('Error querying patient rights:', error);
      showErrorToast('Hasta hakları sorgulanırken hata oluştu');
    } finally {
      setSgkLoading(false);
    }
  };

  // Export and Print functions
  const handleExportSales = (salesData: Sale[]) => {
    const csvContent = [
      ['Tarih', 'Tutar', 'Ödeme Yöntemi', 'Durum', 'Notlar'].join(','),
      ...salesData.map(sale => [
        sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-',
        `${sale.totalAmount} TL`,
        getPaymentMethodText(sale.paymentMethod),
        sale.status,
        sale.notes || '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `satislar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSales = (salesData: Sale[]) => {
    const printContent = `
      <html>
        <head>
          <title>Satış Listesi</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Satış Listesi - ${patient.firstName} ${patient.lastName}</h2>
            <p>Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Ödeme Yöntemi</th>
                <th>Durum</th>
                <th>Notlar</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.map(sale => `
                <tr>
                  <td>${sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-'}</td>
                  <td>${sale.totalAmount} TL</td>
                  <td>${getPaymentMethodText(sale.paymentMethod)}</td>
                  <td>${sale.status}</td>
                  <td>${sale.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Mock sales data - in real app, this would come from API
  const mockSales: Sale[] = [
    {
      id: '1',
      patientId: patient.id || '',
      saleDate: '2024-01-15',
      totalAmount: 15000,
      listPriceTotal: 18000,
      discountAmount: 3000,
      sgkCoverage: 8000,
      paymentMethod: 'card',
      status: 'paid',
      notes: 'Sol kulak işitme cihazı satışı'
    },
    {
      id: '2', 
      patientId: patient.id || '',
      saleDate: '2024-02-20',
      totalAmount: 12000,
      listPriceTotal: 15000,
      discountAmount: 3000,
      sgkCoverage: 6000,
      paymentMethod: 'cash',
      status: 'confirmed',
      notes: 'Sağ kulak işitme cihazı satışı'
    }
  ];


  // Sales summary calculations
  const salesSummary = useMemo(() => {
    const totalSales = mockSales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);
    const totalSGKCoverage = mockSales.reduce((sum: number, sale: Sale) => sum + (sale.sgkCoverage || 0), 0);
    const totalPaid = mockSales.reduce((sum: number, sale: Sale) => {
      const payments = sale.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0;
      return sum + payments;
    }, 0);
    const totalPending = totalSales - totalPaid;

    return { 
      totalSales, 
      totalPaid, 
      totalPending, 
      totalSGKCoverage,
      patientPayment: totalSales - totalSGKCoverage
    };
  }, [mockSales]);

  // Calculate SGK coverage for a specific sale amount
  const calculateSaleWithSGK = (saleAmount: number, productType: 'device' | 'battery' | 'other' = 'device') => {
    if (!sgkCoverageCalculation) return { sgkCoverage: 0, patientPayment: saleAmount };

    let sgkCoverage = 0;
    
    if (productType === 'device' && sgkCoverageCalculation.deviceCoverage) {
      const maxCoverage = sgkCoverageCalculation.deviceCoverage.maxCoverage;
      const coveragePercentage = sgkCoverageCalculation.deviceCoverage.coveragePercentage / 100;
      sgkCoverage = Math.min(saleAmount * coveragePercentage, maxCoverage);
    } else if (productType === 'battery' && sgkCoverageCalculation.batteryCoverage) {
      const maxCoverage = sgkCoverageCalculation.batteryCoverage.maxCoverage;
      const coveragePercentage = sgkCoverageCalculation.batteryCoverage.coveragePercentage / 100;
      sgkCoverage = Math.min(saleAmount * coveragePercentage, maxCoverage);
    }

    return {
      sgkCoverage: Math.round(sgkCoverage),
      patientPayment: Math.round(saleAmount - sgkCoverage)
    };
  };

  // Filter and sort sales based on all criteria
  const filteredSales = useMemo(() => {
    let filtered = mockSales.filter((sale: Sale) => {
      // Date filter
      if (dateFilter !== 'all') {
        const saleDate = new Date(sale.saleDate || '');
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (saleDate < today || saleDate >= tomorrow) return false;
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (saleDate < weekAgo) return false;
            break;
          case 'month':
            if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) return false;
            break;
          case 'year':
            if (saleDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesNotes = sale.notes?.toLowerCase().includes(searchLower);
        const matchesAmount = sale.totalAmount?.toString().includes(searchTerm);
        if (!matchesNotes && !matchesAmount) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

      // Payment method filter
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) return false;

      // Amount range filter
      if (amountRangeMin && sale.totalAmount && sale.totalAmount < parseFloat(amountRangeMin)) return false;
      if (amountRangeMax && sale.totalAmount && sale.totalAmount > parseFloat(amountRangeMax)) return false;

      return true;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = new Date(a.saleDate || '').getTime();
          const dateB = new Date(b.saleDate || '').getTime();
          comparison = dateA - dateB;
          break;
        case 'amount':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [mockSales, dateFilter, searchTerm, statusFilter, paymentMethodFilter, amountRangeMin, amountRangeMax, sortBy, sortOrder]);

  // Placeholder functions for actions
  const handleCreateSale = () => {
    setShowNewSaleModal(true);
  };

  const handleNewSale = (saleData: any) => {
    console.log('Creating new sale:', saleData);
    // TODO: Implement API call to create sale
    setShowNewSaleModal(false);
  };

  const handleCollectionClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowCollectionModal(true);
  };

  const handlePromissoryNoteClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPromissoryNoteModal(true);
  };

  const handleEditSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowEditSaleModal(true);
  };

  const handleEditSale = (saleId: string) => {
    console.log('Editing sale:', saleId);
    // TODO: Implement edit sale functionality
  };

  const handleDeleteSale = (saleId: string) => {
    console.log('Deleting sale:', saleId);
    // TODO: Implement delete sale functionality
  };

  // Utility functions
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Tamamlandı</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Beklemede</Badge>;
      case 'cancelled':
        return <Badge variant="danger">İptal Edildi</Badge>;
      default:
        return <Badge variant="secondary">Bilinmiyor</Badge>;
    }
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'bank_transfer':
        return 'Banka Havalesi';
      case 'installment':
        return 'Taksit';
      default:
        return method || 'Belirtilmemiş';
    }
  };

  return (
    <div className="space-y-6">
      {/* SGK Patient Info Card */}
      {sgkPatientInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-blue-800">
                <Shield className="w-5 h-5 mr-2" />
                SGK Bilgileri
              </CardTitle>
              <Button 
                onClick={handleQueryPatientRights}
                disabled={sgkLoading}
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {sgkLoading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Hakları Sorgula
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-blue-700">Sigorta Durumu</p>
                <div className="flex items-center mt-1">
                  {sgkPatientInfo.hasInsurance ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-green-700 font-medium">Aktif</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                      <span className="text-red-700 font-medium">Pasif</span>
                    </>
                  )}
                </div>
              </div>
              
              {sgkPatientInfo.deviceEntitlement && (
                <div>
                  <p className="text-sm font-medium text-blue-700">Cihaz Hakkı</p>
                  <p className="text-sm text-gray-600">
                    Kalan: {sgkPatientInfo.deviceEntitlement.remainingQuantity} / {sgkPatientInfo.deviceEntitlement.maxQuantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    Geçerlilik: {new Date(sgkPatientInfo.deviceEntitlement.validUntil).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              )}
              
              {sgkPatientInfo.batteryEntitlement && (
                <div>
                  <p className="text-sm font-medium text-blue-700">Pil Hakkı</p>
                  <p className="text-sm text-gray-600">
                    Kalan: {sgkPatientInfo.batteryEntitlement.remainingQuantity} / {sgkPatientInfo.batteryEntitlement.maxQuantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    Geçerlilik: {new Date(sgkPatientInfo.batteryEntitlement.validUntil).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              )}
            </div>
            
            {sgkCoverageCalculation && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">SGK Kapsam Hesaplaması</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {sgkCoverageCalculation.deviceCoverage && (
                    <div>
                      <p className="font-medium text-gray-700">Cihaz Kapsamı</p>
                      <p className="text-gray-600">
                        Maksimum: ₺{sgkCoverageCalculation.deviceCoverage.maxCoverage.toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        Kapsam Oranı: %{sgkCoverageCalculation.deviceCoverage.coveragePercentage}
                      </p>
                    </div>
                  )}
                  {sgkCoverageCalculation.batteryCoverage && (
                    <div>
                      <p className="font-medium text-gray-700">Pil Kapsamı</p>
                      <p className="text-gray-600">
                        Maksimum: ₺{sgkCoverageCalculation.batteryCoverage.maxCoverage.toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        Kapsam Oranı: %{sgkCoverageCalculation.batteryCoverage.coveragePercentage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Satış</p>
                <p className="text-2xl font-bold text-green-600">₺{salesSummary.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SGK Kapsamı</p>
                <p className="text-2xl font-bold text-blue-600">₺{salesSummary.totalSGKCoverage.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hasta Ödemesi</p>
                <p className="text-2xl font-bold text-orange-600">₺{salesSummary.patientPayment.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kalan Tutar</p>
                <p className="text-2xl font-bold text-red-600">₺{salesSummary.totalPending.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Satış İşlemleri</h3>
        <div className="flex space-x-2">
          <Button onClick={handleCreateSale} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Button>
          <Button onClick={() => setShowProformaModal(true)} variant="outline">
            Proforma
          </Button>
          <Button onClick={() => setShowCollectionModal(true)} variant="outline">
            Tahsilat
          </Button>
          <Button onClick={() => setShowPromissoryNoteModal(true)} variant="outline">
            Senet
          </Button>
          <Button onClick={() => setShowReturnExchangeModal(true)} variant="outline">
            İade/Değişim
          </Button>
        </div>
      </div>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Satış Geçmişi</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Gelişmiş Filtre
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Dışa Aktar
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </div>
          
          {/* Basic Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Satış ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>
            
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="today">Bugün</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
              <option value="year">Bu Yıl</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="confirmed">Onaylandı</option>
              <option value="paid">Ödendi</option>
              <option value="cancelled">İptal</option>
            </select>

            <select 
              value={paymentMethodFilter} 
              onChange={(e) => setPaymentMethodFilter(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tüm Ödeme Yöntemleri</option>
              <option value="cash">Nakit</option>
              <option value="card">Kart</option>
              <option value="bank_transfer">Havale</option>
              <option value="installment">Taksit</option>
            </select>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Tutar
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amountRangeMin}
                    onChange={(e) => setAmountRangeMin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tutar
                  </label>
                  <Input
                    type="number"
                    placeholder="999999"
                    value={amountRangeMax}
                    onChange={(e) => setAmountRangeMax(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sıralama
                  </label>
                  <div className="flex space-x-2">
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')} 
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="date">Tarih</option>
                      <option value="amount">Tutar</option>
                      <option value="status">Durum</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {selectedSales.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {selectedSales.length} satış seçildi
                </span>
                <div className="flex space-x-2">
                   <Button 
                     size="sm" 
                     variant="outline"
                     onClick={() => handleExportSales(filteredSales.filter(sale => selectedSales.includes(sale.id)))}
                   >
                     <Download className="w-4 h-4 mr-1" />
                     Dışa Aktar
                   </Button>
                   <Button 
                     size="sm" 
                     variant="outline"
                     onClick={() => handlePrintSales(filteredSales.filter(sale => selectedSales.includes(sale.id)))}
                   >
                     <Printer className="w-4 h-4 mr-1" />
                     Yazdır
                   </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedSales([])}
                  >
                    Seçimi Temizle
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSales(filteredSales.map(sale => sale.id));
                        } else {
                          setSelectedSales([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortBy === 'date') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('date');
                          setSortOrder('desc');
                        }
                      }}>
                    <div className="flex items-center">
                      Tarih
                      {sortBy === 'date' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortBy === 'amount') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('amount');
                          setSortOrder('desc');
                        }
                      }}>
                    <div className="flex items-center">
                      Tutar
                      {sortBy === 'amount' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Yöntemi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortBy === 'status') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('status');
                          setSortOrder('asc');
                        }
                      }}>
                    <div className="flex items-center">
                      Durum
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className={selectedSales.includes(sale.id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSales.includes(sale.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSales([...selectedSales, sale.id]);
                          } else {
                            setSelectedSales(selectedSales.filter(id => id !== sale.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <p className="font-medium">₺{sale.totalAmount?.toLocaleString()}</p>
                        {sale.discountAmount && sale.discountAmount > 0 && (
                          <p className="text-xs text-green-600">İndirim: -₺{sale.discountAmount?.toLocaleString()}</p>
                        )}
                        {sale.sgkCoverage && sale.sgkCoverage > 0 && (
                          <p className="text-xs text-blue-600">SGK: ₺{sale.sgkCoverage?.toLocaleString()}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentMethodText(sale.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSaleClick(sale)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCollectionClick(sale)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePromissoryNoteClick(sale)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {dateFilter !== 'all' ? 'Bu tarihte satış bulunamadı.' : 'Henüz satış kaydı bulunmamaktadır.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Proforma Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Proforma Faturalar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz proforma fatura bulunmamaktadır.</p>
          </div>
        </CardContent>
      </Card>

      {/* Returns/Exchanges */}
      <Card>
        <CardHeader>
          <CardTitle>İadeler/Değişimler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz iade/değişim kaydı bulunmamaktadır.</p>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <SaleModal
        isOpen={showNewSaleModal}
        onClose={() => setShowNewSaleModal(false)}
        patient={patient}
        onSaleCreate={(saleData) => {
          console.log('New sale created:', saleData);
          setShowNewSaleModal(false);
        }}
      />
      
      {/* New Modals */}
      {selectedSale && (
        <ReturnExchangeModal
          isOpen={showReturnExchangeModal}
          onClose={() => setShowReturnExchangeModal(false)}
          patient={patient}
          sale={{
            id: selectedSale.id || '',
            productName: 'İşitme Cihazı',
            brand: 'Phonak',
            model: 'Audéo Paradise',
            serialNumber: '12345',
            salePrice: selectedSale.totalAmount || 0,
            saleDate: selectedSale.saleDate || '',
            paymentMethod: selectedSale.paymentMethod || '',
            status: selectedSale.status || ''
          }}
          onReturnExchangeCreate={(data) => {
            console.log('Return/Exchange data:', data);
            setShowReturnExchangeModal(false);
          }}
        />
      )}
      
      <ProformaModal
        isOpen={showProformaModal}
        onClose={() => setShowProformaModal(false)}
        patient={patient}
        onProformaCreate={(data) => {
          console.log('Proforma data:', data);
          setShowProformaModal(false);
        }}
      />
      
      {/* Existing Modals - Enabled */}
      {selectedSale && (
        <>
          <CollectionModal
            isOpen={showCollectionModal}
            onClose={() => setShowCollectionModal(false)}
            patient={patient}
            sale={selectedSale}
            onPaymentCreate={(paymentData) => {
              console.log('Payment created:', paymentData);
              setShowCollectionModal(false);
            }}
          />
          
          <PromissoryNoteModal
            isOpen={showPromissoryNoteModal}
            onClose={() => setShowPromissoryNoteModal(false)}
            patient={patient}
            sale={selectedSale}
            onSave={(noteData) => {
              console.log('Promissory note saved:', noteData);
              setShowPromissoryNoteModal(false);
            }}
          />
          
          <EditSaleModal
            isOpen={showEditSaleModal}
            onClose={() => setShowEditSaleModal(false)}
            patient={patient}
            sale={selectedSale}
            onSaleUpdate={(saleData) => {
              console.log('Sale updated:', saleData);
              setShowEditSaleModal(false);
            }}
          />
        </>
      )}
    </div>
  );
};

export { PatientSalesTab };