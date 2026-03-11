import { ReactNode, useState, useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { AdminSidebar } from './AdminSidebar'
import { AdminMobileHeader } from './AdminMobileHeader'
import { AdminMobileNav } from './AdminMobileNav'
import { AdminBottomNav } from './AdminBottomNav'
import { NotificationCenter } from './NotificationCenter'
import { Search, Bot } from 'lucide-react'
import { ComposerOverlay } from '../ai/ComposerOverlay'
import { useComposerStore } from '../../stores/composerStore'
import { useAdminResponsive } from '../../hooks/useAdminResponsive'
import { useAuth } from '../../contexts/useAuth'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouterState()
    const isLoginPage = router.location.pathname === '/login'
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { toggleOpen } = useComposerStore()
    const { isMobile, isTablet } = useAdminResponsive()
    const { isAuthenticated } = useAuth()

    // Keyboard shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                toggleOpen()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [toggleOpen])

    if (isLoginPage) {
        return (
            <div className="min-h-screen bg-gray-50">
                {children}
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Desktop & Tablet Sidebar - Show for width >= 768px */}
            {!isMobile && <AdminSidebar />}

            {/* Mobile Navigation Drawer - Show for width < 768px */}
            {isMobile && (
                <AdminMobileNav
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                {isMobile && (
                    <AdminMobileHeader
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        title="Super Admin Panel"
                    />
                )}

                {/* Desktop Header */}
                {!isMobile && (
                    <header className="sticky top-2 md:top-4 z-40 mx-2 md:mx-6 mb-2 md:mb-4 px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm rounded-xl md:rounded-2xl flex items-center justify-between gap-4 transition-all">
                        <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap">Super Admin Panel</h1>

                        {/* AI Composer Trigger - Centered Search Bar */}
                        <div className="hidden md:flex flex-1 max-w-xl mx-4">
                            <div
                                onClick={toggleOpen}
                                className="w-full flex items-center justify-between px-4 py-2 rounded-2xl cursor-pointer transition-colors border bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-blue-400"
                            >
                                <div className="flex items-center gap-3 text-gray-500">
                                    <Search size={18} />
                                    <Bot size={18} className="text-blue-500" />
                                    <span className="text-sm">AI ile arama yap veya işlem başlat...</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-gray-500 opacity-100">
                                        <span className="text-xs">⌘</span>K
                                    </kbd>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {isAuthenticated && <NotificationCenter />}
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-900 focus:outline-none"
                                >
                                    <span>Admin User</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-50">
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('admin_token');
                                                localStorage.removeItem('admin_refresh_token');
                                                window.location.href = '/login';
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                            Çıkış Yap
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                )}

                {/* Main Content */}
                <main className={`
                    flex-1 overflow-auto bg-gray-50
                    ${isMobile ? 'pt-16 pb-20 px-4' : 'p-6'}
                    ${isTablet ? 'px-6' : ''}
                `}>
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                {isMobile && <AdminBottomNav />}
            </div>

            {/* AI Composer Overlay (Cmd+K) */}
            <ComposerOverlay />
        </div>
    )
}
