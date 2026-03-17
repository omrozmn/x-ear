import React, { lazy, Suspense, useState } from 'react';
import { User, Calendar } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const AdminPatientsPage = lazy(() => import('./AdminPatientsPage'));
const AdminAppointmentsPage = lazy(() => import('./AdminAppointmentsPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'patients' | 'appointments';

const PatientsAndAppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('patients');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hastalar & Randevular</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hasta yönetimi ve randevu takibi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="patients" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'patients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <User className="w-4 h-4" /> Hastalar
          </Tabs.Trigger>
          <Tabs.Trigger value="appointments" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'appointments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Calendar className="w-4 h-4" /> Randevular
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="patients"><Suspense fallback={<TabFallback />}><AdminPatientsPage /></Suspense></Tabs.Content>
        <Tabs.Content value="appointments"><Suspense fallback={<TabFallback />}><AdminAppointmentsPage /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default PatientsAndAppointmentsPage;
