import React, { lazy, Suspense, useState } from 'react';
import { Box, Truck, Package } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const Inventory = lazy(() => import('./AdminInventoryPage'));
const Suppliers = lazy(() => import('./AdminSuppliersPage'));
const Production = lazy(() => import('./AdminProductionPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'inventory' | 'suppliers' | 'production';

const InventoryAndOpsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Envanter & Operasyon</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cihaz & stok, tedarikçiler ve üretim takibi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="inventory" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Box className="w-4 h-4" /> Cihaz & Stok
          </Tabs.Trigger>
          <Tabs.Trigger value="suppliers" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Truck className="w-4 h-4" /> Tedarikçiler
          </Tabs.Trigger>
          <Tabs.Trigger value="production" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'production' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Package className="w-4 h-4" /> Üretim Takibi
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="inventory"><Suspense fallback={<TabFallback />}><Inventory /></Suspense></Tabs.Content>
        <Tabs.Content value="suppliers"><Suspense fallback={<TabFallback />}><Suppliers /></Suspense></Tabs.Content>
        <Tabs.Content value="production"><Suspense fallback={<TabFallback />}><Production /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default InventoryAndOpsPage;
