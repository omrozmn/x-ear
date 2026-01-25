import { Button } from '@x-ear/ui-web';
import React from 'react';
import { Party } from '../../types/party';
import {
  User,
  Headphones,
  CreditCard,
  FileText,
  Clock,
  StickyNote,
  Stethoscope
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
    <div className={`border-b border-gray-200 ${className || ''}`}>
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
}> = ({ value, disabled, className, children, activeValue, onValueChange }) => {
  const isActive = activeValue === value;

  return (
    <Button
      onClick={() => !disabled && onValueChange?.(value)}
      disabled={disabled}
      className={`
        group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
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
}

export const PartyTabs: React.FC<PartyTabsProps> = ({
  party,
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    {
      id: 'general',
      label: 'Genel Bilgiler',
      icon: <User className="w-4 h-4" />,
      count: null,
      disabled: false,
      hidden: false,
    },
    {
      id: 'devices',
      label: 'Cihazlar',
      icon: <Headphones className="w-4 h-4" />,
      count: party.devices?.length || 0,
      disabled: false,
      hidden: false,
    },
    {
      id: 'hearing-tests',
      label: 'İşitme Testleri',
      icon: <Stethoscope className="w-4 h-4" />,
      count: 0,
      disabled: false,
      hidden: !party.hearingProfile && !party.hearing_profile // Hide if no hearing profile
    },
    {
      id: 'sales',
      label: 'Satışlar',
      icon: <CreditCard className="w-4 h-4" />,
      count: 0, // TODO: Get sales count from party data
      disabled: false,
      hidden: false,
    },
    /* SGK Tab - v1'de aktif edilecek
    {
      id: 'sgk',
      label: 'SGK İşlemleri',
      icon: <Shield className="w-4 h-4" />,
      count: null,
      disabled: false,
      hidden: false,
    },
    */
    {
      id: 'documents',
      label: 'Belgeler',
      icon: <FileText className="w-4 h-4" />,
      count: party.reports?.length || 0,
      disabled: false,
      hidden: false,
    },
    {
      id: 'timeline',
      label: 'Zaman Çizelgesi',
      icon: <Clock className="w-4 h-4" />,
      count: null,
      disabled: false,
      hidden: false,
    },
    {
      id: 'notes',
      label: 'Notlar',
      icon: <StickyNote className="w-4 h-4" />,
      count: party.notes?.length || 0,
      disabled: false,
      hidden: false,
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      const allowed: PartyTab[] = ['general', 'devices', 'sales', 'sgk', 'documents', 'timeline', 'notes', 'appointments'];
      if (allowed.includes(value as PartyTab)) onTabChange(value as PartyTab);
    }} className="w-full">
      <Tabs.List className="grid w-full grid-cols-4 lg:grid-cols-8">
        {tabs.filter(t => !t.hidden).map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="flex items-center space-x-2 text-sm"
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