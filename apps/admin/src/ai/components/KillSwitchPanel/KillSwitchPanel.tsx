/**
 * KillSwitchPanel Component
 * 
 * Admin panel component for managing AI kill switches at global, tenant, and capability scopes.
 * Provides toggle controls, reason input, and displays active kill switch details.
 * 
 * @module ai-admin/components/KillSwitchPanel
 * @requirements Requirement 4: Admin Kill Switch Panel
 */

import React, { useState } from 'react';
import { useKillSwitch } from '../../hooks/useKillSwitch';
import type {
  KillSwitchPanelProps,
  TenantKillSwitch,
  CapabilityKillSwitch,
} from '../../types/ai-admin.types';
import {
  AlertTriangle,
  Power,
  PowerOff,
  Building2,
  Cpu,
  MessageSquare,
  Scan,
  Zap,
  Clock,
  User,
  X,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Available AI capabilities
const AI_CAPABILITIES = [
  { id: 'chat', name: 'Chat', icon: MessageSquare, description: 'AI sohbet özelliği' },
  { id: 'actions', name: 'Actions', icon: Zap, description: 'AI aksiyon özelliği' },
  { id: 'ocr', name: 'OCR', icon: Scan, description: 'Belge tanıma özelliği' },
] as const;

/**
 * Toggle Switch Component
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

function ToggleSwitch({ checked, onChange, disabled = false, size = 'md' }: ToggleSwitchProps) {
  const sizeClasses = size === 'sm' 
    ? 'h-5 w-9' 
    : 'h-6 w-11';
  const dotSizeClasses = size === 'sm'
    ? 'h-4 w-4'
    : 'h-5 w-5';
  const translateClasses = size === 'sm'
    ? (checked ? 'translate-x-4' : 'translate-x-0')
    : (checked ? 'translate-x-5' : 'translate-x-0');

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        ${sizeClasses}
        ${checked ? 'bg-red-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-red-600 focus:ring-offset-2
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`
          ${dotSizeClasses}
          ${translateClasses}
          pointer-events-none inline-block transform rounded-full bg-white shadow 
          ring-0 transition duration-200 ease-in-out
        `}
      />
    </button>
  );
}

/**
 * Reason Input Modal Component
 */
interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

function ReasonModal({ isOpen, onClose, onConfirm, title, description, isLoading }: ReasonModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Lütfen bir sebep girin');
      return;
    }
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" 
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sebep <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Kill switch aktivasyon sebebini yazın..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                text-sm resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border 
                border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none 
                focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              İptal
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border 
                border-transparent rounded-md hover:bg-red-700 focus:outline-none 
                focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              {isLoading ? 'İşleniyor...' : 'Aktive Et'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Active Kill Switch Card Component
 */
interface ActiveKillSwitchCardProps {
  type: 'global' | 'tenant' | 'capability';
  name: string;
  reason?: string;
  activatedBy?: string;
  activatedAt?: string;
  onDeactivate: () => void;
  isLoading?: boolean;
}

function ActiveKillSwitchCard({
  type,
  name,
  reason,
  activatedBy,
  activatedAt,
  onDeactivate,
  isLoading,
}: ActiveKillSwitchCardProps) {
  const typeConfig = {
    global: { icon: Power, color: 'red', label: 'Global' },
    tenant: { icon: Building2, color: 'orange', label: 'Tenant' },
    capability: { icon: Cpu, color: 'yellow', label: 'Capability' },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`border-l-4 border-${config.color}-500 bg-${config.color}-50 p-4 rounded-r-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
            <Icon className={`h-5 w-5 text-${config.color}-600`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded bg-${config.color}-200 text-${config.color}-800`}>
                {config.label}
              </span>
              <span className="font-medium text-gray-900">{name}</span>
            </div>
            {reason && (
              <p className="text-sm text-gray-600 mt-1">{reason}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              {activatedBy && (
                <span className="flex items-center">
                  <User size={12} className="mr-1" />
                  {activatedBy}
                </span>
              )}
              {activatedAt && (
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {new Date(activatedAt).toLocaleString('tr-TR')}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onDeactivate}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 
            rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50
            disabled:cursor-not-allowed flex items-center"
        >
          <PowerOff size={14} className="mr-1" />
          Deaktive Et
        </button>
      </div>
    </div>
  );
}

/**
 * Tenant Kill Switch Management Component
 */
interface TenantKillSwitchSectionProps {
  tenantSwitches: TenantKillSwitch[];
  onActivate: (tenantId: string, reason: string) => Promise<unknown>;
  onDeactivate: (tenantId: string) => Promise<unknown>;
  isLoading: boolean;
}

function TenantKillSwitchSection({
  tenantSwitches,
  onActivate,
  onDeactivate,
  isLoading,
}: TenantKillSwitchSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');

  const activeTenants = tenantSwitches.filter(t => t.active);

  const handleAddTenant = (reason: string) => {
    if (!newTenantId.trim()) {
      toast.error('Lütfen tenant ID girin');
      return;
    }
    onActivate(newTenantId, reason)
      .then(() => {
        toast.success('Tenant kill switch aktive edildi');
        setShowAddModal(false);
        setNewTenantId('');
      })
      .catch(() => {
        toast.error('İşlem başarısız');
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-gray-500" />
          <h4 className="font-medium text-gray-900">Tenant Kill Switches</h4>
          {activeTenants.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
              {activeTenants.length} aktif
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 
            bg-white border border-gray-300 rounded-md hover:bg-gray-50 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} className="mr-1" />
          Tenant Ekle
        </button>
      </div>

      {activeTenants.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Aktif tenant kill switch yok</p>
      ) : (
        <div className="space-y-3">
          {activeTenants.map((tenant) => (
            <ActiveKillSwitchCard
              key={tenant.tenant_id}
              type="tenant"
              name={tenant.tenant_name || tenant.tenant_id}
              reason={tenant.reason}
              activatedBy={tenant.activated_by}
              activatedAt={tenant.activated_at}
              onDeactivate={() => {
                onDeactivate(tenant.tenant_id)
                  .then(() => toast.success('Tenant kill switch deaktive edildi'))
                  .catch(() => toast.error('İşlem başarısız'));
              }}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" 
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tenant Kill Switch Ekle</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  placeholder="Tenant ID girin..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  disabled={isLoading}
                />
              </div>
              
              <TenantReasonInput
                onConfirm={handleAddTenant}
                onCancel={() => setShowAddModal(false)}
                isLoading={isLoading}
                disabled={!newTenantId.trim()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tenant Reason Input Component
 */
interface TenantReasonInputProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  disabled: boolean;
}

function TenantReasonInput({ onConfirm, onCancel, isLoading, disabled }: TenantReasonInputProps) {
  const [reason, setReason] = useState('');

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sebep <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Kill switch aktivasyon sebebini yazın..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
            text-sm resize-none"
          rows={3}
          disabled={isLoading}
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border 
            border-gray-300 rounded-md hover:bg-gray-50"
        >
          İptal
        </button>
        <button
          onClick={() => onConfirm(reason)}
          disabled={isLoading || disabled || !reason.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border 
            border-transparent rounded-md hover:bg-red-700 disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {isLoading ? 'İşleniyor...' : 'Aktive Et'}
        </button>
      </div>
    </>
  );
}


/**
 * Capability Kill Switch Section Component
 */
interface CapabilityKillSwitchSectionProps {
  capabilitySwitches: CapabilityKillSwitch[];
  onActivate: (capability: string, reason: string) => Promise<unknown>;
  onDeactivate: (capability: string) => Promise<unknown>;
  isLoading: boolean;
}

function CapabilityKillSwitchSection({
  capabilitySwitches,
  onActivate,
  onDeactivate,
  isLoading,
}: CapabilityKillSwitchSectionProps) {
  const [activatingCapability, setActivatingCapability] = useState<string | null>(null);

  const getCapabilityStatus = (capabilityId: string) => {
    return capabilitySwitches.find(c => c.capability === capabilityId);
  };

  const handleToggle = async (capabilityId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      try {
        await onDeactivate(capabilityId);
        toast.success(`${capabilityId} özelliği aktive edildi`);
      } catch {
        toast.error('İşlem başarısız');
      }
    } else {
      setActivatingCapability(capabilityId);
    }
  };

  const handleActivateConfirm = async (reason: string) => {
    if (!activatingCapability) return;
    
    try {
      await onActivate(activatingCapability, reason);
      toast.success(`${activatingCapability} özelliği devre dışı bırakıldı`);
      setActivatingCapability(null);
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const activeCount = capabilitySwitches.filter(c => c.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Cpu className="h-5 w-5 text-gray-500" />
        <h4 className="font-medium text-gray-900">Capability Kill Switches</h4>
        {activeCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {activeCount} devre dışı
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AI_CAPABILITIES.map((capability) => {
          const status = getCapabilityStatus(capability.id);
          const isActive = status?.active ?? false;
          const Icon = capability.icon;

          return (
            <div
              key={capability.id}
              className={`
                p-4 rounded-lg border-2 transition-colors
                ${isActive 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-red-500' : 'text-gray-500'}`} />
                  <span className="font-medium text-gray-900">{capability.name}</span>
                </div>
                <ToggleSwitch
                  checked={isActive}
                  onChange={() => handleToggle(capability.id, isActive)}
                  disabled={isLoading}
                  size="sm"
                />
              </div>
              <p className="text-xs text-gray-500">{capability.description}</p>
              
              {isActive && status && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  {status.reason && (
                    <p className="text-xs text-red-700 mb-1">
                      <strong>Sebep:</strong> {status.reason}
                    </p>
                  )}
                  <div className="flex items-center space-x-3 text-xs text-red-600">
                    {status.activated_by && (
                      <span className="flex items-center">
                        <User size={10} className="mr-1" />
                        {status.activated_by}
                      </span>
                    )}
                    {status.activated_at && (
                      <span className="flex items-center">
                        <Clock size={10} className="mr-1" />
                        {new Date(status.activated_at).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activation Modal */}
      <ReasonModal
        isOpen={!!activatingCapability}
        onClose={() => setActivatingCapability(null)}
        onConfirm={handleActivateConfirm}
        title={`${activatingCapability} Özelliğini Devre Dışı Bırak`}
        description={`${activatingCapability} AI özelliğini devre dışı bırakmak üzeresiniz. Bu işlem tüm kullanıcıları etkileyecektir.`}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * KillSwitchPanel - Main Component
 * 
 * Provides comprehensive AI kill switch management for administrators.
 * Supports global, tenant-level, and capability-level kill switches.
 * 
 * @example
 * ```tsx
 * <KillSwitchPanel className="mt-4" />
 * ```
 */
export function KillSwitchPanel({ className = '' }: KillSwitchPanelProps) {
  const {
    status,
    isLoading,
    activateGlobal,
    deactivateGlobal,
    activateTenant,
    deactivateTenant,
    activateCapability,
    deactivateCapability,
  } = useKillSwitch();

  const [showGlobalModal, setShowGlobalModal] = useState(false);

  const isGlobalActive = status?.global_switch.active ?? false;

  const handleGlobalToggle = () => {
    if (isGlobalActive) {
      deactivateGlobal()
        .then(() => toast.success('Global kill switch deaktive edildi'))
        .catch(() => toast.error('İşlem başarısız'));
    } else {
      setShowGlobalModal(true);
    }
  };

  const handleGlobalActivate = async (reason: string) => {
    try {
      await activateGlobal(reason);
      toast.success('Global kill switch aktive edildi');
      setShowGlobalModal(false);
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  if (!status && isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Kill Switch</h2>
              <p className="text-sm text-gray-500">AI özelliklerini acil durumlarda devre dışı bırakın</p>
            </div>
          </div>
          {status?.timestamp && (
            <span className="text-xs text-gray-400">
              Son güncelleme: {new Date(status.timestamp).toLocaleString('tr-TR')}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Global Kill Switch */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Power className="h-5 w-5 text-gray-500" />
            <h4 className="font-medium text-gray-900">Global Kill Switch</h4>
          </div>

          <div className={`
            p-4 rounded-lg border-2 transition-colors
            ${isGlobalActive 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-200 bg-white'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">
                  {isGlobalActive ? 'AI Devre Dışı' : 'AI Aktif'}
                </h5>
                <p className="text-sm text-gray-500">
                  {isGlobalActive 
                    ? 'Tüm AI özellikleri devre dışı bırakıldı' 
                    : 'Tüm AI özellikleri çalışıyor'
                  }
                </p>
              </div>
              <ToggleSwitch
                checked={isGlobalActive}
                onChange={handleGlobalToggle}
                disabled={isLoading}
              />
            </div>

            {isGlobalActive && status?.global_switch && (
              <div className="mt-4 pt-4 border-t border-red-200">
                {status.global_switch.reason && (
                  <p className="text-sm text-red-700 mb-2">
                    <strong>Sebep:</strong> {status.global_switch.reason}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-xs text-red-600">
                  {status.global_switch.activated_by && (
                    <span className="flex items-center">
                      <User size={12} className="mr-1" />
                      {status.global_switch.activated_by}
                    </span>
                  )}
                  {status.global_switch.activated_at && (
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      {new Date(status.global_switch.activated_at).toLocaleString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Capability Kill Switches */}
        <CapabilityKillSwitchSection
          capabilitySwitches={status?.capability_switches ?? []}
          onActivate={activateCapability}
          onDeactivate={deactivateCapability}
          isLoading={isLoading}
        />

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Tenant Kill Switches */}
        <TenantKillSwitchSection
          tenantSwitches={status?.tenant_switches ?? []}
          onActivate={activateTenant}
          onDeactivate={deactivateTenant}
          isLoading={isLoading}
        />
      </div>

      {/* Global Activation Modal */}
      <ReasonModal
        isOpen={showGlobalModal}
        onClose={() => setShowGlobalModal(false)}
        onConfirm={handleGlobalActivate}
        title="Global Kill Switch Aktive Et"
        description="Bu işlem TÜM AI özelliklerini TÜM kullanıcılar için devre dışı bırakacaktır. Bu ciddi bir işlemdir ve sadece acil durumlarda kullanılmalıdır."
        isLoading={isLoading}
      />
    </div>
  );
}

export default KillSwitchPanel;
