import { Card } from '@x-ear/ui-web';
import { FileText, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { useGetInvoiceSummary } from '@/api/client/invoices.client';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileLayout } from '@/components/mobile/MobileLayout';

export function InvoiceSummaryPage() {
  const { data, isLoading } = useGetInvoiceSummary();
  const isMobile = useIsMobile();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-muted-foreground">Fatura özeti yükleniyor...</span>
      </div>
    );
  }

  const incomingTotal = Number(stats?.incomingTotal ?? 0);
  const outgoingTotal = Number(stats?.outgoingTotal ?? 0);
  const netBalance = outgoingTotal - incomingTotal;
  const monthlyIncoming = Number(stats?.monthlyIncoming ?? 0);
  const monthlyOutgoing = Number(stats?.monthlyOutgoing ?? 0);
  const pendingIncoming = stats?.pendingIncoming ?? 0;
  const pendingOutgoing = stats?.pendingOutgoing ?? 0;

  const content = (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
      {/* Header */}
      {isMobile ? (
        <MobileHeader title="Fatura Özeti" showBack={false} />
      ) : (
        <DesktopPageHeader
          title="Fatura Özeti"
          description="Gelen ve giden faturaların genel durumu"
          icon={<FileText className="h-6 w-6" />}
          eyebrow={{ tr: 'Finans Özeti', en: 'Invoice Summary' }}
        />
      )}

      {/* KPI Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gelen Faturalar</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatCurrency(incomingTotal, 'TRY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{pendingIncoming} bekleyen</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl">
              <TrendingDown className="text-primary" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Giden Faturalar</p>
              <p className="text-2xl font-bold text-success mt-1">
                {formatCurrency(outgoingTotal, 'TRY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{pendingOutgoing} bekleyen</p>
            </div>
            <div className="p-3 bg-success/10 rounded-2xl">
              <TrendingUp className="text-success" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Bakiye</p>
              <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(Math.abs(netBalance), 'TRY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {netBalance >= 0 ? 'Gelir fazlası' : 'Gider fazlası'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${netBalance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <BarChart3 className={netBalance >= 0 ? 'text-success' : 'text-destructive'} size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bu Ay</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(monthlyIncoming + monthlyOutgoing, 'TRY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Gelen {formatCurrency(monthlyIncoming, 'TRY')} · Giden {formatCurrency(monthlyOutgoing, 'TRY')}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl">
              <FileText className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bu Ay Karşılaştırma</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Gelen Fatura</span>
                <span className="font-medium text-primary">{formatCurrency(monthlyIncoming, 'TRY')}</span>
              </div>
              <div className="w-full bg-accent rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${(monthlyIncoming + monthlyOutgoing) > 0 ? (monthlyIncoming / (monthlyIncoming + monthlyOutgoing)) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Giden Fatura</span>
                <span className="font-medium text-success">{formatCurrency(monthlyOutgoing, 'TRY')}</span>
              </div>
              <div className="w-full bg-accent rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${(monthlyIncoming + monthlyOutgoing) > 0 ? (monthlyOutgoing / (monthlyIncoming + monthlyOutgoing)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Genel Toplam Karşılaştırma</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Toplam Gelen</span>
                <span className="font-medium text-primary">{formatCurrency(incomingTotal, 'TRY')}</span>
              </div>
              <div className="w-full bg-accent rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${(incomingTotal + outgoingTotal) > 0 ? (incomingTotal / (incomingTotal + outgoingTotal)) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Toplam Giden</span>
                <span className="font-medium text-success">{formatCurrency(outgoingTotal, 'TRY')}</span>
              </div>
              <div className="w-full bg-accent rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${(incomingTotal + outgoingTotal) > 0 ? (outgoingTotal / (incomingTotal + outgoingTotal)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-4'}`}>
        <a href="/invoices/incoming" className="block">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <TrendingDown className="text-primary" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Gelen Faturalar</p>
                <p className="text-xs text-muted-foreground">{pendingIncoming} bekleyen fatura</p>
              </div>
            </div>
          </Card>
        </a>
        <a href="/invoices" className="block">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-success" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Giden Faturalar</p>
                <p className="text-xs text-muted-foreground">{pendingOutgoing} bekleyen fatura</p>
              </div>
            </div>
          </Card>
        </a>
        <a href="/invoices/new" className="block">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <FileText className="text-purple-600" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Yeni Fatura</p>
                <p className="text-xs text-muted-foreground">Yeni e-fatura oluştur</p>
              </div>
            </div>
          </Card>
        </a>
      </div>
    </div>
  );

  if (isMobile) {
    return <MobileLayout>{content}</MobileLayout>;
  }

  return content;
}
