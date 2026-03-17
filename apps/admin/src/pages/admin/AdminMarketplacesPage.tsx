import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';

/**
 * AdminMarketplacesPage - Temporarily disabled
 * 
 * This page will be activated when marketplace integration features are ready.
 * The backend router is already registered in main.py.
 * To enable: regenerate API with `pnpm gen:api` after backend is running.
 */
const AdminMarketplacesPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    
    return (
        <div className={isMobile ? 'p-4 pb-safe max-w-7xl mx-auto' : 'p-6 max-w-7xl mx-auto'}>
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <ShoppingBag className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <h1 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                    Pazaryeri Entegrasyonları
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md px-4">
                    Trendyol, Hepsiburada, N11 ve Amazon mağaza yönetimi yakında aktif olacak.
                </p>
                <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Yakında Aktif
                </span>
            </div>
        </div>
    );
};

export default AdminMarketplacesPage;
