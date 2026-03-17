import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Receipt,
  Wallet,
  CreditCard,
  Activity,
  PieChart,
  FileText,
  Filter,
  Loader2
} from 'lucide-react';
import { Button, MultiSelect, Select } from '@x-ear/ui-web';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { usePermissions } from '@/hooks/usePermissions';
import { useListBranches } from '@/api/client/branches.client';
import { unwrapArray } from '../utils/response-unwrap';
import type { BranchRead } from '@/api/generated/schemas';
import { useTranslation } from 'react-i18next';

import { OverviewTab } from './reports/tabs/OverviewTab';
import { SalesTab } from './reports/tabs/SalesTab';
import { PartiesTab } from './reports/tabs/PartiesTab';
import { PromissoryNotesTab } from './reports/tabs/PromissoryNotesTab';
import { RemainingPaymentsTab } from './reports/tabs/RemainingPaymentsTab';
import { PosMovementsTab } from './reports/tabs/PosMovementsTab';
import { ActivityTab } from './reports/tabs/ActivityTab';
import { ReportTrackingTab } from './reports/tabs/ReportTrackingTab';
import { NoPermission } from './reports/components/NoPermission';
import { FilterState, TabId } from './reports/types';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';

const PRESET_OPTIONS_BASE = [
  { value: 7, key: 'last7Days' },
  { value: 30, key: 'last30Days' },
  { value: 90, key: 'last90Days' },
  { value: 365, key: 'last1Year' }
] as const;

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

function getPresetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  return {
    start: formatDateInput(start),
    end: formatDateInput(end)
  };
}

function getDayCount(start?: string, end?: string) {
  if (!start || !end) {
    return 30;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays || 30);
}

export function DesktopReportsPage() {
  const { t } = useTranslation('reports');
  const { hasAnyPermission, isLoading: permissionsLoading } = usePermissions();
  const search = useSearch({ from: '/reports/' });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>(() => (search.tab as TabId) || 'overview');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: getPresetRange(30),
    days: 30,
    branches: []
  });
  const { data: branchesResponse } = useListBranches();
  const branches = unwrapArray<BranchRead>(branchesResponse);

  // Sync URL param with state
  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab as TabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    navigate({ to: '/reports', search: { tab: tabId } });
  };

  // Permission check
  const canViewReports = hasAnyPermission([
    'reports.view',
    'reports.overview.view',
    'reports.sales.view',
    'reports.parties.view',
    'reports.promissory.view',
    'reports.remaining.view',
    'reports.pos_movements.view',
    'reports.report_tracking.view'
  ]);
  const canViewActivityLogs = hasAnyPermission([
    'activity_logs.view',
    'reports.activity.view',
    'reports.view'
  ]);

  // Tab definitions with permissions
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: t('tabs.overview', 'Genel Bakış'), icon: BarChart3, permission: 'reports.overview.view' },
    { id: 'sales' as const, label: t('tabs.sales', 'Satış Raporları'), icon: TrendingUp, permission: 'reports.sales.view' },
    { id: 'parties' as const, label: t('tabs.parties', 'Hasta Raporları'), icon: Users, permission: 'reports.parties.view' },
    { id: 'promissory' as const, label: t('tabs.promissory', 'Senet Raporları'), icon: Receipt, permission: 'reports.promissory.view' },
    { id: 'remaining' as const, label: t('tabs.remaining', 'Kalan Ödemeler'), icon: Wallet, permission: 'reports.remaining.view' },
    { id: 'pos_movements' as const, label: t('tabs.posMovements', 'POS Hareketleri'), icon: CreditCard, permission: 'reports.pos_movements.view' },
    { id: 'report_tracking' as const, label: t('tabs.reportTracking', 'Rapor Takibi'), icon: FileText, permission: 'reports.report_tracking.view' },
    { id: 'activity' as const, label: t('tabs.activity', 'İşlem Dökümü'), icon: Activity, permission: 'reports.activity.view' }
  ], [t]);

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (tab.id === 'activity') {
        return canViewActivityLogs;
      }
      return hasAnyPermission([tab.permission, 'reports.view']);
    });
  }, [tabs, canViewActivityLogs, hasAnyPermission]);

  // Reset to first allowed tab if current is not allowed
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  const PRESET_OPTIONS = PRESET_OPTIONS_BASE.map(o => ({ value: o.value, label: t(`presets.${o.key}`, o.key) }));

  const selectedPreset = PRESET_OPTIONS.find((option) => option.value === filters.days)
    && getPresetRange(filters.days).start === filters.dateRange.start
    && getPresetRange(filters.days).end === filters.dateRange.end
    ? String(filters.days)
    : 'custom';

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No permission at all
  if (!canViewReports && !canViewActivityLogs) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <NoPermission />
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DesktopPageHeader
          title={t('pageTitle', 'Raporlar ve Analizler')}
          description={t('pageDescription', 'Satış performansı, hasta analizleri ve işlem dökümleri')}
          icon={<PieChart className="w-6 h-6" />}
          eyebrow={{ tr: 'İçgörüler', en: 'Insights' }}
          actions={null}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters - Only show for report tabs, not activity */}
        {activeTab !== 'activity' && allowedTabs.some((tab) => tab.id === activeTab) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('filters', 'Filtreler')}:</span>
              </div>
              <div>
                <Select
                  className="px-3 py-2 text-sm"
                  value={selectedPreset}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const nextValue = e.target.value;
                    if (nextValue === 'custom') {
                      return;
                    }

                    const days = Number(nextValue);
                    setFilters(prev => ({
                      ...prev,
                      days,
                      dateRange: getPresetRange(days)
                    }));
                  }}
                  options={[
                    ...PRESET_OPTIONS.map((option) => ({ value: String(option.value), label: option.label })),
                    { value: 'custom', label: t('presets.custom', 'Özel Aralık') }
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  data-allow-raw="true"
                  type="date"
                  value={filters.dateRange.start}
                  max={filters.dateRange.end || undefined}
                  onChange={(e) => {
                    const start = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start },
                      days: getDayCount(start, prev.dateRange.end)
                    }));
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <span className="text-sm text-muted-foreground">-</span>
                <input
                  data-allow-raw="true"
                  type="date"
                  value={filters.dateRange.end}
                  min={filters.dateRange.start || undefined}
                  onChange={(e) => {
                    const end = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end },
                      days: getDayCount(prev.dateRange.start, end)
                    }));
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <MultiSelect
                  label={t('branch', 'Şube')}
                  placeholder={t('allBranches', 'Tüm şubeler')}
                  selectAll
                  selectAllText={t('selectAllBranches', 'Tüm Şubeleri Seç')}
                  clearAllText={t('clear', 'Temizle')}
                  options={branches.map((branch) => ({
                    id: branch.id,
                    value: branch.id,
                    label: branch.name || t('branch', 'Şube')
                  }))}
                  value={branches
                    .filter((branch) => filters.branches?.includes(branch.id))
                    .map((branch) => ({ id: branch.id, value: branch.id, label: branch.name || t('branch', 'Şube') }))}
                  onChange={(selected) => setFilters((prev) => ({
                    ...prev,
                    branches: selected.map((item) => item.value),
                    branch: selected.map((item) => item.value).join(',') || undefined
                  }))}
                  className="min-w-[280px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="border-b border-border overflow-x-auto">
            <nav className="-mb-px flex min-w-max gap-2 px-3 sm:gap-4 sm:px-6">
              {allowedTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    variant="ghost"
                    className={`${isActive
                      ? 'border-blue-500 text-primary dark:border-blue-400 rounded-none'
                      : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-300 hover:border-border dark:hover:border-gray-600'
                      } shrink-0 whitespace-nowrap py-3 px-2 sm:py-4 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center transition-colors !w-auto !h-auto rounded-none`}
                  >
                    <Icon className="w-4 h-4 mr-1.5 sm:mr-2" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && canViewReports && <OverviewTab filters={filters} />}
            {activeTab === 'sales' && canViewReports && <SalesTab filters={filters} />}
            {activeTab === 'parties' && canViewReports && <PartiesTab filters={filters} />}
            {activeTab === 'promissory' && canViewReports && <PromissoryNotesTab filters={filters} />}
            {activeTab === 'remaining' && canViewReports && <RemainingPaymentsTab filters={filters} />}
            {activeTab === 'pos_movements' && canViewReports && <PosMovementsTab filters={filters} />}
            {activeTab === 'report_tracking' && canViewReports && <ReportTrackingTab filters={filters} />}
            {activeTab === 'activity' && canViewActivityLogs && <ActivityTab filters={filters} />}

            {/* Show no permission if tab doesn't match permissions */}
            {activeTab === 'overview' && !canViewReports && <NoPermission />}
            {activeTab === 'sales' && !canViewReports && <NoPermission />}
            {activeTab === 'parties' && !canViewReports && <NoPermission />}
            {activeTab === 'promissory' && !canViewReports && <NoPermission />}
            {activeTab === 'remaining' && !canViewReports && <NoPermission />}
            {activeTab === 'pos_movements' && !canViewReports && <NoPermission />}
            {activeTab === 'report_tracking' && !canViewReports && <NoPermission />}
            {activeTab === 'activity' && !canViewActivityLogs && <NoPermission />}
          </div>
        </div>
      </div>
    </div>
  );
}
