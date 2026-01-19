import * as React from 'react';
import { useState, useMemo } from 'react';
import { Eye, X, Check, Lock, Shield } from 'lucide-react';
import { useListPermissions, getListPermissionsQueryKey } from '@/api/client/permissions.client';
import { useAuthStore } from '../../stores/authStore';

// Page permission mappings - maps pageKey to required permissions
const PAGE_PERMISSION_MAP: Record<string, Array<{ code: string; label: string }>> = {
  dashboard: [
    { code: 'dashboard.view', label: 'Dashboard Görüntüleme' },
    { code: 'dashboard.analytics', label: 'Analytics Görüntüleme' },
  ],
  parties: [
    { code: 'parties.list', label: 'Hasta Listesi' },
    { code: 'parties.create', label: 'Hasta Oluşturma' },
    { code: 'parties.update', label: 'Hasta Güncelleme' },
    { code: 'parties.delete', label: 'Hasta Silme' },
  ],
  inventory: [
    { code: 'inventory.list', label: 'Envanter Listesi' },
    { code: 'inventory.create', label: 'Ürün Ekleme' },
    { code: 'inventory.update', label: 'Ürün Güncelleme' },
    { code: 'inventory.delete', label: 'Ürün Silme' },
  ],
  invoices: [
    { code: 'invoices.list', label: 'Fatura Listesi' },
    { code: 'invoices.create', label: 'Fatura Oluşturma' },
    { code: 'invoices.update', label: 'Fatura Güncelleme' },
    { code: 'invoices.delete', label: 'Fatura Silme' },
  ],
  appointments: [
    { code: 'appointments.list', label: 'Randevu Listesi' },
    { code: 'appointments.create', label: 'Randevu Oluşturma' },
    { code: 'appointments.update', label: 'Randevu Güncelleme' },
    { code: 'appointments.delete', label: 'Randevu Silme' },
  ],
  settings: [
    { code: 'settings.view', label: 'Ayarları Görüntüleme' },
    { code: 'settings.update', label: 'Ayarları Güncelleme' },
  ],
  reports: [
    { code: 'reports.view', label: 'Raporları Görüntüleme' },
    { code: 'reports.export', label: 'Rapor Dışa Aktarma' },
  ],
};

// Debug admin email
const DEBUG_ADMIN_EMAIL = 'admin@x-ear.com';

interface PagePermissionsViewerProps {
  pageKey: string;
  pageTitle?: string;
  darkMode?: boolean;
}

export const PagePermissionsViewer: React.FC<PagePermissionsViewerProps> = ({
  pageKey,
  pageTitle,
  darkMode = false,
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for debug admin
  const isDebugAdmin = user?.email === DEBUG_ADMIN_EMAIL || user?.role === 'super_admin';

  // Fetch user's permissions
  const { data: permissionsResponse, isLoading } = useListPermissions({
    query: {
      queryKey: getListPermissionsQueryKey(),
      enabled: isDebugAdmin && isOpen,
      staleTime: 30 * 1000, // 30 seconds
    }
  });

  // Calculate actions based on page permissions and user's permissions
  const actions = useMemo(() => {
    const pagePermissions = PAGE_PERMISSION_MAP[pageKey] || [];

    // Extract user permissions from response
    let userPermissions: string[] = [];
    const respData = permissionsResponse as any;

    if (respData?.data) {
      if (Array.isArray(respData.data)) {
        userPermissions = respData.data;
      } else if (respData.data.permissions) {
        userPermissions = respData.data.permissions;
      }
    } else if (Array.isArray(respData)) {
      userPermissions = respData;
    }

    // Admin has all permissions
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const hasWildcard = userPermissions.includes('*');

    return pagePermissions.map(perm => ({
      code: perm.code,
      label: perm.label,
      allowed: isAdmin || hasWildcard || userPermissions.includes(perm.code),
    }));
  }, [pageKey, permissionsResponse, user?.role]);

  const allowedCount = actions.filter(a => a.allowed).length;
  const totalCount = actions.length;

  // Don't render if not debug admin
  if (!isDebugAdmin) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: darkMode ? '#7c3aed' : '#8b5cf6',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          zIndex: 999,
          transition: 'transform 0.2s ease, background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = darkMode ? '#6d28d9' : '#7c3aed';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = darkMode ? '#7c3aed' : '#8b5cf6';
        }}
        title="Sayfa İzinlerini Görüntüle"
      >
        <Eye size={20} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: darkMode ? '#1f2937' : '#ffffff',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: darkMode ? '#111827' : '#f9fafb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={20} style={{ color: darkMode ? '#a78bfa' : '#7c3aed' }} />
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: darkMode ? '#ffffff' : '#111827',
                  }}>
                    {pageTitle || pageKey} İzinleri
                  </h3>
                  <div style={{
                    fontSize: '0.75rem',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    marginTop: '0.125rem',
                  }}>
                    Rol: {user?.role || 'Unknown'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '1rem 1.5rem',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}>
              {isLoading ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                }}>
                  İzinler yükleniyor...
                </div>
              ) : actions.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                }}>
                  Bu sayfa için tanımlı izin bulunamadı
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {actions.map((action) => (
                    <div
                      key={action.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: action.allowed
                          ? (darkMode ? '#065f46' : '#d1fae5')
                          : (darkMode ? '#7f1d1d' : '#fee2e2'),
                        border: `1px solid ${action.allowed
                          ? (darkMode ? '#10b981' : '#a7f3d0')
                          : (darkMode ? '#ef4444' : '#fecaca')
                          }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {action.allowed ? (
                          <Check size={18} style={{ color: darkMode ? '#34d399' : '#059669' }} />
                        ) : (
                          <Lock size={18} style={{ color: darkMode ? '#f87171' : '#dc2626' }} />
                        )}
                        <div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: action.allowed
                              ? (darkMode ? '#d1fae5' : '#065f46')
                              : (darkMode ? '#fecaca' : '#7f1d1d'),
                          }}>
                            {action.label}
                          </div>
                          <div style={{
                            fontSize: '0.7rem',
                            color: action.allowed
                              ? (darkMode ? '#a7f3d0' : '#10b981')
                              : (darkMode ? '#fca5a5' : '#ef4444'),
                            fontFamily: 'monospace',
                          }}>
                            {action.code}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: action.allowed
                          ? (darkMode ? '#10b981' : '#059669')
                          : (darkMode ? '#ef4444' : '#dc2626'),
                        color: 'white',
                      }}>
                        {action.allowed ? 'İZİNLİ' : 'YASAK'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem 1.5rem',
              borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              backgroundColor: darkMode ? '#111827' : '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: darkMode ? '#6b7280' : '#9ca3af',
              }}>
                {allowedCount} / {totalCount} izin aktif
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: darkMode ? '#6b7280' : '#9ca3af',
              }}>
                Debug Mode
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PagePermissionsViewer;
