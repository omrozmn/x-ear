import React, { useState, useMemo } from 'react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { Plus, DollarSign, Edit, FileText } from 'lucide-react';
import { Patient } from '../../types/patient';
import { Sale } from '../../types/patient/patient-communication.types';
import NewSaleModal from './modals/NewSaleModal';
import CollectionModal from './modals/CollectionModal';
import PromissoryNoteModal from './modals/PromissoryNoteModal';
import EditSaleModal from './modals/EditSaleModal';

interface PatientSalesTabProps {
  patient: Patient;
}

export default function PatientSalesTab({ patient }: PatientSalesTabProps) {
  const [dateFilter, setDateFilter] = useState('all');
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPromissoryNoteModal, setShowPromissoryNoteModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>(undefined);
  
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
    const totalPaid = mockSales.reduce((sum: number, sale: Sale) => {
      const payments = sale.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0;
      return sum + payments;
    }, 0);
    const totalPending = totalSales - totalPaid;

    return { totalSales, totalPaid, totalPending };
  }, [mockSales]);

  // Filter sales based on date
  const filteredSales = useMemo(() => {
    return mockSales.filter((sale: Sale) => {
      if (dateFilter === 'all') return true;
      
      const saleDate = new Date(sale.saleDate || '');
      const now = new Date();
      
      switch (dateFilter) {
        case 'thisMonth':
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
        case 'thisYear':
          return saleDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [mockSales, dateFilter]);

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
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-sm font-medium text-gray-600">Ödenen Tutar</p>
                <p className="text-2xl font-bold text-blue-600">₺{salesSummary.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kalan Tutar</p>
                <p className="text-2xl font-bold text-orange-600">₺{salesSummary.totalPending.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <DollarSign className="w-6 h-6 text-orange-600" />
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
          <Button onClick={() => setShowCollectionModal(true)} variant="outline">
            Tahsilat
          </Button>
          <Button onClick={() => setShowPromissoryNoteModal(true)} variant="outline">
            Senet
          </Button>
        </div>
      </div>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Satış Geçmişi</CardTitle>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-48 px-3 py-2 border border-gray-300 rounded-md">
                <option value="all">Tüm Zamanlar</option>
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="year">Bu Yıl</option>
              </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Yöntemi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
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
      <NewSaleModal
        isOpen={showNewSaleModal}
        onClose={() => setShowNewSaleModal(false)}
        patient={patient}
        onSaleCreate={handleNewSale}
      />
      
      {/* TODO: Fix modal type conflicts */}
      {/* {selectedSale && (
        <>
          <CollectionModal
            isOpen={showCollectionModal}
            onClose={() => setShowCollectionModal(false)}
            sale={selectedSale}
          />
          
          <PromissoryNoteModal
            isOpen={showPromissoryNoteModal}
            onClose={() => setShowPromissoryNoteModal(false)}
            sale={selectedSale}
          />
          
          <EditSaleModal
            isOpen={showEditSaleModal}
            onClose={() => setShowEditSaleModal(false)}
            patient={patient}
            sale={selectedSale}
            onSaleUpdate={() => {}}
          />
        </>
      )} */}
    </div>
  );
}