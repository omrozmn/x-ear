import { Link, useLocation } from '@tanstack/react-router'
import {
    Home,
    Building2,
    CreditCard,
    LifeBuoy,
    Settings,
    BarChart3,
    ShoppingBag,
    Bell,
    Zap,
    Megaphone,
    Bot,
    ToggleRight,
    ScanLine,
    FileText,
    User,
    Box,
    Newspaper,
} from 'lucide-react'
import { useAdminResponsive } from '../../hooks/useAdminResponsive'

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Aboneler & Kullanıcılar', href: '/tenants', icon: Building2 },
    { name: 'Hastalar & Randevular', href: '/patients', icon: User },
    { name: 'Envanter & Operasyon', href: '/inventory', icon: Box },
    { name: 'Kampanyalar', href: '/campaigns', icon: Megaphone },
    { name: 'Pazaryerleri', href: '/marketplaces', icon: ShoppingBag },
    { name: 'Bildirimler', href: '/notifications', icon: Bell },
    { name: 'Planlar & Eklentiler', href: '/plans', icon: CreditCard },
    { name: 'Faturalar & Ödemeler', href: '/billing', icon: CreditCard },
    { name: 'Raporlar & Loglar', href: '/analytics', icon: BarChart3 },
    { name: 'İçerik Yönetimi', href: '/blog', icon: FileText },
    { name: 'Blog Otomasyonu', href: '/blog-automation', icon: Newspaper },
    { name: 'AI Yönetimi', href: '/ai', icon: Bot },
    { name: 'Barkod & Yazdırma', href: '/barcodes', icon: ScanLine },
    { name: 'Özellik & Yerelleştirme', href: '/features', icon: ToggleRight },
    { name: 'Entegrasyonlar', href: '/integrations', icon: Zap },
    { name: 'Destek', href: '/support', icon: LifeBuoy },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
]

export function AdminSidebar() {
    const location = useLocation()
    const { isDesktop } = useAdminResponsive()

    if (!isDesktop) {
        return null
    }

    return (
        <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 h-screen">
            <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-800 gap-2">
                <img src="/logo/x.svg" alt="X-Ear Logo" className="w-8 h-8" />
                <span className="text-xl font-bold text-white">X-Ear Admin</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-xl transition-colors
                  ${isActive
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                `}
                            >
                                <item.icon
                                    className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
