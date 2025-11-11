import { useEffect, useState } from 'react';
import { InvoiceStats as IInvoiceStats } from '../../types/invoice';
import { invoiceService } from '../../services/invoice.service';

export function InvoiceStats() {
  const [stats, setStats] = useState<IInvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoiceStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading invoice stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Toplam Fatura',
      value: stats.total || 0,
      icon: '📄',
      color: 'blue',
      trend: '+12%'
    },
    {
      title: 'Taslak',
      value: stats.draft || 0,
      icon: '✏️',
      color: 'gray',
      subtitle: `${stats.total ? Math.round(((stats.draft || 0) / stats.total) * 100) : 0}%`
    },
    {
      title: 'Gönderildi',
      value: stats.sent || 0,
      icon: '📤',
      color: 'blue',
      subtitle: `${stats.total ? Math.round(((stats.sent || 0) / stats.total) * 100) : 0}%`
    },
    {
      title: 'Ödendi',
      value: stats.paid || 0,
      icon: '✅',
      color: 'green',
      subtitle: `${stats.total ? Math.round(((stats.paid || 0) / stats.total) * 100) : 0}%`
    },
    {
      title: 'Vadesi Geçti',
      value: stats.overdue || 0,
      icon: '⚠️',
      color: 'red',
      subtitle: stats.overdueAmount ? formatCurrency(stats.overdueAmount) : undefined
    },
    {
      title: 'Toplam Tutar',
      value: formatCurrency(stats.totalAmount || 0),
      icon: '💰',
      color: 'purple',
      trend: '+8.2%'
    },
    {
      title: 'Ödenen Tutar',
      value: formatCurrency(stats.paidAmount || 0),
      icon: '💵',
      color: 'green',
      subtitle: `${stats.totalAmount ? Math.round(((stats.paidAmount || 0) / stats.totalAmount) * 100) : 0}%`
    },
    {
      title: 'Bekleyen Tutar',
      value: formatCurrency(stats.pendingAmount || 0),
      icon: '⏳',
      color: 'yellow',
      subtitle: `${stats.totalAmount ? Math.round(((stats.pendingAmount || 0) / stats.totalAmount) * 100) : 0}%`
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((card, index) => {
        const colors = getColorClasses(card.color);
        return (
          <div
            key={index}
            className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${colors.text} mt-1`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                )}
                {card.trend && (
                  <p className="text-xs text-green-600 mt-1">{card.trend} bu ay</p>
                )}
              </div>
              <div className={`p-3 ${colors.bg} rounded-full`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
