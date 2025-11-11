import { InvoiceStats as IInvoiceStats } from '../../types/invoice';

interface InvoiceStatsProps {
  stats: IInvoiceStats;
  loading?: boolean;
}

export function InvoiceStats({ stats, loading = false }: InvoiceStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Toplam Fatura',
      value: stats.total || 0,
      subtitle: '+12% bu ay',
      icon: '📋',
      color: 'blue'
    },
    {
      title: 'Taslak',
      value: stats.draft || 0,
      subtitle: `${stats.total ? Math.round(((stats.draft || 0) / stats.total) * 100) : 0}% oran`,
      icon: '📝',
      color: 'gray'
    },
    {
      title: 'Gönderildi',
      value: stats.sent || 0,
      subtitle: `${stats.total ? Math.round(((stats.sent || 0) / stats.total) * 100) : 0}% oran`,
      icon: '📤',
      color: 'blue'
    },
    {
      title: 'Ödendi',
      value: stats.paid || 0,
      subtitle: `${stats.total ? Math.round(((stats.paid || 0) / stats.total) * 100) : 0}% oran`,
      icon: '✅',
      color: 'green'
    },
    {
      title: 'Toplam Tutar',
      value: formatCurrency(stats.totalAmount || 0),
      subtitle: '+8.2% bu ay',
      icon: '💰',
      color: 'purple'
    },
    {
      title: 'Bekleyen Ödeme',
      value: formatCurrency(stats.pendingAmount || 0),
      subtitle: `${stats.total ? stats.sent || 0 : 0} fatura`,
      icon: '⏳',
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-600', iconBg: 'bg-gray-100' },
      green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
      {statCards.map((card, index) => {
        const colors = getColorClasses(card.color);
        return (
          <div
            key={index}
            className={`${colors.bg} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mb-1">{card.value}</p>
                <p className="text-xs text-gray-500">{card.subtitle}</p>
              </div>
              <div className={`p-3 ${colors.iconBg} rounded-full`}>
                <span className="text-lg">{card.icon}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
