import { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { AdminSidebar } from './AdminSidebar'
import { NotificationCenter } from './NotificationCenter'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouterState()
    const isLoginPage = router.location.pathname === '/login'

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
                        <div className="text-sm text-gray-500">Admin User</div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-gray-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
