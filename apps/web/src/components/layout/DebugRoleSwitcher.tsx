import * as React from 'react';
import { useState } from 'react';
import { Bug, ChevronDown, Check, Loader2, Shield, LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAdminDebugAvailableRoles,
  useCreateAdminDebugSwitchRole,
  useCreateAdminDebugExitImpersonation,
  getListAdminDebugAvailableRolesQueryKey,
} from '@/api/client/admin.client';
import { useAuthStore } from '../../stores/authStore';
import { AUTH_TOKEN, REFRESH_TOKEN } from '../../constants/storage-keys';
import { partyService } from '../../services/party.service';
import { indexedDBManager } from '../../utils/indexeddb';

interface DebugRoleSwitcherProps {
  darkMode?: boolean;
}

export const DebugRoleSwitcher: React.FC<DebugRoleSwitcherProps> = ({ darkMode = false }) => {
  const { user, setUser, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Check if current user is super admin (can use debug features)
  interface AdminUser { is_super_admin?: boolean; role?: string; isImpersonating?: boolean; }
  const adminUser = user as unknown as AdminUser;

  const isDebugAdmin = adminUser?.is_super_admin === true ||
    adminUser?.role === 'super_admin' ||
    adminUser?.isImpersonating === true;

  // Fetch available roles only if debug admin AND dropdown is open
  const { data: rolesResponse, isLoading: rolesLoading } = useListAdminDebugAvailableRoles({
    query: {
      queryKey: getListAdminDebugAvailableRolesQueryKey(),
      enabled: isDebugAdmin && isOpen,
      staleTime: 5 * 60 * 1000, // 5 dakika
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  });

  // Reduced logging to prevent console spam
  // console.log('[DebugRoleSwitcher] Render. isDebugAdmin:', isDebugAdmin, 'Current Role:', user?.role, 'IsImpersonating:', user?.isImpersonating);

  // Role switch mutation
  const { mutate: switchRole, isPending: isSwitching } = useCreateAdminDebugSwitchRole({
    mutation: {
      onMutate: () => {
        console.log('[DebugRoleSwitcher] Mutation starting...');
      },
      onSuccess: async (response) => {
        console.log('[DebugRoleSwitcher] ===== ROLE SWITCH SUCCESS =====');

        // CRITICAL: Clear ALL caches to prevent data leakage between tenant contexts
        console.log('[DebugRoleSwitcher] Clearing ALL caches for tenant isolation...');

        // 1. Clear party service cache
        await partyService.reset();

        // 2. Clear IndexedDB
        try {
          await indexedDBManager.clearAll();
          console.log('[DebugRoleSwitcher] IndexedDB cleared');
        } catch (e) {
          console.error('[DebugRoleSwitcher] Failed to clear IndexedDB:', e);
        }

        console.log('[DebugRoleSwitcher] Raw response:', response);

        const data = (response as any)?.data || response;
        console.log('[DebugRoleSwitcher] Extracted data:', data);

        if (data && (data.accessToken || data.effectiveRole)) {
          console.log('[DebugRoleSwitcher] Updating tokens and user state...', data);

          if (data.accessToken && user) {
            const updatedUser = {
              ...user,
              role: data.effectiveRole,
              isImpersonating: data.isImpersonating || true,
              realUserEmail: data.realUserEmail || user.email,
            };

            // Pass both access and refresh tokens to setAuth
            setAuth(updatedUser, data.accessToken, data.createAuthRefresh || null);

            // Clear React Query cache
            queryClient.clear();

            console.log('[DebugRoleSwitcher] Updated Zustand store with setAuth()');
            console.log('[DebugRoleSwitcher] New role:', data.effectiveRole);
            console.log('[DebugRoleSwitcher] Has refresh token:', !!data.createAuthRefresh);
          }

          console.log('[DebugRoleSwitcher] Waiting for Zustand persist...');
          // Wait for Zustand persist to complete
          await new Promise(resolve => setTimeout(resolve, 300));

          console.log('[DebugRoleSwitcher] Redirecting to /');
          window.location.href = '/';
        } else {
          console.error('[DebugRoleSwitcher] Response data missing or invalid!');
          console.error('[DebugRoleSwitcher] Response:', response);
        }
      },
      onError: (error) => {
        console.error('[DebugRoleSwitcher] Role switch failed:', error);
        alert('Rol değiştirme başarısız oldu');
      }
    }
  });

  // Exit impersonation mutation
  const { mutate: exitImpersonation, isPending: isExiting } = useCreateAdminDebugExitImpersonation({
    mutation: {
      onSuccess: async (response) => {
        console.log('[DebugRoleSwitcher] Exit impersonation success:', response);

        // CRITICAL: Clear ALL caches to prevent data leakage between tenant contexts
        console.log('[DebugRoleSwitcher] Clearing ALL caches for tenant isolation...');

        // 1. Clear party service cache
        await partyService.reset();

        // 2. Clear IndexedDB
        try {
          await indexedDBManager.clearAll();
          console.log('[DebugRoleSwitcher] IndexedDB cleared');
        } catch (e) {
          console.error('[DebugRoleSwitcher] Failed to clear IndexedDB:', e);
        }

        const data = (response as any)?.data || response;

        if (data?.accessToken && user) {
          const updatedUser = {
            ...user,
            role: 'super_admin',
            isImpersonating: false,
            realUserEmail: undefined,
          };

          setAuth(updatedUser, data.accessToken, data.createAuthRefresh || null);

          // Clear React Query cache
          queryClient.clear();

          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = '/';
        }
      },
      onError: (error) => {
        console.error('[DebugRoleSwitcher] Exit impersonation failed:', error);
        alert('Orijinal role dönüş başarısız oldu');
      }
    }
  });

  // Debug admin değilse hiçbir şey gösterme
  if (!isDebugAdmin) {
    return null;
  }

  // Check if currently impersonating (not super_admin and has isImpersonating flag)
  const isImpersonating = user?.isImpersonating === true;

  // Response has { success, data: { roles: [...] } }
  const roles = (rolesResponse as any)?.data?.roles || [];
  const currentRole = user?.role || 'unknown';

  const handleRoleSwitch = (roleName: string) => {
    console.log('[DebugRoleSwitcher] Handling switch to:', roleName);
    if (roleName === currentRole) {
      console.log('[DebugRoleSwitcher] Already on this role, closing.');
      setIsOpen(false);
      return;
    }

    switchRole({
      data: { targetRole: roleName }
    });
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Debug Badge & Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || rolesLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: `2px solid ${darkMode ? '#f59e0b' : '#d97706'}`,
          backgroundColor: darkMode ? '#451a03' : '#fef3c7',
          color: darkMode ? '#fbbf24' : '#92400e',
          fontSize: '0.75rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = darkMode ? '#78350f' : '#fde68a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = darkMode ? '#451a03' : '#fef3c7';
        }}
      >
        {isSwitching ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Bug size={14} />
        )}
        <span>Debug: {currentRole}</span>
        <ChevronDown size={12} style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s ease'
        }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            minWidth: '220px',
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            backgroundColor: darkMode ? '#111827' : '#f9fafb',
            borderRadius: '0.5rem 0.5rem 0 0',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: darkMode ? '#fbbf24' : '#d97706',
              fontWeight: '600',
              fontSize: '0.75rem',
            }}>
              <Shield size={14} />
              <span>QA Rol Değiştirici</span>
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginTop: '0.25rem',
            }}>
              Super Admin kullanabilir
            </div>
          </div>

          {/* Role List */}
          <div style={{ padding: '0.5rem 0' }}>
            {rolesLoading ? (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: '0.875rem',
              }}>
                <Loader2 size={20} className="animate-spin" style={{ marginBottom: '0.5rem' }} />
                <div>Roller yükleniyor...</div>
              </div>
            ) : roles.length === 0 ? (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: '0.875rem',
              }}>
                Rol bulunamadı
              </div>
            ) : (
              roles.map((role) => {
                const roleName = role.name || '';
                const isCurrentRole = roleName === currentRole;
                return (
                  <button
                    key={roleName}
                    onClick={() => roleName && handleRoleSwitch(roleName)}
                    disabled={isSwitching || !roleName}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.625rem 1rem',
                      border: 'none',
                      backgroundColor: isCurrentRole
                        ? (darkMode ? '#1d4ed8' : '#dbeafe')
                        : 'transparent',
                      color: isCurrentRole
                        ? (darkMode ? '#ffffff' : '#1e40af')
                        : (darkMode ? '#ffffff' : '#1f2937'),
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      cursor: isSwitching ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentRole) {
                        e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentRole) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isCurrentRole ? '600' : '500' }}>
                        {role.displayName}
                      </div>
                      {role.permissionCount !== undefined && (
                        <div style={{
                          fontSize: '0.7rem',
                          color: darkMode ? '#9ca3af' : '#6b7280',
                          marginTop: '0.125rem',
                        }}>
                          {role.permissionCount} izin
                        </div>
                      )}
                    </div>
                    {isCurrentRole && (
                      <Check size={16} style={{
                        color: darkMode ? '#ffffff' : '#1d4ed8',
                      }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Exit Impersonation Button - Only show when impersonating */}
          {isImpersonating && (
            <div style={{
              padding: '0.5rem',
              borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            }}>
              <button
                onClick={() => exitImpersonation()}
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
                  backgroundColor: darkMode ? '#dc2626' : '#fee2e2',
                  color: darkMode ? '#fecaca' : '#b91c1c',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: isExiting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#b91c1c' : '#fecaca';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#dc2626' : '#fee2e2';
                }}
              >
                {isExiting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                <span>Super Admin'e Dön</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '0.5rem 1rem',
            borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            backgroundColor: darkMode ? '#111827' : '#f9fafb',
            borderRadius: '0 0 0.5rem 0.5rem',
            fontSize: '0.65rem',
            color: darkMode ? '#6b7280' : '#9ca3af',
          }}>
            Rol değişince sayfa yenilenir
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugRoleSwitcher;
