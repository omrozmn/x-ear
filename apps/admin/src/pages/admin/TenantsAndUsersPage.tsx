import React, { lazy, Suspense, useState } from 'react';
import { Building2, Users, Briefcase, Shield, UserPlus } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const Tenants = lazy(() => import('./TenantsPage'));
const UsersPage = lazy(() => import('./Users'));
const AdminPersonnelPage = lazy(() => import('./AdminPersonnelPage'));
const AdminRolesPage = lazy(() => import('./AdminRolesPage'));
const Affiliates = lazy(() => import('./AffiliatesPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'tenants' | 'users' | 'personnel' | 'roles' | 'affiliates';

const TenantsAndUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tenants');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aboneler & Kullanıcılar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Abone yönetimi, kullanıcılar, personel, roller ve affiliateler</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="tenants" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tenants' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Building2 className="w-4 h-4" /> Aboneler
          </Tabs.Trigger>
          <Tabs.Trigger value="users" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Users className="w-4 h-4" /> Kullanıcılar
          </Tabs.Trigger>
          <Tabs.Trigger value="personnel" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'personnel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Briefcase className="w-4 h-4" /> Personel
          </Tabs.Trigger>
          <Tabs.Trigger value="roles" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'roles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Shield className="w-4 h-4" /> Roller
          </Tabs.Trigger>
          <Tabs.Trigger value="affiliates" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'affiliates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <UserPlus className="w-4 h-4" /> Affiliateler
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tenants"><Suspense fallback={<TabFallback />}><Tenants /></Suspense></Tabs.Content>
        <Tabs.Content value="users"><Suspense fallback={<TabFallback />}><UsersPage /></Suspense></Tabs.Content>
        <Tabs.Content value="personnel"><Suspense fallback={<TabFallback />}><AdminPersonnelPage /></Suspense></Tabs.Content>
        <Tabs.Content value="roles"><Suspense fallback={<TabFallback />}><AdminRolesPage /></Suspense></Tabs.Content>
        <Tabs.Content value="affiliates"><Suspense fallback={<TabFallback />}><Affiliates /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default TenantsAndUsersPage;
