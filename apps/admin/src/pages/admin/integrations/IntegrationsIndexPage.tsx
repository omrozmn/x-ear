import { Link } from '@tanstack/react-router'
import { Mail, MessageSquare, FileText, Zap } from 'lucide-react'

interface IntegrationCard {
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    href: string
    status: 'active' | 'inactive' | 'coming-soon'
}

const integrations: IntegrationCard[] = [
    {
        title: 'E-posta',
        description: 'SMTP yapılandırması ve e-posta gönderim ayarları',
        icon: Mail,
        href: '/integrations/email/config',
        status: 'active',
    },
    {
        title: 'VatanSMS',
        description: 'SMS gönderim entegrasyonu',
        icon: MessageSquare,
        href: '/integrations/vatan-sms',
        status: 'active',
    },
    {
        title: 'BirFatura',
        description: 'E-Fatura ve E-Arşiv entegrasyonu',
        icon: FileText,
        href: '/integrations/vatan-sms',
        status: 'active',
    },
]

export default function IntegrationsIndexPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Entegrasyonlar</h1>
                <p className="text-gray-500 mt-1">
                    Üçüncü parti sistem entegrasyonlarını yönetin
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => {
                    const Icon = integration.icon
                    const isActive = integration.status === 'active'
                    const isComingSoon = integration.status === 'coming-soon'

                    const card = (
                        <div
                            className={`
                                bg-white rounded-xl border-2 p-6 transition-all
                                ${isActive
                                    ? 'border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer'
                                    : 'border-gray-200 opacity-60 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4">
                                <div
                                    className={`
                                        p-3 rounded-lg
                                        ${isActive ? 'bg-blue-50' : 'bg-gray-50'}
                                    `}
                                >
                                    <Icon
                                        className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'
                                            }`}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        {integration.title}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {integration.description}
                                    </p>
                                    {isComingSoon && (
                                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                            Yakında
                                        </span>
                                    )}
                                    {integration.status === 'inactive' && (
                                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                            Pasif
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )

                    if (isActive) {
                        return (
                            <Link key={integration.title} to={integration.href}>
                                {card}
                            </Link>
                        )
                    }

                    return <div key={integration.title}>{card}</div>
                })}

                {/* Placeholder for more integrations */}
                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center min-h-[160px]">
                    <Zap className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                        Daha fazla entegrasyon yakında eklenecek
                    </p>
                </div>
            </div>
        </div>
    )
}
