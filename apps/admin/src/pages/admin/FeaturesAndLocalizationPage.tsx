import React, { lazy, Suspense, useState } from 'react';
import { ToggleRight, Flag } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const Features = lazy(() => import('./Features'));
const Countries = lazy(() => import('./CountriesPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'features' | 'countries';

const FeaturesAndLocalizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('features');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Özellik & Yerelleştirme</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Feature flags ve ülke yapılandırmaları</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="features" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'features' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <ToggleRight className="w-4 h-4" /> Feature Flags
          </Tabs.Trigger>
          <Tabs.Trigger value="countries" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'countries' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Flag className="w-4 h-4" /> Ülkeler
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="features"><Suspense fallback={<TabFallback />}><Features /></Suspense></Tabs.Content>
        <Tabs.Content value="countries"><Suspense fallback={<TabFallback />}><Countries /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default FeaturesAndLocalizationPage;
