import { Button, Select } from '@x-ear/ui-web';
import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { QuickStatsCard } from '../components/dashboard/QuickStatsCard';
import { CashRegisterCard } from '../components/dashboard/CashRegisterCard';
import { PricingCalculatorCard } from '../components/dashboard/PricingCalculatorCard';
import { CashRegisterModal } from '../components/dashboard/CashRegisterModal';
import { PricingCalculatorModal } from '../components/dashboard/PricingCalculatorModal';
import { useDashboardData } from '../hooks/useDashboardData';
import { getEnvVar } from '../utils/env';
import PieChartSimple from '../components/charts/PieChartSimple';
import { usePatientDistribution } from '../api/dashboard';
import { formatActivitySentence } from '../utils/activity';


export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { stats, lastTransaction, lastCalculation, recentActivity, loading, error } = useDashboardData();
  const [dateRange, setDateRange] = useState('week');
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
  const [isPricingCalculatorModalOpen, setIsPricingCalculatorModalOpen] = useState(false);

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'patients':
        window.location.href = '/patients';
        break;
      case 'trials':
        // Navigate to patients with trial filter
        window.location.href = '/patients?filter=trial';
        break;
      case 'revenue':
        // Navigate to reports
        window.location.href = '/reports';
        break;
      case 'appointments':
        window.location.href = '/appointments';
        break;
    }
  };

  const handleCashRegisterClick = () => {
    setIsCashRegisterModalOpen(true);
  };

  const handlePricingCalculatorClick = () => {
    setIsPricingCalculatorModalOpen(true);
  };

  const handleCashRegisterSubmit = (data: any) => {
    console.log('Cash register data:', data);
    // TODO: Save to backend
  };

  const handlePricingCalculatorSubmit = (data: any) => {
    console.log('Pricing calculation data:', data);
    // TODO: Save to backend
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Hata: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              options={[
                { value: "today", label: "Bugün" },
                { value: "week", label: "Son 1 Hafta" },
                { value: "month", label: "Son 1 Ay" },
                { value: "quarter", label: "Son Çeyrek" }
              ]}
            />
            <Button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              variant='secondary'>
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      {/* KPI Cards */}
      <DashboardStats 
        stats={{
          totalPatients: stats.totalPatients,
          todayAppointments: stats.todayAppointments,
          monthlyRevenue: stats.monthlyRevenue,
          activeTrials: stats.activeTrials,
        }}
        onCardClick={handleCardClick}
      />
      {/* Cash Register Card and Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Register Card */}
        <CashRegisterCard
          lastTransaction={lastTransaction}
          onClick={handleCashRegisterClick}
        />

        {/* Pricing Calculator Card */}
        <PricingCalculatorCard
          lastCalculation={lastCalculation}
          onClick={handlePricingCalculatorClick}
        />

        {/* Quick Stats Card */}
        <QuickStatsCard
          stats={{
            activePatients: stats.activePatients,
            dailyRevenue: stats.dailyRevenue,
            pendingAppointments: stats.pendingAppointments,
            endingTrials: stats.endingTrials,
          }}
        />
      </div>
      {/* Patient distribution + Recent activity (keeps only these two) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hasta Dağılımı</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <PatientDistribution />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
            <div className="h-64 bg-gray-50 rounded-lg overflow-auto">
              {(!recentActivity || recentActivity.length === 0) ? (
                <div className="h-full flex items-center justify-center text-gray-500">No recent activity</div>
              ) : (
                <ul className="p-4 space-y-3">
                  {recentActivity.map((act: any, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <div className="text-sm text-gray-800">{formatActivitySentence(act)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>
      </div>
      {/* Modals */}
      <CashRegisterModal
        isOpen={isCashRegisterModalOpen}
        onClose={() => setIsCashRegisterModalOpen(false)}
        onSubmit={handleCashRegisterSubmit}
      />
      <PricingCalculatorModal
        isOpen={isPricingCalculatorModalOpen}
        onClose={() => setIsPricingCalculatorModalOpen(false)}
        onCalculate={handlePricingCalculatorSubmit}
      />
    </div>
  );
}

function PatientDistribution() {
  const { data, isLoading, isError } = usePatientDistribution();
  const raw = (data as any)?.data || [];
  const list = Array.isArray(raw) ? raw : [];

  // Convert to pie slices by summing breakdowns per branch (use status counts as primary)
  const patientTrends = list.map((b: any) => {
    const status = b?.breakdown?.status || {};
    // sum status counts as branch total
    const total = Object.values(status).reduce((s: number, v: any) => s + Number(v || 0), 0);
    return { label: b.branch || b.branchId, value: total };
  });

  if (isLoading) return <div className="text-gray-500">Yükleniyor...</div>;
  if (isError) return <div className="text-red-500">Hata yüklenirken</div>;

  const slices = patientTrends.filter(p => Number(p.value) > 0).slice(0, 6);
  return (
    <PieChartSimple data={slices.length ? slices : patientTrends.slice(0,6).map(d => ({ label: d.label, value: d.value }))} />
  );
}
