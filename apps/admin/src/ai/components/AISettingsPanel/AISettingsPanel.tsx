/**
 * AISettingsPanel Component
 * 
 * Admin panel component for displaying AI configuration settings (read-only).
 * Shows current phase, model information, rate limits, and quota settings.
 * 
 * @module ai-admin/components/AISettingsPanel
 * @requirements Requirement 9: AI Settings Panel (Admin)
 */

import React from 'react';
import { useAISettings } from '../../hooks/useAISettings';
import type { AISettingsPanelProps } from '../../types/ai-admin.types';
import {
  Settings,
  Cpu,
  Gauge,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Info,
  Zap,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

/**
 * Phase configuration with descriptions and colors
 */
const PHASE_CONFIG: Record<string, { 
  name: string; 
  description: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  A: {
    name: 'Phase A - Read Only',
    description: 'AI sadece öneri modunda çalışır. Hiçbir aksiyon uygulanmaz, sadece öneriler sunulur.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  B: {
    name: 'Phase B - Proposal',
    description: 'AI aksiyon önerileri sunar ve admin onayı ile aksiyonlar uygulanabilir.',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
  C: {
    name: 'Phase C - Execution',
    description: 'AI aksiyonları onay sonrası otomatik olarak uygulanır. Tam otomasyon modu.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: <Zap className="h-5 w-5 text-green-500" />,
  },
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Setting Item Component - Displays a single setting with label and value
 */
interface SettingItemProps {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
}

function SettingItem({ label, value, icon, description }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start space-x-3">
        {icon && (
          <div className="p-1.5 bg-gray-100 rounded-md mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-900 text-right">
        {value}
      </div>
    </div>
  );
}

/**
 * Section Card Component - Groups related settings
 */
interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, icon, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="px-4 py-2">
        {children}
      </div>
    </div>
  );
}

/**
 * Phase Explanation Card Component
 */
interface PhaseCardProps {
  phase: string;
  isActive: boolean;
}

function PhaseCard({ phase, isActive }: PhaseCardProps) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG['A'];
  
  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all
      ${isActive 
        ? `${config.bgColor} ${config.borderColor} shadow-sm` 
        : 'bg-gray-50 border-gray-200 opacity-60'
      }
    `}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className={`font-semibold ${isActive ? config.color : 'text-gray-500'}`}>
              {config.name}
            </h4>
            {isActive && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                Aktif
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Status Badge Component
 */
interface StatusBadgeProps {
  enabled: boolean;
  label?: string;
}

function StatusBadge({ enabled, label }: StatusBadgeProps) {
  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
      ${enabled 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
      }
    `}>
      {enabled ? (
        <CheckCircle className="h-3.5 w-3.5 mr-1" />
      ) : (
        <XCircle className="h-3.5 w-3.5 mr-1" />
      )}
      {label || (enabled ? 'Aktif' : 'Devre Dışı')}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AISettingsPanel - Main Component
 * 
 * Displays current AI configuration settings in a read-only format.
 * Shows phase information, model details, rate limits, and quotas.
 * 
 * @example
 * ```tsx
 * <AISettingsPanel className="mt-4" />
 * ```
 */
export function AISettingsPanel({ className = '' }: AISettingsPanelProps) {
  const { data: settings, isLoading, isError, refetch } = useAISettings();

  const handleRefresh = () => {
    refetch();
    toast.success('Ayarlar yenilendi');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !settings) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ayarlar Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-4">AI ayarlarını yüklerken bir hata oluştu.</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white 
              bg-primary-600 rounded-md hover:bg-primary-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Extract phase letter from phase string (e.g., "read_only" -> "A")
  const currentPhase = settings.phase?.toUpperCase().charAt(0) || 'A';
  const phaseMap: Record<string, string> = {
    'READ_ONLY': 'A',
    'PROPOSAL': 'B',
    'EXECUTION': 'C',
    'A': 'A',
    'B': 'B',
    'C': 'C',
  };
  const normalizedPhase = phaseMap[settings.phase?.toUpperCase()] || currentPhase;

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Ayarları</h2>
              <p className="text-sm text-gray-500">Mevcut AI konfigürasyonu (salt okunur)</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <StatusBadge enabled={settings.enabled} />
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Yenile"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Read-only Notice */}
        <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> AI ayarları environment variable'lar ile yapılandırılır ve bu panelden değiştirilemez.
              Ayar değişiklikleri için sistem yöneticinize başvurun.
            </p>
          </div>
        </div>

        {/* Phase Explanations */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2 text-gray-500" />
            AI Fazları
          </h3>
          <div className="space-y-3">
            {['A', 'B', 'C'].map((phase) => (
              <PhaseCard 
                key={phase} 
                phase={phase} 
                isActive={normalizedPhase === phase} 
              />
            ))}
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Information */}
          <SectionCard 
            title="Model Bilgileri" 
            icon={<Cpu className="h-4 w-4 text-gray-500" />}
          >
            <SettingItem
              label="Provider"
              value={settings.model_provider || 'Belirtilmemiş'}
              icon={<Database className="h-4 w-4 text-gray-400" />}
              description="AI model sağlayıcısı"
            />
            <SettingItem
              label="Model ID"
              value={
                <code className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">
                  {settings.model_id || 'N/A'}
                </code>
              }
              icon={<Cpu className="h-4 w-4 text-gray-400" />}
              description="Kullanılan AI modeli"
            />
          </SectionCard>

          {/* Rate Limits & Quotas */}
          <SectionCard 
            title="Limitler ve Kotalar" 
            icon={<Gauge className="h-4 w-4 text-gray-500" />}
          >
            <SettingItem
              label="Rate Limit"
              value={`${settings.rate_limit_per_minute || 0} istek/dakika`}
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              description="Dakika başına maksimum istek"
            />
            <SettingItem
              label="Varsayılan Kota"
              value={settings.default_quota ? `${settings.default_quota} istek/gün` : 'Sınırsız'}
              icon={<Database className="h-4 w-4 text-gray-400" />}
              description="Günlük varsayılan kullanım limiti"
            />
          </SectionCard>
        </div>

        {/* Current Status Summary */}
        <SectionCard 
          title="Durum Özeti" 
          icon={<CheckCircle className="h-4 w-4 text-gray-500" />}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Durum</p>
              <div className="mt-1">
                <StatusBadge enabled={settings.enabled} />
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Faz</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {normalizedPhase}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Provider</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                {settings.model_provider || 'N/A'}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rate Limit</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {settings.rate_limit_per_minute || 0}
                <span className="text-xs font-normal text-gray-500">/dk</span>
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default AISettingsPanel;
