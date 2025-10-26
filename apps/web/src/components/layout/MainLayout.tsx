import { Button } from '@x-ear/ui-web';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Package, 
  Building2, 
  FileText, 
  Wallet, 
  Megaphone, 
  Building, 
  PieChart, 
  Bot, 
  Settings, 
  ChevronRight, 
  Menu, 
  Sun, 
  Moon, 
  Bell, 
  User, 
  UserCircle, 
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  console.log('MainLayout render - user:', user);
  
  const navigate = useNavigate();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const toggleSubmenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/' },
    { key: 'patients', label: 'Hastalar', icon: Users, href: '/patients' },
    { key: 'appointments', label: 'Randevular', icon: Calendar, href: '/appointments' },
    { key: 'inventory', label: 'Envanter', icon: Package, href: '/inventory' },
    { key: 'suppliers', label: 'Tedarikçiler', icon: Building2, href: '/suppliers' },
    { 
      key: 'invoices', 
      label: 'Fatura', 
      icon: FileText, 
      submenu: [
        { label: 'Satışlar', href: '/invoices' },
        { label: 'Alışlar', href: '/invoices/purchases' },
        { label: 'Yeni Fatura', href: '/invoices/new' },
        { label: 'Ödeme Takibi', href: '/invoices/payments' }
      ]
    },
    { key: 'cashflow', label: 'Kasa', icon: Wallet, href: '/cashflow' },
    { key: 'campaigns', label: 'Kampanyalar', icon: Megaphone, href: '/campaigns' },
    { 
      key: 'sgk', 
      label: 'SGK', 
      icon: Building, 
      submenu: [
        { label: 'SGK Raporları', href: '/sgk' },
        { label: 'Hasta Eşleştirme', href: '/sgk/matching' },
        { label: 'Belge Yükleme', href: '/sgk/upload' },
        { label: 'Belge İndirme', href: '/sgk/downloads' }
      ]
    },
    { 
      key: 'reports', 
      label: 'Raporlar', 
      icon: PieChart, 
      submenu: [
        { label: 'Genel Raporlar', href: '/reports' },
        { label: 'Satış Raporları', href: '/reports/sales' },
        { label: 'Hasta Raporları', href: '/reports/patients' }
      ]
    },
    { key: 'automation', label: 'Otomasyon', icon: Bot, href: '/automation' },
    { key: 'settings', label: 'Ayarlar', icon: Settings, href: '/settings' }
  ];

  const renderMenuItem = (item: any) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus[item.key];

    return (
      <li key={item.key} style={{ marginBottom: '0.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            color: darkMode ? '#d1d5db' : '#374151',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: 'transparent'
          }}
          onClick={() => {
            if (hasSubmenu) {
              toggleSubmenu(item.key);
            } else {
              navigate({ to: item.href });
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
            e.currentTarget.style.color = darkMode ? '#ffffff' : '#1f2937';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = darkMode ? '#d1d5db' : '#374151';
          }}
        >
          <span style={{ marginRight: sidebarCollapsed ? '0' : '0.75rem' }}>
            <item.icon size={20} />
          </span>
          {!sidebarCollapsed && (
            <>
              <span style={{ flex: 1 }}>{item.label}</span>
              {hasSubmenu && (
                <span style={{ 
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  <ChevronRight size={16} />
                </span>
              )}
            </>
          )}
        </div>
        
        {hasSubmenu && !sidebarCollapsed && isExpanded && (
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: '0.25rem 0 0 2rem',
            borderLeft: `2px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            {item.submenu.map((subItem: any, index: number) => (
              <li key={index}>
                <Link
                  to={subItem.href}
                  style={{
                    display: 'block',
                    padding: '0.5rem 1rem',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                    e.currentTarget.style.color = darkMode ? '#ffffff' : '#1f2937';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = darkMode ? '#9ca3af' : '#6b7280';
                  }}
                >
                  {subItem.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  // Make toggleSidebar available globally for legacy compatibility
  useEffect(() => {
    (window as any).toggleSidebar = toggleSidebar;
    return () => {
      delete (window as any).toggleSidebar;
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: darkMode ? '#111827' : '#ffffff',
      color: darkMode ? '#ffffff' : '#000000'
    }}>
      {/* Sidebar */}
      <nav style={{
        width: sidebarCollapsed ? '80px' : '240px',
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        borderRight: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        transition: 'width 0.3s ease',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        <div style={{ 
          padding: '1rem',
          borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between'
        }}>
          <Button
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              color: darkMode ? '#ffffff' : '#1f2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            variant='ghost'>
            <Menu size={20} />
          </Button>
          {!sidebarCollapsed && (
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: darkMode ? '#ffffff' : '#1f2937'
            }}>
              X-EAR CRM
            </h2>
          )}
        </div>
        
        <ul style={{ 
          listStyle: 'none', 
          padding: '1rem 0.5rem', 
          margin: 0 
        }}>
          {menuItems.map(renderMenuItem)}
        </ul>
      </nav>
      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        marginLeft: sidebarCollapsed ? '80px' : '240px',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Header */}
        <header style={{
          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
          padding: '1rem 2rem',
          borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.5rem',
              color: darkMode ? '#ffffff' : '#1f2937',
              fontWeight: '600'
            }}>
              Dashboard
            </h1>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem' 
            }}>
              {/* Dark Mode Toggle */}
              <Button
                onClick={toggleDarkMode}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: darkMode ? '#ffffff' : '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={darkMode ? 'Açık Tema' : 'Koyu Tema'}
                variant='ghost'>
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </Button>

              {/* Notifications */}
              <Button
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  color: darkMode ? '#ffffff' : '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Bildirimler"
                variant='ghost'>
                <Bell size={20} />
                <span style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%'
                }}></span>
              </Button>

              {/* User Menu */}
              <div style={{ position: 'relative' }}>
                <Button
                  onClick={toggleUserDropdown}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: darkMode ? '#374151' : '#f3f4f6'
                  }}
                  variant='ghost'>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    <User size={16} />
                  </div>
                  <div style={{ 
                    textAlign: 'left',
                    color: darkMode ? '#ffffff' : '#1f2937'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {user?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {user?.role || 'Guest'}
                    </div>
                  </div>
                  <ChevronDown size={12} style={{ 
                    color: darkMode ? '#ffffff' : '#1f2937'
                  }} />
                </Button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    minWidth: '200px',
                    zIndex: 1000
                  }}>
                    <div style={{ padding: '0.5rem 0' }}>
                      <a
                        href="/profile"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          color: darkMode ? '#ffffff' : '#1f2937',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <User size={16} style={{ marginRight: '0.5rem' }} />
                        <span>Profil</span>
                      </a>
                      <a
                        href="/settings"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          color: darkMode ? '#ffffff' : '#1f2937',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Settings size={16} style={{ marginRight: '0.5rem' }} />
                        <span>Ayarlar</span>
                      </a>
                      <Button
                        onClick={() => {
                          localStorage.removeItem('token');
                          localStorage.removeItem('refreshToken');
                          window.location.href = '/login';
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '0.75rem 1rem',
                          color: '#ef4444',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        variant='ghost'>
                        <LogOut size={16} style={{ marginRight: '0.5rem' }} />
                        <span>Çıkış Yap</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ 
          flex: 1, 
          padding: '2rem',
          backgroundColor: darkMode ? '#111827' : '#f9fafb',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};