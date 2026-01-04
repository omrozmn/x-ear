import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Building2, ChevronDown, Check, Loader2, Search, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminTenantsGetTenants,
  useAdminDebugSwitchTenant,
  useAdminDebugExitImpersonation,
} from '@/api/generated/admin/admin';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/patient.service';

const DEBUG_ADMIN_EMAIL = 'admin@x-ear.com';

interface DebugTenantSwitcherProps {
  darkMode?: boolean;
}

export const DebugTenantSwitcher: React.FC<DebugTenantSwitcherProps> = ({ darkMode = false }) => {
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Check if current user is the debug admin
  const isDebugAdmin = user?.email === DEBUG_ADMIN_EMAIL || (user as any)?.realUserEmail === DEBUG_ADMIN_EMAIL;

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tenants with search
  const { data: tenantsResponse, isLoading: tenantsLoading } = useAdminTenantsGetTenants(
    { search: debouncedSearch, limit: 50 },
    {
      query: {
        enabled: isDebugAdmin && isOpen,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    }
  );

  // Tenant switch mutation
  const { mutate: switchTenant, isPending: isSwitching } = useAdminDebugSwitchTenant({
    mutation: {
      onSuccess: async (response) => {
        console.log('[DebugTenantSwitcher] Tenant switch success:', response);

        // CRITICAL: Clear patient cache to prevent data leakage between tenants
        console.log('[DebugTenantSwitcher] Clearing patient cache for tenant isolation...');
        await patientService.reset();

        const data = (response as any)?.data;

        if (data?.accessToken && user) {
          const updatedUser = {
            ...user,
            effectiveTenantId: data.effectiveTenantId,
            tenantName: data.tenantName,
            isImpersonatingTenant: data.isImpersonatingTenant,
          };

          // Pass both access and refresh tokens to setAuth
          setAuth(updatedUser, data.accessToken, data.refreshToken || null);
          console.log('[DebugTenantSwitcher] Switched to tenant:', data.tenantName);
          console.log('[DebugTenantSwitcher] Has refresh token:', !!data.refreshToken);

          // Clear React Query cache
          queryClient.clear();
          console.log('[DebugTenantSwitcher] Cleared cache');

          // Wait for Zustand persist to complete (it writes to localStorage async)
          await new Promise(resolve => setTimeout(resolve, 300));

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
  const { mutate: exitImpersonation, isPending: isExiting } = useAdminDebugExitImpersonation({
    mutation: {
      onSuccess: async (response) => {
        console.log('[DebugTenantSwitcher] Exit impersonation success');

        // CRITICAL: Clear patient cache to prevent data leakage between tenants
        console.log('[DebugTenantSwitcher] Clearing patient cache for tenant isolation...');
        await patientService.reset();

        const data = (response as any)?.data;

        if (data?.accessToken && user) {
          const updatedUser = {
            ...user,
            effectiveTenantId: undefined,
            tenantName: undefined,
            isImpersonatingTenant: false,
          };

          // Pass both access and refresh tokens to setAuth
          setAuth(updatedUser, data.accessToken, data.refreshToken || null);
          console.log('[DebugTenantSwitcher] Has refresh token:', !!data.refreshToken);

          // Clear React Query cache
          queryClient.clear();
          console.log('[DebugTenantSwitcher] Exited impersonation, cleared cache');

          // Wait for Zustand persist
          await new Promise(resolve => setTimeout(resolve, 300));

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

  const tenants = (tenantsResponse as any)?.data?.tenants || [];
  const currentTenantId = (user as any)?.effectiveTenantId;

  // Try to get tenant name: first from user, then lookup from tenants list
  let currentTenantName = (user as any)?.tenantName;
  if (!currentTenantName && currentTenantId && tenants.length > 0) {
    const matchingTenant = tenants.find((t: any) => t.id === currentTenantId);
    currentTenantName = matchingTenant?.name;
  }
  currentTenantName = currentTenantName || (currentTenantId ? 'Tenant: ' + currentTenantId.slice(0, 8) + '...' : 'No Tenant');

  const isImpersonating = (user as any)?.isImpersonatingTenant === true || !!currentTenantId;

  return (
    <div style={{ position: 'relative' }}>
      {/* Tenant Badge & Button */}
      <button
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
              Sadece {DEBUG_ADMIN_EMAIL} kullanabilir
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
              tenants.map((tenant: any) => {
                const isCurrentTenant = tenant.id === currentTenantId;
                return (
                  <button
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
                      <div style={{ fontWeight: isCurrentTenant ? '600' : '500', fontSize: '0.875rem' }}>
                        {tenant.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: darkMode ? '#9ca3af' : '#6b7280',
                          marginTop: '0.125rem',
                        }}
                      >
                        {tenant.owner_email} • {tenant.user_count || 0} users • {tenant.status}
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
