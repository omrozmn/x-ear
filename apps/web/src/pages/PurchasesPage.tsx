import React, { useState, useEffect } from 'react';
import { Card, Button } from '@x-ear/ui-web';
import { ShoppingCart, Plus, Download, Filter, Search, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierTaxNumber?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  invoiceDate: string;
  dueDate?: string;
  status: 'draft' | 'approved' | 'paid' | 'overdue';
  paymentMethod?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // TODO: API entegrasyonu yapılacak
      // Şimdilik mock data
      const mockPurchases: PurchaseInvoice[] = [
        {
          id: '1',
          invoiceNumber: 'ALI-2024-001',
          supplierName: 'ABC Medikal Ltd.',
          supplierTaxNumber: '1234567890',
          amount: 5000,
          taxAmount: 900,
          totalAmount: 5900,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'approved',
          items: [
            { name: 'İşitme Cihazı - Model A', quantity: 2, unitPrice: 2500, totalPrice: 5000 }
          ]
        },
        {
          id: '2',
          invoiceNumber: 'ALI-2024-002',
          supplierName: 'XYZ Tıbbi Malzeme',
          supplierTaxNumber: '9876543210',
          amount: 3200,
          taxAmount: 576,
          totalAmount: 3776,
          invoiceDate: new Date(Date.now() - 86400000).toISOString(),
          status: 'paid',
          paymentMethod: 'Havale'
        },
        {
          id: '3',
          invoiceNumber: 'ALI-2024-003',
          supplierName: 'DEF Sağlık Ürünleri',
          amount: 1500,
          taxAmount: 270,
          totalAmount: 1770,
          invoiceDate: new Date(Date.now() - 172800000).toISOString(),
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          status: 'overdue'
        }
      ];
      setPurchases(mockPurchases);
    } catch (error) {
      console.error('Alış faturaları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = searchTerm === '' || 
      purchase.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: PurchaseInvoice['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    const labels = {
      draft: 'Taslak',
      approved: 'Onaylandı',
      paid: 'Ödendi',
      overdue: 'Gecikmiş'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const paidPurchases = filteredPurchases
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingPurchases = filteredPurchases
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Alış faturaları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alış Faturaları</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tedarikçi faturalarını yönetin</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download size={18} />
            Dışa Aktar
          </Button>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} />
            Yeni Alış Faturası
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Alış</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(totalPurchases, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ödenen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(paidPurchases, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileText className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bekleyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(pendingPurchases, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <FileText className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Fatura no veya tedarikçi ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="approved">Onaylandı</option>
              <option value="paid">Ödendi</option>
              <option value="overdue">Gecikmiş</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={18} />
              Filtrele
            </Button>
          </div>
        </div>
      </Card>

      {/* Purchases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fatura No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tedarikçi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  KDV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Toplam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {purchase.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{purchase.supplierName}</div>
                    {purchase.supplierTaxNumber && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        VKN: {purchase.supplierTaxNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(purchase.amount, 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(purchase.taxAmount, 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(purchase.totalAmount, 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(purchase.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(purchase.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button variant="ghost" size="sm">
                      Detay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Alış faturası bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Arama kriterlerinize uygun alış faturası yok.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
