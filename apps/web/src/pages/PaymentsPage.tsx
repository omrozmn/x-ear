import React, { useState, useEffect } from 'react';
import { Card, Button } from '@x-ear/ui-web';
import { CreditCard, Calendar, DollarSign, Filter, Download, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';

interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  partyName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: 'completed' | 'pending' | 'failed';
  referenceNumber?: string;
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      // TODO: API entegrasyonu yapılacak
      // Şimdilik mock data
      const mockPayments: Payment[] = [
        {
          id: '1',
          invoiceId: 'inv-001',
          invoiceNumber: 'INV-2024-001',
          partyName: 'Ahmet Yılmaz',
          amount: 1500,
          paymentMethod: 'Kredi Kartı',
          paymentDate: new Date().toISOString(),
          status: 'completed',
          referenceNumber: 'REF-001'
        },
        {
          id: '2',
          invoiceId: 'inv-002',
          invoiceNumber: 'INV-2024-002',
          partyName: 'Ayşe Demir',
          amount: 2300,
          paymentMethod: 'Nakit',
          paymentDate: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        },
        {
          id: '3',
          invoiceId: 'inv-003',
          invoiceNumber: 'INV-2024-003',
          partyName: 'Mehmet Kaya',
          amount: 1800,
          paymentMethod: 'Havale',
          paymentDate: new Date(Date.now() - 172800000).toISOString(),
          status: 'pending'
        }
      ];
      setPayments(mockPayments);
    } catch (error) {
      console.error('Ödemeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.partyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Payment['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    const labels = {
      completed: 'Tamamlandı',
      pending: 'Beklemede',
      failed: 'Başarısız'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const totalAmount = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = filteredPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Ödemeler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ödeme Takibi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Fatura ödemelerini takip edin</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download size={18} />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Ödeme</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(totalAmount, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bekleyen Ödeme</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(pendingAmount, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Calendar className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam İşlem</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {filteredPayments.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
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
              data-allow-raw="true"
              type="text"
              placeholder="Fatura no veya hasta ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              data-allow-raw="true"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="completed">Tamamlandı</option>
              <option value="pending">Beklemede</option>
              <option value="failed">Başarısız</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={18} />
              Filtrele
            </Button>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fatura No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hasta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ödeme Yöntemi
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
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {payment.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {payment.partyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount, 'TRY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {payment.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
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

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Ödeme bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Arama kriterlerinize uygun ödeme kaydı yok.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
