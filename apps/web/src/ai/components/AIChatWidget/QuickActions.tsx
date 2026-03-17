import React from 'react';
import { UserPlus, Calendar, ShoppingCart, FileText, CreditCard, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuickActionProps {
    onAction: (message: string) => void;
}

export const QuickActions: React.FC<QuickActionProps> = ({ onAction }) => {
    const { t } = useTranslation();

    // Quick Actions Configuration
    // These map to natural language intents that the AI understands
    const actions = [
        {
            label: t('ai.quickActions.newPatient', 'Yeni Hasta'),
            icon: UserPlus,
            message: t('ai.quickActions.newPatientMsg', 'Yeni hasta oluştur'),
            color: 'bg-primary/10 text-primary border-blue-200'
        },
        {
            label: t('ai.quickActions.newSale', 'Yeni Satış'),
            icon: ShoppingCart,
            message: t('ai.quickActions.newSaleMsg', 'Yeni satış başlat'),
            color: 'bg-success/10 text-success border-green-200'
        },
        {
            label: t('ai.quickActions.appointments', 'Randevular'),
            icon: Calendar,
            message: t('ai.quickActions.appointmentsMsg', 'Bugünkü randevularımı göster'),
            color: 'bg-purple-100 text-purple-600 border-purple-200'
        },
        {
            label: t('ai.quickActions.invoices', 'Faturalar'),
            icon: FileText,
            message: t('ai.quickActions.invoicesMsg', 'Bekleyen faturaları listele'),
            color: 'bg-amber-100 text-amber-600 border-amber-200'
        },
        {
            label: t('ai.quickActions.queryDevice', 'Cihaz Sorgula'),
            icon: Box,
            message: t('ai.quickActions.queryDeviceMsg', 'Stoktaki cihazları listele'),
            color: 'bg-cyan-100 text-cyan-600 border-cyan-200'
        },
        {
            label: t('ai.quickActions.collectPayment', 'Tahsilat Yap'),
            icon: CreditCard,
            message: t('ai.quickActions.collectPaymentMsg', 'Yeni tahsilat ekle'),
            color: 'bg-emerald-100 text-emerald-600 border-emerald-200'
        }
    ];

    return (
        <div className="w-full px-2 mt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wider">{t('ai.quickActions.title', 'Hızlı İşlemler')}</p>
            <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => (
                    <button
                        data-allow-raw="true"
                        key={action.label}
                        onClick={() => onAction(action.message)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border ${action.color} bg-opacity-50 hover:bg-opacity-100 hover:shadow-sm transition-all duration-200`}
                    >
                        <action.icon size={20} className="mb-2" />
                        <span className="text-xs font-medium text-foreground">{action.label}</span>
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-center text-muted-foreground mt-4">
                {t('ai.quickActions.footer', 'veya aşağıya yazarak herhangi bir işlem yapabilirsiniz')}
            </p>
        </div>
    );
};
