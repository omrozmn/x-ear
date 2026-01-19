/**
 * AIManagementPage
 * 
 * Admin page for managing AI features including kill switch, approval queue,
 * metrics dashboard, audit logs, and settings.
 * 
 * @module admin/pages/AIManagementPage
 * @requirements Requirements 4, 5, 6, 7, 9, 16
 */

import React, { useState } from 'react';
import {
  Bot,
  Power,
  Clock,
  Activity,
  FileText,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import {
  KillSwitchPanel,
  KillSwitchRecommendation,
  ApprovalQueue,
  AIMetricsDashboard,
  AIAuditViewer,
  AISettingsPanel,
} from '@/ai';
import { PermissionGate, useIsSuperAdmin, useHasAnyPermission } from '@/hooks/useAdminPermission';
import { AdminPermissions } from '@/types';

// =============================================================================
// Types
// =============================================================================

type AIManagementTab = 'overview' | 'kill-switch' | 'approvals' | 'metrics' | 'audit' | 'settings';

interface TabConfig {
  id: AIManagementTab;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiredPermissions?: string[];
}

// =============================================================================
// Constants
// =============================================================================

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Genel Bakış',
    icon: <Bot className="h-5 w-5" />,
    description: 'AI durumu ve kritik alertler',
    requiredPermissions: [AdminPermissions.AI_READ, AdminPermissions.SYSTEM_READ],
  },
  {
    id: 'kill-switch',
    label: 'Kill Switch',
    icon: <Power className="h-5 w-5" />,
    description: 'AI özelliklerini devre dışı bırak',
    requiredPermissions: [AdminPermissions.AI_KILL_SWITCH, AdminPermissions.AI_MANAGE],
  },
  {
    id: 'approvals',
    label: 'Onay Kuyruğu',
    icon: <Clock className="h-5 w-5" />,
    description: 'Bekleyen AI aksiyonları',
    requiredPermissions: [AdminPermissions.AI_APPROVALS, AdminPermissions.AI_MANAGE],
  },
  {
    id: 'metrics',
    label: 'Metrikler',
    icon: <Activity className="h-5 w-5" />,
    description: 'Performans ve SLA metrikleri',
    requiredPermissions: [AdminPermissions.AI_READ, AdminPermissions.SYSTEM_READ],
  },
  {
    id: 'audit',
    label: 'Audit Logları',
    icon: <FileText className="h-5 w-5" />,
    description: 'AI işlem geçmişi',
    requiredPermissions: [AdminPermissions.AI_READ, AdminPermissions.AUDIT_READ],
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: <Settings className="h-5 w-5" />,
    description: 'AI konfigürasyonu',
    requiredPermissions: [AdminPermissions.AI_READ, AdminPermissions.SETTINGS_READ],
  },
];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Tab Navigation Component
 */
interface TabNavigationProps {
  activeTab: AIManagementTab;
  onTabChange: (tab: AIManagementTab) => void;
  isSuperAdmin: boolean;
}

function TabNavigation({ activeTab, onTabChange, isSuperAdmin }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 bg-white rounded-t-lg">
      <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          
          // SuperAdmin can see all tabs
          // For non-super admins, we show all tabs but they'll be gated by PermissionGate in content
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                group inline-flex items-center px-4 py-4 border-b-2 font-medium text-sm
                whitespace-nowrap transition-colors
                ${isActive
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`mr-2 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Overview Tab Content - Shows KillSwitchRecommendation and quick stats
 */
function OverviewTabContent() {
  return (
    <div className="space-y-6">
      {/* Kill Switch Recommendation Banner - Only for users with kill switch permission */}
      <PermissionGate
        permissions={[AdminPermissions.AI_KILL_SWITCH, AdminPermissions.AI_MANAGE]}
        mode="any"
      >
        <KillSwitchRecommendation />
      </PermissionGate>
      
      {/* Quick Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kill Switch Status - Only for users with kill switch permission */}
        <PermissionGate
          permissions={[AdminPermissions.AI_KILL_SWITCH, AdminPermissions.AI_MANAGE]}
          mode="any"
        >
          <KillSwitchPanel />
        </PermissionGate>
        
        {/* Approval Queue Summary - Only for users with approvals permission */}
        <PermissionGate
          permissions={[AdminPermissions.AI_APPROVALS, AdminPermissions.AI_MANAGE]}
          mode="any"
        >
          <ApprovalQueue />
        </PermissionGate>
      </div>
      
      {/* Metrics Summary - For users with read permission */}
      <PermissionGate
        permissions={[AdminPermissions.AI_READ, AdminPermissions.SYSTEM_READ]}
        mode="any"
      >
        <AIMetricsDashboard defaultWindowMinutes={60} />
      </PermissionGate>
    </div>
  );
}

/**
 * Tab Content Wrapper with Permission Check
 */
interface TabContentWrapperProps {
  permissions: string[];
  children: React.ReactNode;
}

function TabContentWrapper({ permissions, children }: TabContentWrapperProps) {
  return (
    <PermissionGate
      permissions={permissions as any}
      mode="any"
      fallback={
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Kısıtlı</h3>
          <p className="text-gray-500">
            Bu bölümü görüntülemek için gerekli yetkilere sahip değilsiniz.
          </p>
        </div>
      }
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Access Denied Component
 */
function AccessDenied() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Erişim Reddedildi</h2>
        <p className="text-gray-500 max-w-md">
          AI yönetim paneline erişmek için gerekli yetkilere sahip değilsiniz.
          Lütfen sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AIManagementPage - Main AI Management Page
 * 
 * Provides comprehensive AI management interface for administrators.
 * Includes kill switch controls, approval queue, metrics dashboard,
 * audit logs, and settings panel.
 */
export default function AIManagementPage() {
  const [activeTab, setActiveTab] = useState<AIManagementTab>('overview');
  const isSuperAdmin = useIsSuperAdmin();

  // Get the current tab config
  const currentTab = TABS.find(t => t.id === activeTab);

  // Render tab content based on active tab with permission checks
  const renderTabContent = () => {
    const permissions = currentTab?.requiredPermissions || [AdminPermissions.AI_READ];
    
    switch (activeTab) {
      case 'overview':
        return <OverviewTabContent />;
      case 'kill-switch':
        return (
          <TabContentWrapper permissions={[AdminPermissions.AI_KILL_SWITCH, AdminPermissions.AI_MANAGE]}>
            <KillSwitchPanel />
          </TabContentWrapper>
        );
      case 'approvals':
        return (
          <TabContentWrapper permissions={[AdminPermissions.AI_APPROVALS, AdminPermissions.AI_MANAGE]}>
            <ApprovalQueue />
          </TabContentWrapper>
        );
      case 'metrics':
        return (
          <TabContentWrapper permissions={[AdminPermissions.AI_READ, AdminPermissions.SYSTEM_READ]}>
            <AIMetricsDashboard defaultWindowMinutes={60} />
          </TabContentWrapper>
        );
      case 'audit':
        return (
          <TabContentWrapper permissions={[AdminPermissions.AI_READ, AdminPermissions.AUDIT_READ]}>
            <AIAuditViewer />
          </TabContentWrapper>
        );
      case 'settings':
        return (
          <TabContentWrapper permissions={[AdminPermissions.AI_READ, AdminPermissions.SETTINGS_READ]}>
            <AISettingsPanel />
          </TabContentWrapper>
        );
      default:
        return <OverviewTabContent />;
    }
  };

  return (
    <PermissionGate
      permissions={[
        AdminPermissions.AI_READ,
        AdminPermissions.AI_MANAGE,
        AdminPermissions.SYSTEM_READ,
        AdminPermissions.SYSTEM_MANAGE,
      ]}
      mode="any"
      fallback={<AccessDenied />}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Bot className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Yönetimi</h1>
              <p className="text-sm text-gray-500">
                AI özelliklerini yönetin, metrikleri izleyin ve audit loglarını inceleyin
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={isSuperAdmin} />

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </PermissionGate>
  );
}
