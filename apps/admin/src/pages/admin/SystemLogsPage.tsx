import React, { lazy, Suspense, useState } from 'react';
import { Activity, FileText, Folder } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const ActivityLog = lazy(() => import('./ActivityLog'));
const OcrQueue = lazy(() => import('./AdminScanQueuePage'));
const Files = lazy(() => import('./FileManager'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'activity' | 'ocr' | 'files';

const SystemLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('activity');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistem Logları</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aktivite logları, OCR kuyruğu ve dosya yönetimi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="activity" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Activity className="w-4 h-4" /> Aktivite Logları
          </Tabs.Trigger>
          <Tabs.Trigger value="ocr" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ocr' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <FileText className="w-4 h-4" /> OCR Kuyruğu
          </Tabs.Trigger>
          <Tabs.Trigger value="files" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Folder className="w-4 h-4" /> Dosyalar
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="activity"><Suspense fallback={<TabFallback />}><ActivityLog /></Suspense></Tabs.Content>
        <Tabs.Content value="ocr"><Suspense fallback={<TabFallback />}><OcrQueue /></Suspense></Tabs.Content>
        <Tabs.Content value="files"><Suspense fallback={<TabFallback />}><Files /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default SystemLogsPage;
