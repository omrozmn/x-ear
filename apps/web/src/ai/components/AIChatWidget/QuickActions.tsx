import React from 'react';
import { UserPlus, Calendar, ShoppingCart, FileText, CreditCard, Box } from 'lucide-react';

interface QuickActionProps {
    onAction: (message: string) => void;
}

export const QuickActions: React.FC<QuickActionProps> = ({ onAction }) => {

    // Quick Actions Configuration
    // These map to natural language intents that the AI understands
    const actions = [
        {
            label: 'Yeni Hasta',
            icon: UserPlus,
            message: 'Yeni hasta oluştur',
            color: 'bg-blue-100 text-blue-600 border-blue-200'
        },
        {
            label: 'Yeni Satış',
            icon: ShoppingCart,
            message: 'Yeni satış başlat',
            color: 'bg-green-100 text-green-600 border-green-200'
        },
        {
            label: 'Randevular',
            icon: Calendar,
            message: 'Bugünkü randevularımı göster',
            color: 'bg-purple-100 text-purple-600 border-purple-200'
        },
        {
            label: 'Faturalar',
            icon: FileText,
            message: 'Bekleyen faturaları listele',
            color: 'bg-amber-100 text-amber-600 border-amber-200'
        },
        {
            label: 'Cihaz Sorgula',
            icon: Box,
            message: 'Stoktaki cihazları listele',
            color: 'bg-cyan-100 text-cyan-600 border-cyan-200'
        },
        {
            label: 'Tahsilat Yap',
            icon: CreditCard,
            message: 'Yeni tahsilat ekle',
            color: 'bg-emerald-100 text-emerald-600 border-emerald-200'
        }
    ];

    return (
        <div className="w-full px-2 mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 px-1 uppercase tracking-wider">Hızlı İşlemler</p>
            <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => (
                    <button
                        data-allow-raw="true"
                        key={action.label}
                        onClick={() => onAction(action.message)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border ${action.color} bg-opacity-50 hover:bg-opacity-100 hover:shadow-sm transition-all duration-200`}
                    >
                        <action.icon size={20} className="mb-2" />
                        <span className="text-xs font-medium text-gray-900">{action.label}</span>
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-center text-gray-400 mt-4">
                veya aşağıya yazarak herhangi bir işlem yapabilirsiniz
            </p>
        </div>
    );
};
