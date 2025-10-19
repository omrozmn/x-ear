import React, { useState } from 'react';
import { Button, Input } from '@x-ear/ui-web';
import { Plus, DollarSign, Settings, Trash2, FileText } from 'lucide-react';
import { Patient, Sale } from '../../types/patient';

interface PatientSalesTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientSalesTab: React.FC<PatientSalesTabProps> = ({ 
  patient, 
  onPatientUpdate 
}) => {
  const [dateFilter, setDateFilter] = useState('all');

  // Use mock data from patient prop for now
  const sales = patient.sales || [];

  // Calculate sales summary from patient data
  const salesSummary = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
    totalCount: sales.length,
    remainingAmount: sales.reduce((sum, sale) => {
      const paidAmount = sale.payments?.reduce((pSum, payment) => pSum + payment.amount, 0) || 0;
      return sum + ((sale.totalAmount || 0) - paidAmount);
    }, 0),
  };

  // Filter sales based on date filter
  const filteredSales = sales.filter((sale) => {
    if (dateFilter === 'all') return true;
    
    const saleDate = new Date(sale.saleDate || '');
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return saleDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= monthAgo;
      default:
        return true;
    }
  });

  const handleCreateSale = (saleData: any) => {
    // TODO: Implement API integration
    console.log('Creating sale:', saleData);
  };

  const handleNewSale = () => {
    // TODO: Implement new sale creation
    console.log('Creating new sale...');
  };

  const handleCollection = () => {
    // TODO: Implement collection
    console.log('Opening collection modal...');
  };

  const handlePromissoryNote = () => {
    // TODO: Implement promissory note
    console.log('Opening promissory note modal...');
  };

  const handleEditSale = (saleId: string) => {
    // TODO: Implement sale editing
    console.log('Editing sale:', saleId);
  };

  const handleDeleteSale = (saleId: string) => {
    // TODO: Implement API integration
    console.log('Deleting sale:', saleId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'credit':
        return 'Kredi Kartı';
      case 'check':
        return 'Çek';
      case 'transfer':
        return 'Havale';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Satış</p>
              <p className="text-2xl font-bold text-green-600">₺{salesSummary.totalAmount.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satış Adedi</p>
              <p className="text-2xl font-bold text-blue-600">{salesSummary.totalCount}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kalan Tutar</p>
              <p className="text-2xl font-bold text-orange-600">₺{salesSummary.remainingAmount.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-full">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Satış İşlemleri</h3>
        <div className="flex space-x-2">
          <Button onClick={handleNewSale} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış
          </Button>
          <Button onClick={handleCollection} variant="outline">
            Tahsilat
          </Button>
          <Button onClick={handlePromissoryNote} variant="outline">
            Senet
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Satış Geçmişi</h3>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="today">Bugün</option>
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün/Cihaz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ödeme
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
              {filteredSales.map((sale: Sale, index: number) => (
                <tr key={sale.id || index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p className="font-medium">{sale.productId || 'Ürün'}</p>
                      {sale.notes && (
                        <p className="text-xs text-gray-400">{sale.notes}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p className="font-medium">₺{sale.totalAmount?.toLocaleString()}</p>
                      {sale.discountAmount && sale.discountAmount > 0 && (
                        <p className="text-xs text-green-600">-₺{sale.discountAmount?.toLocaleString()}</p>
                      )}
                      {sale.patientPayment && sale.patientPayment < (sale.totalAmount || 0) && (
                        <p className="text-xs text-orange-600">Kalan: ₺{((sale.totalAmount || 0) - sale.patientPayment).toLocaleString()}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPaymentMethodText(sale.paymentMethod || 'cash')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(sale.status || 'pending')}`}>
                      {sale.status === 'completed' ? 'Tamamlandı' :
                       sale.status === 'pending' ? 'Beklemede' :
                       sale.status === 'cancelled' ? 'İptal' : sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleEditSale(sale.id || '')}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteSale(sale.id || '')}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {dateFilter !== 'all' ? 'Bu tarihte satış bulunamadı.' : 'Henüz satış kaydı bulunmamaktadır.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proformas Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Proforma Faturalar</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <p>Henüz proforma fatura bulunmamaktadır.</p>
          </div>
        </div>
      </div>

      {/* Returns/Exchanges Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">İadeler/Değişimler</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <p>Henüz iade/değişim kaydı bulunmamaktadır.</p>
          </div>
        </div>
      </div>
    </div>
  );
};