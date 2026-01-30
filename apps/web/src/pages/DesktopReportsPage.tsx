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
  Download,
  Filter,
  Loader2
} from 'lucide-react';
import { Button, Select } from '@x-ear/ui-web';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { usePermissions } from '@/hooks/usePermissions';

import { OverviewTab } from './reports/tabs/OverviewTab';
import { SalesTab } from './reports/tabs/SalesTab';
import { PartiesTab } from './reports/tabs/PartiesTab';
import { PromissoryNotesTab } from './reports/tabs/PromissoryNotesTab';
import { RemainingPaymentsTab } from './reports/tabs/RemainingPaymentsTab';
import { PosMovementsTab } from './reports/tabs/PosMovementsTab';
import { ActivityTab } from './reports/tabs/ActivityTab';
import { NoPermission } from './reports/components/NoPermission';
import { FilterState, TabId } from './reports/types';

export function DesktopReportsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const search = useSearch({ from: '/reports/' });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>(() => (search.tab as TabId) || 'overview');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    days: 30
  });

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
  const canViewReports = hasPermission('reports.view');
  const canExportReports = hasPermission('reports.export');
  const canViewActivityLogs = hasPermission('activity_logs.view') || hasPermission('reports.view');

  // Tab definitions with permissions
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Genel Bakış', icon: BarChart3, permission: 'reports.view' },
    { id: 'sales' as const, label: 'Satış Raporları', icon: TrendingUp, permission: 'reports.view' },
    { id: 'parties' as const, label: 'Hasta Raporları', icon: Users, permission: 'reports.view' },
    { id: 'promissory' as const, label: 'Senet Raporları', icon: Receipt, permission: 'reports.view' },
    { id: 'remaining' as const, label: 'Kalan Ödemeler', icon: Wallet, permission: 'reports.view' },
    { id: 'pos_movements' as const, label: 'POS Hareketleri', icon: CreditCard, permission: 'reports.view' },
    { id: 'activity' as const, label: 'İşlem Dökümü', icon: Activity, permission: 'activity_logs.view' }
  ], []);

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (tab.permission === 'activity_logs.view') {
        return canViewActivityLogs;
      }
      return canViewReports;
    });
  }, [tabs, canViewReports, canViewActivityLogs]);

  // Reset to first allowed tab if current is not allowed
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    // TODO: Implement export with proper API call
  };

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No permission at all
  if (!canViewReports && !canViewActivityLogs) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <NoPermission />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-7 h-7 text-blue-600" />
                Raporlar ve Analizler
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Satış performansı, hasta analizleri ve işlem dökümleri
              </p>
            </div>
            {canExportReports && (
              <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                <Button
                  onClick={() => handleExport('pdf')}
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                >
                  PDF İndir
                </Button>
                <Button
                  onClick={() => handleExport('excel')}
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                >
                  Excel İndir
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters - Only show for report tabs, not activity */}
        {activeTab !== 'activity' && canViewReports && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtreler:</span>
              </div>
              <div>
                <Select
                  className="px-3 py-2 text-sm"
                  value={String(filters.days)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, days: Number(e.target.value) }))}
                  options={[
                    { value: "7", label: "Son 7 Gun" },
                    { value: "30", label: "Son 30 Gun" },
                    { value: "90", label: "Son 90 Gun" },
                    { value: "365", label: "Son 1 Yil" }
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
              {allowedTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    variant="ghost"
                    className={`${isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-none'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors !w-auto !h-auto rounded-none`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
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
            {activeTab === 'promissory' && canViewReports && <PromissoryNotesTab />}
            {activeTab === 'remaining' && canViewReports && <RemainingPaymentsTab filters={filters} />}
            {activeTab === 'pos_movements' && canViewReports && <PosMovementsTab filters={filters} />}
            {activeTab === 'activity' && canViewActivityLogs && <ActivityTab />}

            {/* Show no permission if tab doesn't match permissions */}
            {activeTab === 'overview' && !canViewReports && <NoPermission />}
            {activeTab === 'sales' && !canViewReports && <NoPermission />}
            {activeTab === 'parties' && !canViewReports && <NoPermission />}
            {activeTab === 'promissory' && !canViewReports && <NoPermission />}
            {activeTab === 'remaining' && !canViewReports && <NoPermission />}
            {activeTab === 'pos_movements' && !canViewReports && <NoPermission />}
            {activeTab === 'activity' && !canViewActivityLogs && <NoPermission />}
          </div>
        </div>
      </div>
    </div>
  );
}
