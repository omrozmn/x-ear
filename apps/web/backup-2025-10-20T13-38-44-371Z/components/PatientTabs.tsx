import React from 'react';
import { 
  User, 
  Calendar, 
  Headphones, 
  CreditCard, 
  FileText, 
  Activity,
  Settings,
  Clock
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface PatientTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs?: TabItem[];
}

const defaultTabs: TabItem[] = [
  {
    id: 'overview',
    label: 'Genel Bakış',
    icon: <User className="w-4 h-4" />,
  },
  {
    id: 'appointments',
    label: 'Randevular',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'devices',
    label: 'Cihazlar',
    icon: <Headphones className="w-4 h-4" />,
  },
  {
    id: 'sales',
    label: 'Satışlar',
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    id: 'documents',
    label: 'Belgeler',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'timeline',
    label: 'Zaman Çizelgesi',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: 'tests',
    label: 'İşitme Testleri',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: <Settings className="w-4 h-4" />,
  },
];

export const PatientTabs: React.FC<PatientTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  tabs = defaultTabs 
}) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`
                mr-2 
                ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
              `}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`
                  ml-2 py-0.5 px-2 rounded-full text-xs
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-900'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};