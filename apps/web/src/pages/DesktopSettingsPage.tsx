import React, { useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSearch } from '@tanstack/react-router';

import CompanySettings from './settings/Company';
import IntegrationSettings from './settings/Integration';
import TeamSettings from './settings/Team';
import PartySegmentsSettings from './settings/PartySegmentsSettings';
import SgkSettings from './settings/SgkSettings';
import SubscriptionSettings from './settings/Subscription';

type TabId = 'company' | 'integration' | 'team' | 'parties' | 'sgk' | 'subscription';

export function DesktopSettingsPage() {
  const search = useSearch({ from: '/settings/' });
  const activeTab = (search.tab as TabId) || 'company';

  // DEBUG: Force render check
  React.useEffect(() => {
    console.log('🔥 DesktopSettingsPage MOUNTED', { activeTab, search });
  }, [activeTab, search]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettings />;
      case 'integration':
        return <IntegrationSettings />;
      case 'team':
        return <TeamSettings />;
      case 'parties':
        return <PartySegmentsSettings />;
      case 'sgk':
        return <SgkSettings />;
      case 'subscription':
        return <SubscriptionSettings />;
      default:
        return <CompanySettings />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'company':
        return 'Firma Bilgileri';
      case 'integration':
        return 'Entegrasyonlar';
      case 'team':
        return 'Ekip Yönetimi';
      case 'parties':
        return 'Hasta Ayarları';
      case 'sgk':
        return 'SGK Ayarları';
      case 'subscription':
        return 'Abonelik';
      default:
        return 'Ayarlar';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <SettingsIcon className="w-7 h-7 text-blue-600" />
                {getPageTitle()}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sistem ayarlarını yönetin ve yapılandırın
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default DesktopSettingsPage;
