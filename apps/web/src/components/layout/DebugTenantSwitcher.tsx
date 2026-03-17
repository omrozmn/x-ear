import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Building2, ChevronDown, Check, Loader2, Search, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminTenants,
  useCreateAdminDebugSwitchTenant,
  useCreateAdminDebugExitImpersonation,
  getListAdminTenantsQueryKey,
} from '@/api/client/admin-tenants.client';
import type { TenantRead } from '@/api/generated/schemas';
import type { AuthStateUser } from '../../stores/authStore';
import { useAuthStore } from '../../stores/authStore';
import { partyService } from '../../services/party.service';
import { indexedDBManager } from '../../utils/indexeddb';

// Extended tenant type with sector (backend sends it but Orval schema may not have it)
interface TenantWithSector extends TenantRead {
  sector?: string;
}

interface TenantListResponse {
  data: {
    tenants: TenantWithSector[];
  };
}

const SECTOR_LABELS: Record<string, string> = {
  hearing: 'Isitme',
  pharmacy: 'Eczane',
  hospital: 'Hastane',
  medical: 'Medikal',
  optic: 'Optik',
  hotel: 'Otel',
  beauty: 'Guzellik',
  general: 'Genel',
};

const SECTOR_COLORS: Record<string, string> = {
  hearing: '#3b82f6',
  pharmacy: '#10b981',
  hospital: '#ef4444',
  medical: '#14b8a6',
  optic: '#8b5cf6',
  hotel: '#f97316',
  beauty: '#ec4899',
  general: '#6b7280',
};

interface SwitchTenantResponse {
  data: {
    accessToken: string;
    refreshToken?: string | null; // Fixed: Backend sends refresh_token -> camelized to refreshToken
    createAuthRefresh?: string | null; // Keep for safety if legacy
    effectiveTenantId: string;
    tenantName: string;
    isImpersonatingTenant: boolean;
  };
}

interface DebugTenantSwitcherProps {
  darkMode?: boolean;
}

export const DebugTenantSwitcher: React.FC<DebugTenantSwitcherProps> = ({ darkMode = false }) => {
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Check if current user is super admin (can use debug features)
  const authUser = user as AuthStateUser | null;
  const isDebugAdmin = authUser?.is_super_admin === true ||
    authUser?.role === 'super_admin' ||
    authUser?.isImpersonatingTenant === true;

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tenants with search
  const { data: tenantsResponse, isLoading: tenantsLoading } = useListAdminTenants(
    { search: debouncedSearch, limit: 50 },
    {
      query: {
        queryKey: getListAdminTenantsQueryKey({ search: debouncedSearch, limit: 50 }),
        enabled: isDebugAdmin && isOpen,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    }
  );

  // Tenant switch mutation
  const { mutate: switchTenant, isPending: isSwitching } = useCreateAdminDebugSwitchTenant({
    mutation: {
      onSuccess: async (response) => {
        console.log('[DebugTenantSwitcher] Tenant switch success:', response);

        // CRITICAL: Clear ALL caches to prevent data leakage between tenants
        console.log('[DebugTenantSwitcher] Clearing ALL caches for tenant isolation...');

        // 1. Clear party service cache
        await partyService.reset();

        // 2. Clear IndexedDB (contains offline party data, appointments, etc.)
        try {
          await indexedDBManager.clearAll();
          console.log('[DebugTenantSwitcher] IndexedDB cleared');
        } catch (e) {
          console.error('[DebugTenantSwitcher] Failed to clear IndexedDB:', e);
        }

        const data = (response as unknown as SwitchTenantResponse)?.data;

        if (data?.accessToken && user) {
          const refreshToken = data.refreshToken || data.createAuthRefresh || null;

          const updatedUser = {
            ...user,
            effectiveTenantId: data.effectiveTenantId,
            tenantId: data.effectiveTenantId, // ADDED: Set tenantId for UI compatibility
            tenantName: data.tenantName,
            isImpersonatingTenant: data.isImpersonatingTenant,
          };

          // Pass both access and refresh tokens to setAuth
          setAuth(updatedUser, data.accessToken, refreshToken);
          console.log('[DebugTenantSwitcher] Switched to tenant:', data.tenantName);
          console.log('[DebugTenantSwitcher] Has refresh token:', !!refreshToken);

          // CRITICAL: Verify tokens are saved before reload
          console.log('[DebugTenantSwitcher] Verifying token persistence...');
          const savedToken = localStorage.getItem('x-ear.auth.token@v1');
          const savedRefresh = localStorage.getItem('x-ear.auth.refresh@v1');
          console.log('[DebugTenantSwitcher] Token saved:', !!savedToken, savedToken?.substring(0, 30));
          console.log('[DebugTenantSwitcher] Refresh saved:', !!savedRefresh, savedRefresh?.substring(0, 30));

          // Clear React Query cache
          queryClient.clear();
          console.log('[DebugTenantSwitcher] Cleared cache');

          // Wait longer for Zustand persist to complete (increase from 300ms to 1000ms)
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verify again after wait
          const verifyToken = localStorage.getItem('x-ear.auth.token@v1');
          const verifyRefresh = localStorage.getItem('x-ear.auth.refresh@v1');
          console.log('[DebugTenantSwitcher] After wait - Token:', !!verifyToken);
          console.log('[DebugTenantSwitcher] After wait - Refresh:', !!verifyRefresh);

          if (!verifyToken || !verifyRefresh) {
            console.error('[DebugTenantSwitcher] CRITICAL: Tokens not persisted! Retrying...');
            // Force write again
            localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
            if (refreshToken) {
              localStorage.setItem('x-ear.auth.refresh@v1', refreshToken);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Now reload
          window.location.href = '/';
        }
      },
      onError: (error) => {
        console.error('[DebugTenantSwitcher] Tenant switch failed:', error);
        alert('Tenant değiştirme başarısız oldu');
      },
    },
  });

  // Exit impersonation mutation
  const { mutate: exitImpersonation, isPending: isExiting } = useCreateAdminDebugExitImpersonation({
    mutation: {
      onSuccess: async (response) => {
        console.log('[DebugTenantSwitcher] Exit impersonation success');

        // CRITICAL: Clear ALL caches to prevent data leakage between tenants
        console.log('[DebugTenantSwitcher] Clearing ALL caches for tenant isolation...');

        // 1. Clear party service cache
        await partyService.reset();

        // 2. Clear IndexedDB
        try {
          await indexedDBManager.clearAll();
          console.log('[DebugTenantSwitcher] IndexedDB cleared');
        } catch (e) {
          console.error('[DebugTenantSwitcher] Failed to clear IndexedDB:', e);
        }

        const data = (response as unknown as SwitchTenantResponse)?.data;

        if (data?.accessToken && user) {
          const refreshToken = data.refreshToken || data.createAuthRefresh || null;

          const updatedUser = {
            ...user,
            effectiveTenantId: undefined,
            // Force reset tenantId to undefined even if TS thinks it should be string (inheritance issue?)
            tenantId: undefined as unknown as string,
            tenantName: undefined,
            isImpersonatingTenant: false,
          };

          // Pass both access and refresh tokens to setAuth
          setAuth(updatedUser, data.accessToken, refreshToken);
          console.log('[DebugTenantSwitcher] Has refresh token:', !!refreshToken);

          // CRITICAL: Verify tokens are saved before reload
          console.log('[DebugTenantSwitcher] Verifying token persistence...');
          const savedToken = localStorage.getItem('x-ear.auth.token@v1');
          const savedRefresh = localStorage.getItem('x-ear.auth.refresh@v1');
          console.log('[DebugTenantSwitcher] Token saved:', !!savedToken);
          console.log('[DebugTenantSwitcher] Refresh saved:', !!savedRefresh);

          // Clear React Query cache
          queryClient.clear();
          console.log('[DebugTenantSwitcher] Exited impersonation, cleared cache');

          // Wait longer for Zustand persist
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verify again
          const verifyToken = localStorage.getItem('x-ear.auth.token@v1');
          const verifyRefresh = localStorage.getItem('x-ear.auth.refresh@v1');
          console.log('[DebugTenantSwitcher] After wait - Token:', !!verifyToken);
          console.log('[DebugTenantSwitcher] After wait - Refresh:', !!verifyRefresh);

          if (!verifyToken || !verifyRefresh) {
            console.error('[DebugTenantSwitcher] CRITICAL: Tokens not persisted! Retrying...');
            localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
            if (refreshToken) {
              localStorage.setItem('x-ear.auth.refresh@v1', refreshToken);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          window.location.href = '/';
        }
      },
      onError: (error) => {
        console.error('[DebugTenantSwitcher] Exit failed:', error);
      },
    },
  });

  const handleTenantSwitch = useCallback((tenantId: string) => {
    console.log('[DebugTenantSwitcher] Switching to tenant:', tenantId);
    switchTenant({ data: { targetTenantId: tenantId } });
    setIsOpen(false);
  }, [switchTenant]);

  const handleExitImpersonation = useCallback(() => {
    console.log('[DebugTenantSwitcher] Exiting impersonation');
    exitImpersonation();
  }, [exitImpersonation]);

  if (!isDebugAdmin) {
    return null;
  }

  const tenants = (tenantsResponse as unknown as TenantListResponse)?.data?.tenants || [];
  const currentTenantId = authUser?.effectiveTenantId;

  // Try to get tenant name: first from user, then lookup from tenants list
  let currentTenantName = authUser?.tenantName;
  if (!currentTenantName && currentTenantId && tenants.length > 0) {
    const matchingTenant = tenants.find((t) => t.id === currentTenantId);
    currentTenantName = matchingTenant?.name;
  }
  currentTenantName = currentTenantName || (currentTenantId ? 'Tenant: ' + currentTenantId.slice(0, 8) + '...' : 'No Tenant');

  const isImpersonating = authUser?.isImpersonatingTenant === true || !!currentTenantId;

  return (
    <div style={{ position: 'relative' }}>
      {/* Tenant Badge & Button */}
      <button
        data-allow-raw="true"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || isExiting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: `2px solid ${isImpersonating ? '#10b981' : '#6b7280'}`,
          backgroundColor: isImpersonating
            ? (darkMode ? '#064e3b' : '#d1fae5')
            : (darkMode ? '#374151' : '#f3f4f6'),
          color: isImpersonating
            ? (darkMode ? '#34d399' : '#065f46')
            : (darkMode ? '#9ca3af' : '#4b5563'),
          fontSize: '0.75rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isImpersonating
            ? (darkMode ? '#065f46' : '#a7f3d0')
            : (darkMode ? '#4b5563' : '#e5e7eb');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isImpersonating
            ? (darkMode ? '#064e3b' : '#d1fae5')
            : (darkMode ? '#374151' : '#f3f4f6');
        }}
      >
        {isSwitching || isExiting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Building2 size={14} />
        )}
        <span>{currentTenantName}</span>
        <ChevronDown
          size={12}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            minWidth: '320px',
            maxHeight: '500px',
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              backgroundColor: darkMode ? '#111827' : '#f9fafb',
              borderRadius: '0.5rem 0.5rem 0 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: darkMode ? '#10b981' : '#059669',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                }}
              >
                <Building2 size={14} />
                <span>QA Tenant Değiştirici</span>
              </div>

            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: darkMode ? '#9ca3af' : '#6b7280',
                marginTop: '0.25rem',
              }}
            >
              Super Admin kullanabilir
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '0.75rem 1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                borderRadius: '0.375rem',
              }}
            >
              <Search size={14} style={{ color: darkMode ? '#9ca3af' : '#6b7280' }} />
              <input
                data-allow-raw="true"
                type="text"
                placeholder="Tenant ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#ffffff' : '#1f2937',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Tenant List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
            {tenantsLoading ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                }}
              >
                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Yükleniyor...</div>
              </div>
            ) : tenants.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '0.875rem',
                }}
              >
                Tenant bulunamadı
              </div>
            ) : (
              tenants.map((tenant) => {
                const isCurrentTenant = tenant.id === currentTenantId;
                return (
                  <button
                    data-allow-raw="true"
                    key={tenant.id}
                    onClick={() => !isCurrentTenant && handleTenantSwitch(tenant.id)}
                    disabled={isSwitching || isCurrentTenant}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.625rem 1rem',
                      border: 'none',
                      backgroundColor: isCurrentTenant
                        ? (darkMode ? '#065f46' : '#d1fae5')
                        : 'transparent',
                      color: isCurrentTenant
                        ? (darkMode ? '#34d399' : '#065f46')
                        : (darkMode ? '#ffffff' : '#1f2937'),
                      textAlign: 'left',
                      cursor: isCurrentTenant ? 'default' : 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentTenant) {
                        e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentTenant) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: isCurrentTenant ? '600' : '500', fontSize: '0.875rem' }}>
                          {tenant.name}
                        </span>
                        {(tenant as TenantWithSector).sector && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            backgroundColor: SECTOR_COLORS[(tenant as TenantWithSector).sector || ''] + '20',
                            color: SECTOR_COLORS[(tenant as TenantWithSector).sector || ''] || '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {SECTOR_LABELS[(tenant as TenantWithSector).sector || ''] || (tenant as TenantWithSector).sector}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: darkMode ? '#9ca3af' : '#6b7280',
                          marginTop: '0.125rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        <span>{tenant.ownerEmail}</span>
                        <span style={{ opacity: 0.5 }}>|</span>
                        <span style={{ fontWeight: '600', color: darkMode ? '#60a5fa' : '#2563eb' }}>
                          {tenant.userCount || 0} kullanici
                        </span>
                        <span style={{ opacity: 0.5 }}>|</span>
                        <span>{tenant.currentPlan || tenant.status}</span>
                      </div>
                    </div>
                    {isCurrentTenant && (
                      <Check size={16} style={{ color: darkMode ? '#34d399' : '#059669' }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Exit Impersonation Button */}
          {isImpersonating && (
            <div
              style={{
                padding: '0.5rem',
                borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              }}
            >
              <button
                data-allow-raw="true"
                onClick={handleExitImpersonation}
                disabled={isExiting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2',
                  color: darkMode ? '#fca5a5' : '#dc2626',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isExiting ? 'not-allowed' : 'pointer',
                  opacity: isExiting ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isExiting) e.currentTarget.style.backgroundColor = darkMode ? '#991b1b' : '#fecaca';
                }}
                onMouseLeave={(e) => {
                  if (!isExiting) e.currentTarget.style.backgroundColor = darkMode ? '#7f1d1d' : '#fee2e2';
                }}
              >
                {isExiting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Super Admin'e Dön
              </button>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: '0.5rem 1rem',
              borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              backgroundColor: darkMode ? '#111827' : '#f9fafb',
              borderRadius: '0 0 0.5rem 0.5rem',
              fontSize: '0.65rem',
              color: darkMode ? '#6b7280' : '#9ca3af',
            }}
          >
            Tenant değişince sayfa yenilenir
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugTenantSwitcher;
