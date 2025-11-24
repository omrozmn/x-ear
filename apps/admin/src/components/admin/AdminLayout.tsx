import { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="flex h-screen bg-gray-100">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm z-10 h-16 flex items-center justify-between px-6">
                    <h1 className="text-lg font-semibold text-gray-900">Super Admin Panel</h1>
                    <div className="flex items-center space-x-4">
                        {/* Add header items like profile dropdown here if needed */}
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
