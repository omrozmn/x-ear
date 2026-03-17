import React, { lazy, Suspense, useState } from 'react';
import { MessageSquare, Package } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const SmsHeaders = lazy(() => import('./SmsHeaders'));
const SmsPackages = lazy(() => import('./SmsPackages'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'headers' | 'packages';

const SmsManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('headers');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Yönetimi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">SMS başlıkları ve paket yönetimi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="headers"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'headers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Başlıkları
          </Tabs.Trigger>
          <Tabs.Trigger
            value="packages"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'packages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Package className="w-4 h-4" />
            SMS Paketleri
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="headers">
          <Suspense fallback={<TabFallback />}>
            <SmsHeaders />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="packages">
          <Suspense fallback={<TabFallback />}>
            <SmsPackages />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default SmsManagementPage;
