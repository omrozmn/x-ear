import React, { useState } from 'react';
import { User, Lock, ChevronRight, LogOut, Settings, HelpCircle, Phone, Mail } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useAuthStore } from '@/stores/authStore';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// Sub-components would be imported here or defined in same file for now to keep context
// For brevity, I'll implement a simple View stack

type View = 'main' | 'personal' | 'security' | 'settings';

export const MobileProfilePage: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('main');
    const { user, logout } = useAuthStore();
    const { triggerSelection } = useHaptic();

    const menuItems = [
        {
            id: 'personal',
            label: 'Kişisel Bilgiler',
            icon: <User className="h-5 w-5" />,
            color: 'bg-blue-100 text-blue-600',
            desc: 'Ad, soyad, e-posta'
        },
        {
            id: 'security',
            label: 'Güvenlik',
            icon: <Lock className="h-5 w-5" />,
            color: 'bg-orange-100 text-orange-600',
            desc: 'Şifre değiştir'
        },
        {
            id: 'settings',
            label: 'Uygulama Ayarları',
            icon: <Settings className="h-5 w-5" />,
            color: 'bg-gray-100 text-gray-600',
            desc: 'Bildirimler, tema'
        },
        {
            id: 'help',
            label: 'Yardım & Destek',
            icon: <HelpCircle className="h-5 w-5" />,
            color: 'bg-purple-100 text-purple-600',
            desc: 'SSS, iletişim'
        }
    ];

    const handleLogout = () => {
        triggerSelection();
        if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            logout();
            window.location.href = '/login';
        }
    };

    const renderMainView = () => (
        <>
            <MobileHeader title="Profil" showBack={false} />

            <div className="p-4 space-y-6">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center mb-4 text-primary-600">
                        <span className="text-2xl font-bold">
                            {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Kullanıcı'}</h2>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <div className="mt-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        {user?.role || 'Kullanıcı'}
                    </div>
                </div>

                {/* Menu */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {menuItems.map((item, idx) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                triggerSelection();
                                if (item.id !== 'help') setCurrentView(item.id as View);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors",
                                idx !== menuItems.length - 1 && "border-b border-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-xl", item.color)}>
                                    {item.icon}
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">{item.label}</p>
                                    {item.desc && <p className="text-xs text-gray-400">{item.desc}</p>}
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300" />
                        </button>
                    ))}
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center justify-center gap-2 text-red-600 font-medium active:bg-red-50 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Çıkış Yap
                </button>

                <p className="text-center text-xs text-gray-400 py-4">
                    Versiyon 1.0.0 (Build 2024.1)
                </p>
            </div>
        </>
    );

    const renderPersonalView = () => (
        <>
            <MobileHeader title="Kişisel Bilgiler" onBack={() => setCurrentView('main')} />
            <div className="p-4 bg-gray-50 min-h-screen">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Ad Soyad</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm">{user?.name}</div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">E-posta</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user?.email}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Telefon</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {user?.phone || 'Tanımlı değil'}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => toast.success('Bu özellik yakında eklenecek')}
                            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm active:bg-primary-700"
                        >
                            Bilgileri Güncelle
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    const renderSecurityView = () => (
        <>
            <MobileHeader title="Güvenlik" onBack={() => setCurrentView('main')} />
            <div className="p-4 bg-gray-50 min-h-screen">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                    <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-2">Şifre Değiştir</h3>
                    {/* Simple inputs just for visual placeholder */}
                    <div>
                        <input type="password" placeholder="Mevcut Şifre" className="w-full p-3 bg-gray-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <input type="password" placeholder="Yeni Şifre" className="w-full p-3 bg-gray-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <input type="password" placeholder="Yeni Şifre (Tekrar)" className="w-full p-3 bg-gray-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <button className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm active:bg-primary-700 mt-2">
                        Şifreyi Güncelle
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <MobileLayout>
            {currentView === 'main' && renderMainView()}
            {currentView === 'personal' && renderPersonalView()}
            {currentView === 'security' && renderSecurityView()}
            {currentView === 'settings' && (
                <>
                    <MobileHeader title="Ayarlar" onBack={() => setCurrentView('main')} />
                    <div className="p-8 text-center text-gray-500">
                        <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        Uygulama ayarları yakında eklenecek.
                    </div>
                </>
            )}
        </MobileLayout>
    );
};
