import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users, 
  CreditCard, 
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Button, Input, Select, DatePicker } from '@x-ear/ui-web';
import { KPICard } from '../components/dashboard/KPICard';

interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  branch?: string;
  paymentMethod?: string;
  saleType?: string;
  sgkStatus?: string;
}

interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  totalPaid: number;
  totalPending: number;
  sgkSupport: number;
  completionRate: number;
  paymentMethods: {
    cash: number;
    card: number;
    installment: number;
    transfer: number;
    sgk: number;
  };
}

interface PaymentMetrics {
  totalCollected: number;
  pendingPayments: number;
  overduePayments: number;
  installmentPayments: number;
  promissoryNotes: number;
  collectionRate: number;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'payments' | 'analytics'>('overview');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  });
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    totalPaid: 0,
    totalPending: 0,
    sgkSupport: 0,
    completionRate: 0,
    paymentMethods: {
      cash: 0,
      card: 0,
      installment: 0,
      transfer: 0,
      sgk: 0
    }
  });
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics>({
    totalCollected: 0,
    pendingPayments: 0,
    overduePayments: 0,
    installmentPayments: 0,
    promissoryNotes: 0,
    collectionRate: 0
  });
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    loadReportData();
  }, [filters]);

  const loadReportData = async () => {
    setLoading(true);
    
    // Simulate API call with mock data
    setTimeout(() => {
      setSalesMetrics({
        totalRevenue: 2450000,
        totalSales: 156,
        averageOrderValue: 15705,
        totalPaid: 1890000,
        totalPending: 560000,
        sgkSupport: 980000,
        completionRate: 77.1,
        paymentMethods: {
          cash: 450000,
          card: 680000,
          installment: 520000,
          transfer: 240000,
          sgk: 560000
        }
      });

      setPaymentMetrics({
        totalCollected: 1890000,
        pendingPayments: 560000,
        overduePayments: 125000,
        installmentPayments: 340000,
        promissoryNotes: 95000,
        collectionRate: 77.1
      });

      setLoading(false);
    }, 1000);
  };

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
    // TODO: Implement actual export functionality
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `%${value.toFixed(1)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Raporlar ve Analizler</h1>
              <p className="mt-1 text-sm text-gray-500">
                Satış performansı ve ödeme takibi raporları
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button
                onClick={() => exportReport('pdf')}
                variant="outline"
                icon={<Download className="w-4 h-4" />}
              >
                PDF İndir
              </Button>
              <Button
                onClick={() => exportReport('excel')}
                variant="outline"
                icon={<Download className="w-4 h-4" />}
              >
                Excel İndir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtreler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi
              </label>
              <Input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  start: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi
              </label>
              <Input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  end: e.target.value
                })}
              />
            </div>
            <div>
              <Select
                label="Şube"
                value={filters.branch || ''}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                options={[
                  { value: '', label: 'Tüm Şubeler' },
                  { value: 'merkez', label: 'Merkez Şube' },
                  { value: 'kadikoy', label: 'Kadıköy Şube' },
                  { value: 'besiktas', label: 'Beşiktaş Şube' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Ödeme Yöntemi"
                value={filters.paymentMethod || ''}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                options={[
                  { value: '', label: 'Tüm Yöntemler' },
                  { value: 'cash', label: 'Nakit' },
                  { value: 'card', label: 'Kart' },
                  { value: 'installment', label: 'Taksit' },
                  { value: 'transfer', label: 'Havale' },
                  { value: 'sgk', label: 'SGK' }
                ]}
              />
            </div>
            <div>
              <Select
                label="SGK Durumu"
                value={filters.sgkStatus || ''}
                onChange={(e) => handleFilterChange('sgkStatus', e.target.value)}
                options={[
                  { value: '', label: 'Tümü' },
                  { value: 'with_sgk', label: 'SGK Destekli' },
                  { value: 'without_sgk', label: 'SGK Desteksiz' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
                { id: 'sales', label: 'Satış Performansı', icon: TrendingUp },
                { id: 'payments', label: 'Ödeme Takibi', icon: CreditCard },
                { id: 'analytics', label: 'Detaylı Analiz', icon: PieChart }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    data-allow-raw
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard
                    title="Toplam Ciro"
                    value={formatCurrency(salesMetrics.totalRevenue)}
                    icon={DollarSign}
                    color="green"
                    trend={{ value: "+12.5%", direction: "up" }}
                  />
                  <KPICard
                    title="Toplam Satış"
                    value={salesMetrics.totalSales}
                    icon={FileText}
                    color="blue"
                    trend={{ value: "+8.3%", direction: "up" }}
                  />
                  <KPICard
                    title="Tahsilat Oranı"
                    value={formatPercentage(paymentMetrics.collectionRate)}
                    icon={Activity}
                    color="purple"
                    trend={{ value: "+2.1%", direction: "up" }}
                  />
                  <KPICard
                    title="Ortalama Satış"
                    value={formatCurrency(salesMetrics.averageOrderValue)}
                    icon={TrendingUp}
                    color="yellow"
                    trend={{ value: "+5.7%", direction: "up" }}
                  />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Satış Özeti</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Toplam Ciro:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tahsil Edilen:</span>
                        <span className="font-medium text-green-600">{formatCurrency(salesMetrics.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bekleyen:</span>
                        <span className="font-medium text-yellow-600">{formatCurrency(salesMetrics.totalPending)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SGK Desteği:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(salesMetrics.sgkSupport)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Ödeme Yöntemleri</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nakit:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.paymentMethods.cash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kart:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.paymentMethods.card)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taksit:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.paymentMethods.installment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Havale:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.paymentMethods.transfer)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SGK:</span>
                        <span className="font-medium">{formatCurrency(salesMetrics.paymentMethods.sgk)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Satış Performansı Analizi</h3>
                
                {/* Sales Performance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm text-blue-600">Aylık Büyüme</p>
                        <p className="text-2xl font-bold text-blue-900">+12.5%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm text-green-600">Yeni Müşteriler</p>
                        <p className="text-2xl font-bold text-green-900">47</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="flex items-center">
                      <Calendar className="w-8 h-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm text-purple-600">Günlük Ortalama</p>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(salesMetrics.totalRevenue / 30)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Chart Placeholder */}
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Satış Trendi Grafiği</h4>
                  <p className="text-gray-500">Günlük, haftalık ve aylık satış trendlerini görüntüleyin</p>
                  <Button className="mt-4" variant="outline">
                    Grafik Görünümü
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Ödeme Takibi ve Tahsilat</h3>
                
                {/* Payment Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <DollarSign className="w-6 h-6 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-green-600">Tahsil Edilen</p>
                        <p className="text-xl font-bold text-green-900">
                          {formatCurrency(paymentMetrics.totalCollected)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <Calendar className="w-6 h-6 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-sm text-yellow-600">Bekleyen Ödemeler</p>
                        <p className="text-xl font-bold text-yellow-900">
                          {formatCurrency(paymentMetrics.pendingPayments)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <Activity className="w-6 h-6 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm text-red-600">Geciken Ödemeler</p>
                        <p className="text-xl font-bold text-red-900">
                          {formatCurrency(paymentMetrics.overduePayments)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <CreditCard className="w-6 h-6 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-blue-600">Taksitli Ödemeler</p>
                        <p className="text-xl font-bold text-blue-900">
                          {formatCurrency(paymentMetrics.installmentPayments)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Tahsilat Durumu</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tahsilat Oranı</span>
                        <span className="text-lg font-semibold text-green-600">
                          {formatPercentage(paymentMetrics.collectionRate)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${paymentMetrics.collectionRate}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Hedef: %85 (Mevcut: {formatPercentage(paymentMetrics.collectionRate)})
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Senet Takibi</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Toplam Senet:</span>
                        <span className="font-medium">{formatCurrency(paymentMetrics.promissoryNotes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vadesi Gelen:</span>
                        <span className="font-medium text-yellow-600">{formatCurrency(45000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vadesi Geçen:</span>
                        <span className="font-medium text-red-600">{formatCurrency(15000)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Detaylı Analiz ve İstatistikler</h3>
                
                {/* Analytics Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Ürün Kategorisi Analizi</h4>
                    <p className="text-gray-500">En çok satan ürün kategorilerini görüntüleyin</p>
                  </div>
                  
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Müşteri Segmentasyonu</h4>
                    <p className="text-gray-500">Müşteri gruplarına göre satış analizi</p>
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Gelişmiş Metrikler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">4.2</p>
                      <p className="text-sm text-gray-600">Ortalama Müşteri Puanı</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">68%</p>
                      <p className="text-sm text-gray-600">Müşteri Memnuniyeti</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">23%</p>
                      <p className="text-sm text-gray-600">Tekrar Satış Oranı</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;