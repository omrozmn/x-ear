import { Link, useLocation } from '@tanstack/react-router'
import {
    Home,
    Building2,
    Users,
    CreditCard,
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
    Megaphone
} from 'lucide-react'

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Raporlar', href: '/analytics', icon: BarChart3 },
    { name: 'Kiracılar', href: '/tenants', icon: Building2 },
    { name: 'Kullanıcılar', href: '/users', icon: Users },
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
    { name: 'Eklentiler', href: '/addons', icon: PlusCircle },
    { name: 'SMS Başlıkları', href: '/sms/headers', icon: MessageSquare },
    { name: 'SMS Paketleri', href: '/sms/packages', icon: Package },
    { name: 'Aktivite Logları', href: '/activity-logs', icon: Activity },
    { name: 'Dosyalar', href: '/files', icon: Folder },
    { name: 'OCR Kuyruğu', href: '/ocr-queue', icon: FileText },
    { name: 'Faturalar', href: '/billing', icon: CreditCard },
    { name: 'Destek', href: '/support', icon: LifeBuoy },
    { name: 'Entegrasyonlar', href: '/integrations/vatan-sms', icon: Zap },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
]

export function AdminSidebar() {
    const location = useLocation()

    return (
        <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 min-h-screen">
            <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-800 gap-2">
                <img src="/logo/x.svg" alt="X-Ear Logo" className="w-8 h-8" />
                <span className="text-xl font-bold text-white">X-Ear Admin</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
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
