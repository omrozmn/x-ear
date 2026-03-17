import { Link, useLocation } from '@tanstack/react-router'
import {
    Home,
    Building2,
    Users,
    CreditCard,
    Briefcase,
    LifeBuoy,
    Settings,
    PlusCircle,
    BarChart3,
    MessageSquare,
    Package,
    Folder,
    Activity,
    Shield,
    FileText,
    User,
    Calendar,
    Box,
    Bell,
    Key,
    ShoppingBag,
    Zap,
    Truck,
    Megaphone,
    Bot,
    Globe2,
    ToggleRight,
    Flag,
    ScanLine,
} from 'lucide-react'
import { useAdminResponsive } from '../../hooks/useAdminResponsive'

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Raporlar', href: '/analytics', icon: BarChart3 },
    { name: 'Aboneler', href: '/tenants', icon: Building2 },
    { name: 'Kullanıcılar', href: '/users', icon: Users },
    { name: 'Blog Yönetimi', href: '/blog', icon: FileText },
    { name: 'Hastalar', href: '/patients', icon: User },
    { name: 'Randevular', href: '/appointments', icon: Calendar },
    { name: 'Cihaz & Stok', href: '/inventory', icon: Box },
    { name: 'Tedarikçiler', href: '/suppliers', icon: Truck },
    { name: 'Kampanyalar', href: '/campaigns', icon: Megaphone },
    { name: 'Üretim Takibi', href: '/production', icon: Package },
    { name: 'Pazaryerleri', href: '/marketplaces', icon: ShoppingBag },
    { name: 'Bildirimler', href: '/notifications', icon: Bell },
    { name: 'API Anahtarları', href: '/api-keys', icon: Key },
    { name: 'Roller', href: '/roles', icon: Shield },
    { name: 'Planlar', href: '/plans', icon: CreditCard },
    { name: 'Affiliateler', href: '/affiliates', icon: Users },
    { name: 'Eklentiler', href: '/addons', icon: PlusCircle },
    { name: 'SMS Yönetimi', href: '/sms/headers', icon: MessageSquare },
    { name: 'AI Yönetimi', href: '/ai', icon: Bot },
    { name: 'Web Yonetim', href: '/web-management', icon: Globe2 },
    { name: 'Aktivite Logları', href: '/activity-logs', icon: Activity },
    { name: 'Dosyalar', href: '/files', icon: Folder },
    { name: 'OCR Kuyruğu', href: '/ocr-queue', icon: FileText },
    { name: 'Faturalar & Ödemeler', href: '/billing', icon: CreditCard },
    { name: 'Personel', href: '/personnel', icon: Briefcase },
    { name: 'Destek', href: '/support', icon: LifeBuoy },
    { name: 'Feature Flags', href: '/features', icon: ToggleRight },
    { name: 'Countries', href: '/countries', icon: Flag },
    { name: 'Barkod & Yazdırma', href: '/barcodes', icon: ScanLine },
    { name: 'Entegrasyonlar', href: '/integrations', icon: Zap },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
]

export function AdminSidebar() {
    const location = useLocation()
    const { isDesktop } = useAdminResponsive()

    // Only render on desktop
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
