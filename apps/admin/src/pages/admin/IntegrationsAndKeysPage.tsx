import React, { lazy, Suspense, useState } from 'react';
import { Zap, Key } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const IntegrationsPage = lazy(() => import('./IntegrationsPage'));
const AdminApiKeysPage = lazy(() => import('./AdminApiKeysPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'integrations' | 'api-keys';

const IntegrationsAndKeysPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('integrations');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entegrasyonlar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Harici entegrasyonlar ve API anahtar yönetimi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="integrations" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'integrations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Zap className="w-4 h-4" /> Entegrasyonlar
          </Tabs.Trigger>
          <Tabs.Trigger value="api-keys" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api-keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Key className="w-4 h-4" /> API Anahtarları
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="integrations"><Suspense fallback={<TabFallback />}><IntegrationsPage /></Suspense></Tabs.Content>
        <Tabs.Content value="api-keys"><Suspense fallback={<TabFallback />}><AdminApiKeysPage /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default IntegrationsAndKeysPage;
