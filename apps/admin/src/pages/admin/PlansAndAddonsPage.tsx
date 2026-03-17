import React, { lazy, Suspense, useState } from 'react';
import { CreditCard, PlusCircle, MessageSquare } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const Plans = lazy(() => import('./Plans'));
const AddOns = lazy(() => import('./AddOns'));
const SmsManagementPage = lazy(() => import('./SmsManagementPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'plans' | 'addons' | 'sms';

const PlansAndAddonsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('plans');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planlar & Eklentiler</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Abonelik planları, eklenti yönetimi ve SMS paketleri</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="plans"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'plans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <CreditCard className="w-4 h-4" />
            Planlar
          </Tabs.Trigger>
          <Tabs.Trigger
            value="addons"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'addons' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Eklentiler
          </Tabs.Trigger>
          <Tabs.Trigger
            value="sms"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Yönetimi
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="plans">
          <Suspense fallback={<TabFallback />}>
            <Plans />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="addons">
          <Suspense fallback={<TabFallback />}>
            <AddOns />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="sms">
          <Suspense fallback={<TabFallback />}>
            <SmsManagementPage />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default PlansAndAddonsPage;
