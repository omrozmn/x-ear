import React, { lazy, Suspense, useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const AdminBirFaturaPage = lazy(() => import('./AdminBirFaturaPage'));
const AdminPaymentsPage = lazy(() => import('./AdminPaymentsPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'billing' | 'payments';

const BillingAndPaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('billing');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faturalar & Ödemeler</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fatura yönetimi ve ödeme takibi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="billing"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <CreditCard className="w-4 h-4" />
            Faturalar
          </Tabs.Trigger>
          <Tabs.Trigger
            value="payments"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Wallet className="w-4 h-4" />
            Ödemeler
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="billing">
          <Suspense fallback={<TabFallback />}>
            <AdminBirFaturaPage />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="payments">
          <Suspense fallback={<TabFallback />}>
            <AdminPaymentsPage />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default BillingAndPaymentsPage;
