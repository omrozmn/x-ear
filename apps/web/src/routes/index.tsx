import { Button, Select } from '@x-ear/ui-web';
import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronRight, PieChart, RefreshCw } from 'lucide-react';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { QuickStatsCard } from '../components/dashboard/QuickStatsCard';
import { CashRegisterCard } from '../components/dashboard/CashRegisterCard';
import { PricingCalculatorCard } from '../components/dashboard/PricingCalculatorCard';
import { CashRegisterModal } from '../components/dashboard/CashRegisterModal';
import { PricingCalculatorModal } from '../components/dashboard/PricingCalculatorModal';
import type { PricingCalculation } from '../components/dashboard/PricingCalculatorModal';
import { useCreateCashRecord } from '../hooks/useCashflow';
import type { CashRecordFormData } from '../types/cashflow';
import { useDashboardData } from '../hooks/useDashboardData';
import { usePermissions } from '../hooks/usePermissions';
import PieChartSimple from '../components/charts/PieChartSimple';
import { usePartyDistribution } from '../api/dashboard';
import { useListBranches } from '../api/client/branches.client';
import { formatActivitySentence, formatActivityTimeAgo, formatActivityTimestamp } from '../utils/activity';
import { loadPartySegmentsFromAPI, type SegmentOption } from '../utils/party-segments';
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileDashboard } from '../pages/dashboard/MobileDashboard';

interface BranchDistribution {
  branch?: string;
  branchId?: string;
  breakdown?: {
    status?: Record<string, number>;
    segment?: Record<string, number>;
  };
}

interface BranchOption {
  id?: string | null;
  name?: string | null;
}

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function GlassPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-border/80 bg-white/88 p-6 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/46 dark:shadow-[0_24px_80px_-44px_rgba(2,6,23,0.9)]">
      <div className="absolute inset-x-10 top-0 h-20 rounded-full bg-gradient-to-r from-sky-100/70 via-white/60 to-emerald-100/55 blur-3xl dark:from-sky-500/20 dark:via-gray-900/10 dark:to-emerald-500/20" />
      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/55 p-3 text-sky-700 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-sky-300">
          {icon}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Dashboard() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileDashboard />;
  }

  return <DesktopDashboard />;
}

function DesktopDashboard() {
  const { stats, lastTransaction, lastCalculation, recentActivity, loading, error } = useDashboardData();
  const [dateRange, setDateRange] = useState('week');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [segmentOptions, setSegmentOptions] = useState<SegmentOption[]>([]);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
  const [isPricingCalculatorModalOpen, setIsPricingCalculatorModalOpen] = useState(false);
  const createCashRecordMutation = useCreateCashRecord();
  const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();

  const canViewDashboard = isSuperAdmin || hasAnyPermission(['dashboard.view', 'dashboard.analytics']);
  const canViewParties = isSuperAdmin || hasPermission('parties.view');
  const canViewFinance = isSuperAdmin || hasPermission('finance.view');
  const canViewAppointments = isSuperAdmin || hasPermission('appointments.view');
  const canViewCashRegister = isSuperAdmin || hasPermission('finance.cash_register');
  const canViewSales = isSuperAdmin || hasPermission('sales.view');
  const canViewAnalytics = isSuperAdmin || hasAnyPermission(['dashboard.analytics', 'dashboard.view']);
  const canViewActivityLogs = isSuperAdmin || hasPermission('activity_logs.view');
  const canViewBranches = isSuperAdmin || hasPermission('branches.view');

  const { data: branchesResponse } = useListBranches(undefined, {
    query: {
      enabled: canViewAnalytics,
      staleTime: 5 * 60 * 1000,
      select: (response) => response.data ?? [],
    },
  });

  const availableBranches = useMemo(() => (
    Array.isArray(branchesResponse) ? (branchesResponse as BranchOption[]) : []
  ), [branchesResponse]);

  useEffect(() => {
    void loadPartySegmentsFromAPI().then(({ segments }) => {
      setSegmentOptions(segments);
    });
  }, []);

  useEffect(() => {
    if (availableBranches.length === 1 && availableBranches[0]?.id) {
      setSelectedBranchId((current) => current || String(availableBranches[0]?.id || ''));
      return;
    }

    if (selectedBranchId && availableBranches.length > 0) {
      const exists = availableBranches.some((branch) => String(branch.id || '') === selectedBranchId);
      if (!exists) {
        setSelectedBranchId('');
      }
    }
  }, [availableBranches, selectedBranchId]);

  const showBranchSelector = canViewBranches && availableBranches.length > 1;

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'parties':
        window.location.href = '/parties';
        break;
      case 'trials':
        window.location.href = '/parties?filter=trial';
        break;
      case 'revenue':
        window.location.href = '/reports';
        break;
      case 'appointments':
        window.location.href = '/appointments';
        break;
    }
  };

  const handleCashRegisterSubmit = async (data: CashRecordFormData) => {
    await createCashRecordMutation.mutateAsync(data);
  };

  const handlePricingCalculatorSubmit = (data: PricingCalculation) => {
    console.log('Pricing calculation data:', data);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-destructive/10 p-4">
        <p className="text-destructive">Hata: {error}</p>
      </div>
    );
  }

  if (!canViewDashboard) {
    return <NoPermissionPlaceholder />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border/80 bg-white/90 px-6 py-4 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/44 dark:shadow-[0_20px_70px_-44px_rgba(2,6,23,0.85)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBranchSelector ? (
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-ring dark:border-white/10 dark:bg-gray-900/55 dark:text-white"
                options={[
                  { value: '', label: 'Tum Erisilebilir Subeler' },
                  ...availableBranches.map((branch) => ({
                    value: String(branch.id || ''),
                    label: branch.name || 'Sube',
                  })),
                ]}
              />
            ) : null}
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-ring dark:border-white/10 dark:bg-gray-900/55 dark:text-white"
              options={[
                { value: 'today', label: 'Bugun' },
                { value: 'week', label: 'Son 1 Hafta' },
                { value: 'month', label: 'Son 1 Ay' },
                { value: 'quarter', label: 'Son Ceyrek' },
              ]}
            />
            <Button
              onClick={() => window.location.reload()}
              className="rounded-2xl border border-white/60 bg-white/65 p-2 text-foreground transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              variant="secondary"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <DashboardStats
        stats={{
          totalParties: canViewParties ? stats.totalParties : 0,
          todayAppointments: canViewAppointments ? stats.todayAppointments : 0,
          monthlyRevenue: canViewFinance ? stats.monthlyRevenue : 0,
          activeTrials: canViewParties ? stats.activeTrials : 0,
        }}
        onCardClick={handleCardClick}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canViewCashRegister ? (
          <CashRegisterCard
            lastTransaction={lastTransaction}
            onClick={() => setIsCashRegisterModalOpen(true)}
          />
        ) : null}

        {canViewSales ? (
          <PricingCalculatorCard
            lastCalculation={lastCalculation}
            onClick={() => setIsPricingCalculatorModalOpen(true)}
          />
        ) : null}

        <QuickStatsCard
          stats={{
            activeParties: canViewParties ? stats.activeParties : 0,
            dailyRevenue: canViewFinance ? stats.dailyRevenue : 0,
            pendingAppointments: canViewAppointments ? stats.pendingAppointments : 0,
            endingTrials: canViewParties ? stats.endingTrials : 0,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canViewAnalytics ? (
          <GlassPanel
            title="Hasta Segmentleri"
            subtitle="Secili subedeki hasta segment dagilimini tek bakista gorun"
            icon={<PieChart className="h-5 w-5" />}
          >
            <div className="rounded-[26px] border border-border/70 bg-white/78 p-5 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/25">
              <PartyDistribution
                selectedBranchId={selectedBranchId || undefined}
                segmentOptions={segmentOptions}
              />
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel
            title="Hasta Segmentleri"
            subtitle="Secili subedeki hasta segment dagilimini tek bakista gorun"
            icon={<PieChart className="h-5 w-5" />}
          >
            <NoPermissionPlaceholder />
          </GlassPanel>
        )}

        {canViewActivityLogs ? (
          <GlassPanel
            title="Son Aktiviteler"
            subtitle="Ekibin son islemleri daha okunur bir dille sunulur"
            icon={<Activity className="h-5 w-5" />}
          >
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center rounded-[26px] border border-border/70 bg-white/78 text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-gray-950/25">
                Henuz son aktivite kaydi yok
              </div>
            ) : (
              <ul className="max-h-80 space-y-3 overflow-auto pr-1">
                {recentActivity.map((act: Record<string, unknown>, idx: number) => (
                  <li key={idx} className="rounded-[24px] border border-border/70 bg-white/82 p-4 backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-gray-950/28 dark:hover:bg-gray-900/42">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-6 text-foreground">
                          {formatActivitySentence(act)}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatActivityTimeAgo(act)}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span>{formatActivityTimestamp(act)}</span>
                        </div>
                      </div>
                      <div className="rounded-full bg-gray-900/5 p-2 text-muted-foreground dark:bg-white/10">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        ) : (
          <GlassPanel
            title="Son Aktiviteler"
            subtitle="Ekibin son islemleri daha okunur bir dille sunulur"
            icon={<Activity className="h-5 w-5" />}
          >
            <NoPermissionPlaceholder />
          </GlassPanel>
        )}
      </div>

      <CashRegisterModal
        isOpen={isCashRegisterModalOpen}
        onClose={() => setIsCashRegisterModalOpen(false)}
        onSubmit={handleCashRegisterSubmit}
        isLoading={createCashRecordMutation.isPending}
      />
      <PricingCalculatorModal
        isOpen={isPricingCalculatorModalOpen}
        onClose={() => setIsPricingCalculatorModalOpen(false)}
        onCalculate={handlePricingCalculatorSubmit}
      />
    </div>
  );
}

function PartyDistribution({
  selectedBranchId,
  segmentOptions,
}: {
  selectedBranchId?: string;
  segmentOptions: SegmentOption[];
}) {
  const { data, isLoading, isError } = usePartyDistribution({
    branchId: selectedBranchId,
  });
  const list = Array.isArray(data) ? data : [];
  const segments = new Map<string, number>();
  const segmentLabelMap = new Map(
    segmentOptions.map((segment) => [segment.value.trim().toLowerCase(), segment.label])
  );

  (list as BranchDistribution[]).forEach((branch) => {
    const breakdown = branch?.breakdown?.segment || {};
    Object.entries(breakdown).forEach(([segment, count]) => {
      segments.set(segment, (segments.get(segment) || 0) + Number(count || 0));
    });
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center text-muted-foreground">Dagilim yukleniyor...</div>;
  if (isError) return <div className="flex h-64 items-center justify-center text-rose-500">Dagilim verisi alinamadi</div>;

  const chartData = Array.from(segments.entries())
    .map(([label, value]) => ({
      label: segmentLabelMap.get(label.trim().toLowerCase()) || label,
      value,
    }))
    .filter((item) => Number(item.value) > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[24px] border border-dashed border-white/45 bg-card/28 text-sm text-muted-foreground">
        Gosterilecek segment verisi bulunmuyor
      </div>
    );
  }

  return <PieChartSimple data={chartData} size={240} />;
}
