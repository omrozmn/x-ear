import React from 'react';
import { ShoppingBag } from 'lucide-react';

/**
 * AdminMarketplacesPage - Temporarily disabled
 * 
 * This page will be activated when marketplace integration features are ready.
 * The backend router is already registered in main.py.
 * To enable: regenerate API with `pnpm gen:api` after backend is running.
 */
const AdminMarketplacesPage: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
                <ShoppingBag className="h-16 w-16 text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Pazaryeri Entegrasyonları</h1>
                <p className="text-gray-500 text-center max-w-md">
                    Trendyol, Hepsiburada, N11 ve Amazon mağaza yönetimi yakında aktif olacak.
                </p>
                <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    Yakında Aktif
                </span>
            </div>
        </div>
    );
};

export default AdminMarketplacesPage;
