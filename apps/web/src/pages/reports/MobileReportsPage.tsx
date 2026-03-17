import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Receipt, Wallet, CreditCard, Activity, FileText, Filter, Loader2 } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import { useHaptic } from '@/hooks/useHaptic';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { OverviewTab } from './tabs/OverviewTab';
import { SalesTab } from './tabs/SalesTab';
import { PartiesTab } from './tabs/PartiesTab';
import { PromissoryNotesTab } from './tabs/PromissoryNotesTab';
import { RemainingPaymentsTab } from './tabs/RemainingPaymentsTab';
import { PosMovementsTab } from './tabs/PosMovementsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { ReportTrackingTab } from './tabs/ReportTrackingTab';
import { NoPermission } from './components/NoPermission';
import { FilterState, TabId } from './types';

const PRESET_OPTIONS = [
  { value: 7, label: '7 Gün' },
  { value: 30, label: '30 Gün' },
  { value: 90, label: '90 Gün' },
  { value: 365, label: '1 Yıl' },
] as const;

function getPresetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

export const MobileReportsPage: React.FC = () => {
  const { hasAnyPermission, isLoading: permissionsLoading } = usePermissions();
  const { triggerSelection } = useHaptic();
  const search = useSearch({ from: '/reports/' });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>(() => (search.tab as TabId) || 'overview');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: getPresetRange(30),
    days: 30,
    branches: [],
  });

  const canViewReports = hasAnyPermission([
    'reports.view', 'reports.overview.view', 'reports.sales.view',
    'reports.parties.view', 'reports.promissory.view', 'reports.remaining.view',
    'reports.pos_movements.view', 'reports.report_tracking.view',
  ]);
  const canViewActivityLogs = hasAnyPermission([
    'activity_logs.view', 'reports.activity.view', 'reports.view',
  ]);

  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Genel', icon: BarChart3, permission: 'reports.overview.view' },
    { id: 'sales' as const, label: 'Satış', icon: TrendingUp, permission: 'reports.sales.view' },
    { id: 'parties' as const, label: 'Hasta', icon: Users, permission: 'reports.parties.view' },
    { id: 'promissory' as const, label: 'Senet', icon: Receipt, permission: 'reports.promissory.view' },
    { id: 'remaining' as const, label: 'Ödemeler', icon: Wallet, permission: 'reports.remaining.view' },
    { id: 'pos_movements' as const, label: 'POS', icon: CreditCard, permission: 'reports.pos_movements.view' },
    { id: 'report_tracking' as const, label: 'Takip', icon: FileText, permission: 'reports.report_tracking.view' },
    { id: 'activity' as const, label: 'İşlemler', icon: Activity, permission: 'reports.activity.view' },
  ], []);

  const allowedTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (tab.id === 'activity') return canViewActivityLogs;
      return hasAnyPermission([tab.permission, 'reports.view']);
    });
  }, [tabs, canViewActivityLogs, hasAnyPermission]);

  React.useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    navigate({ to: '/reports', search: { tab: tabId } });
    triggerSelection();
  };

  const handleRefresh = async () => {
    window.location.reload();
  };

  if (permissionsLoading) {
    return (
      <MobileLayout>
        <MobileHeader title="Raporlar" showBack={false} />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!canViewReports && !canViewActivityLogs) {
    return (
      <MobileLayout>
        <MobileHeader title="Raporlar" showBack={false} />
        <div className="p-4"><NoPermission /></div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <MobileHeader
        title="Raporlar"
        showBack={false}
        actions={
          <button
            data-allow-raw="true"
            onClick={() => { setShowFilters(!showFilters); triggerSelection(); }}
            className={`p-2 rounded-xl ${showFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Filter className="h-5 w-5" />
          </button>
        }
      />

      {/* Tab Navigation - Horizontal Scroll */}
      <div className="bg-white dark:bg-gray-900 border-b border-border sticky top-14 z-20">
        <div className="flex overflow-x-auto hide-scrollbar px-2 gap-1">
          {allowedTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                data-allow-raw="true"
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${
                  isActive
                    ? 'border-blue-500 text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Filters */}
        {showFilters && activeTab !== 'activity' && (
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {PRESET_OPTIONS.map(opt => (
                <button
                  data-allow-raw="true"
                  key={opt.value}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, days: opt.value, dateRange: getPresetRange(opt.value) }));
                    triggerSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filters.days === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-950">
          {activeTab === 'overview' && canViewReports && <OverviewTab filters={filters} />}
          {activeTab === 'sales' && canViewReports && <SalesTab filters={filters} />}
          {activeTab === 'parties' && canViewReports && <PartiesTab filters={filters} />}
          {activeTab === 'promissory' && canViewReports && <PromissoryNotesTab filters={filters} />}
          {activeTab === 'remaining' && canViewReports && <RemainingPaymentsTab filters={filters} />}
          {activeTab === 'pos_movements' && canViewReports && <PosMovementsTab filters={filters} />}
          {activeTab === 'report_tracking' && canViewReports && <ReportTrackingTab filters={filters} />}
          {activeTab === 'activity' && canViewActivityLogs && <ActivityTab filters={filters} />}

          {activeTab !== 'activity' && !canViewReports && <NoPermission />}
          {activeTab === 'activity' && !canViewActivityLogs && <NoPermission />}
        </div>
      </PullToRefresh>
    </MobileLayout>
  );
};

export default MobileReportsPage;
