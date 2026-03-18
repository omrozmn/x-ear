import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSearch } from '@tanstack/react-router';

import CompanySettings from './settings/Company';
import IntegrationSettings from './settings/Integration';
import TeamSettings from './settings/Team';
import PartySegmentsSettings from './settings/PartySegmentsSettings';
import SgkSettings from './settings/SgkSettings';
import SubscriptionSettings from './settings/Subscription';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { useTranslation } from 'react-i18next';

type TabId = 'company' | 'integration' | 'team' | 'parties' | 'sgk' | 'subscription';

export function DesktopSettingsPage() {
  const { t } = useTranslation('settings_extra');
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
        return t('companyInfo', 'Firma Bilgileri');
      case 'integration':
        return t('integrations', 'Entegrasyonlar');
      case 'team':
        return t('teamManagement', 'Ekip Yönetimi');
      case 'parties':
        return t('patientSettings', 'Hasta Ayarları');
      case 'sgk':
        return t('sgkSalesSettings', 'SGK & Satış Ayarları');
      case 'subscription':
        return t('subscriptionTitle', 'Abonelik');
      default:
        return t('settings', 'Ayarlar');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DesktopPageHeader
          title={getPageTitle()}
          description="Sistem ayarlarını yönetin ve yapılandırın"
          icon={<SettingsIcon className="w-6 h-6" />}
          eyebrow={{ tr: 'Çalışma Alanı Ayarları', en: 'Workspace Settings' }}
        />
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
