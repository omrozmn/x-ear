import React, { lazy, Suspense, useState } from 'react';
import { ScanLine, Tag, Printer } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const BarcodeServicePage = lazy(() => import('./BarcodeServicePage'));
const LabelTemplatesPage = lazy(() => import('./LabelTemplatesPage'));
const PrinterManagementPage = lazy(() => import('./PrinterManagementPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'barcodes' | 'labels' | 'printers';

const BarcodeAndPrintingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('barcodes');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barkod & Yazdırma</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Barkod servisi, etiket şablonları ve yazıcı yönetimi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="barcodes"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'barcodes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <ScanLine className="w-4 h-4" />
            Barkod Servisi
          </Tabs.Trigger>
          <Tabs.Trigger
            value="labels"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'labels' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Tag className="w-4 h-4" />
            Etiket Şablonları
          </Tabs.Trigger>
          <Tabs.Trigger
            value="printers"
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'printers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Printer className="w-4 h-4" />
            Yazıcılar
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="barcodes">
          <Suspense fallback={<TabFallback />}>
            <BarcodeServicePage />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="labels">
          <Suspense fallback={<TabFallback />}>
            <LabelTemplatesPage />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="printers">
          <Suspense fallback={<TabFallback />}>
            <PrinterManagementPage />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default BarcodeAndPrintingPage;
