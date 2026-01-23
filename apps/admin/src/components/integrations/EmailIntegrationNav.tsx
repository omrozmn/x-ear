import { Link, useLocation } from '@tanstack/react-router'
import { Settings, FileText } from 'lucide-react'

const emailNavItems = [
    {
        name: 'Yapılandırma',
        href: '/integrations/email/config',
        icon: Settings,
    },
    {
        name: 'E-posta Logları',
        href: '/integrations/email/logs',
        icon: FileText,
    },
]

export function EmailIntegrationNav() {
    const location = useLocation()

    return (
        <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8" aria-label="Email Integration Navigation">
                {emailNavItems.map((item) => {
                    const isActive = location.pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`
                                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                                ${isActive
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
