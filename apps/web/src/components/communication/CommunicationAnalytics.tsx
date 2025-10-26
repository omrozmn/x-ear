import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Mail,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, Button, Badge, Select } from '@x-ear/ui-web';

interface CommunicationStats {
  totalMessages: number;
  totalSMS: number;
  totalEmails: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
  avgResponseTime: number;
  totalCost: number;
  activeTemplates: number;
  activeCampaigns: number;
}

interface TimeSeriesData {
  date: string;
  sms: number;
  email: number;
  delivered: number;
  failed: number;
  cost: number;
}

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

interface TemplateUsage {
  templateName: string;
  usageCount: number;
  successRate: number;
  category: string;
}

interface CampaignPerformance {
  campaignName: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  cost: number;
  roi: number;
}

interface CommunicationAnalyticsProps {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  onRefresh?: () => void;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6'
};


export default function CommunicationAnalytics({ dateRange, onRefresh }: CommunicationAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CommunicationStats>({
    totalMessages: 0,
    totalSMS: 0,
    totalEmails: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    failureRate: 0,
    avgResponseTime: 0,
    totalCost: 0,
    activeTemplates: 0,
    activeCampaigns: 0
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'delivery' | 'cost'>('volume');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in real implementation, this would come from API
      const mockStats: CommunicationStats = {
        totalMessages: 15420,
        totalSMS: 9850,
        totalEmails: 5570,
        deliveryRate: 94.2,
        openRate: 68.5,
        clickRate: 12.3,
        failureRate: 5.8,
        avgResponseTime: 2.4,
        totalCost: 1250.75,
        activeTemplates: 24,
        activeCampaigns: 8
      };

      const mockTimeSeriesData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          sms: Math.floor(Math.random() * 200) + 100,
          email: Math.floor(Math.random() * 150) + 50,
          delivered: Math.floor(Math.random() * 300) + 200,
          failed: Math.floor(Math.random() * 20) + 5,
          cost: Math.random() * 50 + 20
        };
      });

      const mockChannelData: ChannelData[] = [
        { name: 'SMS', value: mockStats.totalSMS, color: COLORS.primary },
        { name: 'E-posta', value: mockStats.totalEmails, color: COLORS.success }
      ];

      const mockTemplateUsage: TemplateUsage[] = [
        { templateName: 'Randevu Hatırlatması', usageCount: 2450, successRate: 96.2, category: 'Randevu' },
        { templateName: 'Ödeme Bildirimi', usageCount: 1890, successRate: 94.8, category: 'Ödeme' },
        { templateName: 'Hoş Geldiniz Mesajı', usageCount: 1650, successRate: 98.1, category: 'Karşılama' },
        { templateName: 'Tedavi Sonrası Takip', usageCount: 1420, successRate: 92.5, category: 'Takip' },
        { templateName: 'Kampanya Bildirimi', usageCount: 980, successRate: 87.3, category: 'Pazarlama' }
      ];

      const mockCampaignPerformance: CampaignPerformance[] = [
        { campaignName: 'Yaz Kampanyası 2024', totalSent: 5000, delivered: 4750, opened: 3200, clicked: 640, cost: 450, roi: 2.8 },
        { campaignName: 'Randevu Hatırlatma', totalSent: 3200, delivered: 3100, opened: 2800, clicked: 420, cost: 280, roi: 1.9 },
        { campaignName: 'Yeni Hasta Karşılama', totalSent: 2800, delivered: 2650, opened: 2100, clicked: 315, cost: 220, roi: 2.1 },
        { campaignName: 'Tedavi Takip', totalSent: 2100, delivered: 2000, opened: 1680, clicked: 252, cost: 180, roi: 1.6 }
      ];

      setStats(mockStats);
      setTimeSeriesData(mockTimeSeriesData);
      setChannelData(mockChannelData);
      setTemplateUsage(mockTemplateUsage);
      setCampaignPerformance(mockCampaignPerformance);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedPeriod]);

  // Calculate trends
  const trends = useMemo(() => {
    if (timeSeriesData.length < 2) return {};
    
    const recent = timeSeriesData.slice(-7);
    const previous = timeSeriesData.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.sms + item.email, 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + item.sms + item.email, 0) / previous.length;
    
    const volumeTrend = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    const recentDeliveryRate = recent.reduce((sum, item) => sum + (item.delivered / (item.sms + item.email)), 0) / recent.length * 100;
    const previousDeliveryRate = previous.reduce((sum, item) => sum + (item.delivered / (item.sms + item.email)), 0) / previous.length * 100;
    
    const deliveryTrend = recentDeliveryRate - previousDeliveryRate;
    
    return {
      volume: volumeTrend,
      delivery: deliveryTrend,
      cost: Math.random() * 20 - 10 // Mock trend
    };
  }, [timeSeriesData]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    format = 'number',
    color = 'blue' 
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    trend?: number;
    format?: 'number' | 'percentage' | 'currency' | 'time';
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'percentage':
          return `%${val.toFixed(1)}`;
        case 'currency':
          return `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        case 'time':
          return `${val.toFixed(1)}s`;
        default:
          return val.toLocaleString('tr-TR');
      }
    };

    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600'
    };

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatValue(value)}
            </p>
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">İletişim Analitikleri</h2>
          <p className="text-gray-600 mt-1">
            İletişim performansınızı izleyin ve optimize edin
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d' | 'custom')}
            options={[
              { value: '7d', label: 'Son 7 Gün' },
              { value: '30d', label: 'Son 30 Gün' },
              { value: '90d', label: 'Son 90 Gün' },
              { value: 'custom', label: 'Özel' }
            ]}
          />
          
          <Button
            variant="outline"
            onClick={() => {
              fetchAnalytics();
              onRefresh?.();
            }}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Mesaj"
          value={stats.totalMessages}
          icon={MessageSquare}
          trend={trends.volume}
          color="blue"
        />
        <StatCard
          title="Teslimat Oranı"
          value={stats.deliveryRate}
          icon={CheckCircle}
          trend={trends.delivery}
          format="percentage"
          color="green"
        />
        <StatCard
          title="Açılma Oranı"
          value={stats.openRate}
          icon={Mail}
          format="percentage"
          color="purple"
        />
        <StatCard
          title="Toplam Maliyet"
          value={stats.totalCost}
          icon={TrendingUp}
          trend={trends.cost}
          format="currency"
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mesaj Hacmi Trendi</h3>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as 'volume' | 'delivery' | 'cost')}
              options={[
                { value: 'volume', label: 'Hacim' },
                { value: 'delivery', label: 'Teslimat' },
                { value: 'cost', label: 'Maliyet' }
              ]}
            />
          </div>
          
          {/* Simple Chart Placeholders */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-gray-500 text-sm">
                {selectedMetric === 'volume' && 'SMS ve E-posta Hacmi Grafiği'}
                {selectedMetric === 'delivery' && 'Teslimat Oranı Grafiği'}
                {selectedMetric === 'cost' && 'Maliyet Analizi Grafiği'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Grafik kütüphanesi yüklendikten sonra görüntülenecek
              </p>
            </div>
          </div>
        </Card>

        {/* Channel Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kanal Dağılımı</h3>
          
          {/* Simple Pie Chart Placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mb-4">
            <div className="text-center">
              <div className="text-gray-400 mb-2">🥧</div>
              <p className="text-gray-500 text-sm">Kanal Dağılımı Grafiği</p>
              <p className="text-xs text-gray-400 mt-1">
                Grafik kütüphanesi yüklendikten sonra görüntülenecek
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {channelData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium">{item.value.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Template Usage */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Şablon Kullanım İstatistikleri</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şablon Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanım
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başarı Oranı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performans
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templateUsage.map((template, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{template.templateName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary">{template.category}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.usageCount.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    %{template.successRate.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${template.successRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {template.successRate > 95 ? 'Mükemmel' : 
                         template.successRate > 90 ? 'İyi' : 
                         template.successRate > 80 ? 'Orta' : 'Düşük'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Campaign Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kampanya Performansı</h3>
        
        {/* Simple Bar Chart Placeholder */}
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mb-4">
          <div className="text-center">
            <div className="text-gray-400 mb-2">📊</div>
            <p className="text-gray-500 text-sm">Kampanya Performans Grafiği</p>
            <p className="text-xs text-gray-400 mt-1">
              Grafik kütüphanesi yüklendikten sonra görüntülenecek
            </p>
          </div>
        </div>

        {/* Campaign Performance Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kampanya
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gönderilen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teslim Edilen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Açılan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tıklanan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignPerformance.map((campaign, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{campaign.campaignName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.totalSent.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.delivered.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.opened.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.clicked.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={campaign.roi > 2 ? 'success' : campaign.roi > 1.5 ? 'warning' : 'secondary'}>
                      {campaign.roi.toFixed(1)}x
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}