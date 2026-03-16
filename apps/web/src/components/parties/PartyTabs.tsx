import { Button } from '@x-ear/ui-web';
import React from 'react';
import { Party } from '../../types/party';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useSector } from '../../hooks/useSector';
import {
  User,
  Headphones,
  CreditCard,
  FileText,
  Clock,
  StickyNote,
  Stethoscope,
} from 'lucide-react';

// Geçici olarak kendi Tabs bileşenini tanımlıyorum
const Tabs: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}> & {
  List: React.FC<{ className?: string; children: React.ReactNode }>;
  Trigger: React.FC<{
    value: string;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
  }>;
} = ({ value, onValueChange, className, children }) => {
  return (
    <div className={className}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ activeValue?: string; onValueChange?: (value: string) => void }>, { activeValue: value, onValueChange })
          : child
      )}
    </div>
  );
};

const TabsList: React.FC<{
  className?: string;
  children: React.ReactNode;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}> = ({ className, children, activeValue, onValueChange }) => {
  return (
    <div className={`border-b border-gray-200 mb-6 ${className || ''}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ activeValue?: string; onValueChange?: (value: string) => void }>, { activeValue, onValueChange })
            : child
        )}
      </nav>
    </div>
  );
};

const TabsTrigger: React.FC<{
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  activeValue?: string;
  onValueChange?: (value: string) => void;
  'data-testid'?: string;
}> = ({ value, disabled, className, children, activeValue, onValueChange, 'data-testid': dataTestId }) => {
  const isActive = activeValue === value;

  return (
    <Button
      onClick={() => !disabled && onValueChange?.(value)}
      disabled={disabled}
      data-testid={dataTestId}
      className={`
        group inline-flex items-center py-6 px-1 border-b-2 font-medium text-sm whitespace-nowrap
        ${isActive
          ? 'border-blue-500 text-blue-600'
          : disabled
            ? 'border-transparent text-gray-400 cursor-not-allowed'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
        ${className || ''}
      `}
      variant='outline'>
      {children}
    </Button>
  );
};

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;

export type PartyTab =
  | 'general'
  | 'devices'
  | 'sales'
  | 'sgk'
  | 'documents'
  | 'timeline'
  | 'notes'
  | 'appointments'
  | 'overview'
  | 'hearing-tests'
  | 'settings';

interface PartyTabsProps {
  party: Party;
  activeTab: PartyTab;
  onTabChange: (tab: PartyTab) => void;
  tabCounts?: {
    devices?: number;
    sales?: number;
    timeline?: number;
    documents?: number;
    notes?: number;
    'hearing-tests'?: number;
  };
}

export const PartyTabs: React.FC<PartyTabsProps> = ({
  party,
  activeTab,
  onTabChange,
  tabCounts,
}) => {
  const { t } = useTranslation('patients');
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { isModuleEnabled } = useSector();

  const canViewGeneral = isSuperAdmin || hasPermission('parties.detail.general.view');
  const canViewHearingTests = (isSuperAdmin || hasPermission('parties.detail.hearing_tests.view')) && isModuleEnabled('hearing_tests');
  const canViewDevices = (isSuperAdmin || hasPermission('parties.detail.devices.view')) && isModuleEnabled('devices');
  const canViewSales = isSuperAdmin || hasPermission('parties.detail.sales.view');
  const canViewDocuments = isSuperAdmin || hasPermission('parties.detail.documents.view');
  const canViewTimeline = isSuperAdmin || hasPermission('parties.detail.timeline.view');
  const canViewNotes = isSuperAdmin || hasPermission('parties.detail.notes.view');

  const tabs = [
    {
      id: 'general',
      label: t('tabs.overview', 'Genel Bilgiler'),
      icon: <User className="w-4 h-4" />,
      count: null,
      disabled: false,
      hidden: !canViewGeneral,
    },
    {
      id: 'hearing-tests',
      label: t('tabs.hearing_tests', 'İşitme Testleri'),
      icon: <Stethoscope className="w-4 h-4" />,
      count: tabCounts?.['hearing-tests'] ?? 0,
      disabled: false,
      hidden: !canViewHearingTests,
    },
    {
      id: 'devices',
      label: t('tabs.devices', 'Cihazlar'),
      icon: <Headphones className="w-4 h-4" />,
      count: tabCounts?.devices ?? party.devices?.length ?? 0,
      disabled: false,
      hidden: !canViewDevices,
    },
    {
      id: 'sales',
      label: 'Satışlar',
      icon: <CreditCard className="w-4 h-4" />,
      count: tabCounts?.sales ?? 0,
      disabled: false,
      hidden: !canViewSales,
    },
    {
      id: 'documents',
      label: t('tabs.documents', 'Belgeler'),
      icon: <FileText className="w-4 h-4" />,
      count: tabCounts?.documents ?? party.reports?.length ?? 0,
      disabled: false,
      hidden: !canViewDocuments,
    },
    {
      id: 'timeline',
      label: t('tabs.timeline', 'Zaman Çizelgesi'),
      icon: <Clock className="w-4 h-4" />,
      count: tabCounts?.timeline ?? null,
      disabled: false,
      hidden: !canViewTimeline,
    },
    {
      id: 'notes',
      label: 'Notlar',
      icon: <StickyNote className="w-4 h-4" />,
      count: tabCounts?.notes ?? party.notes?.length ?? 0,
      disabled: false,
      hidden: !canViewNotes,
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      const allowed: PartyTab[] = ['general', 'devices', 'hearing-tests', 'sales', 'sgk', 'documents', 'timeline', 'notes', 'appointments'];
      if (allowed.includes(value as PartyTab)) onTabChange(value as PartyTab);
    }} className="w-full">
      <Tabs.List className="grid w-full grid-cols-4 lg:grid-cols-9">
        {tabs.filter(t => !t.hidden).map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="flex items-center space-x-2 text-sm"
            data-testid={`${tab.id}-tab`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                {tab.count}
              </span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  );
}