import { ReactNode, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { AdminSidebar } from './AdminSidebar'
import { NotificationCenter } from './NotificationCenter'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouterState()
    const isLoginPage = router.location.pathname === '/login'
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    if (isLoginPage) {
        return (
            <div className="min-h-screen bg-gray-50">
                {children}
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm z-10 h-16 flex items-center justify-between px-6">
                    <h1 className="text-lg font-semibold text-gray-900">Super Admin Panel</h1>
                    <div className="flex items-center space-x-4">
                        {/* Add header items like profile dropdown here if needed */}
                        <NotificationCenter />
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
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
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
                <main className="flex-1 overflow-auto bg-gray-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
