import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const GlobalOfflineAlert: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showBackOnline, setShowBackOnline] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowBackOnline(true);

            // Re-fetch active queries when back online
            queryClient.resumePausedMutations();
            queryClient.invalidateQueries();

            // Hide "Back Internet" toast after 3 seconds
            setTimeout(() => {
                setShowBackOnline(false);
            }, 3000);
        };

        const handleOffline = () => {
            setIsOffline(true);
            setShowBackOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [queryClient]);

    if (isOffline) {
        return (
            <div className="fixed bottom-4 left-4 z-[9999] bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <WifiOff className="h-5 w-5" />
                <div>
                    <h4 className="font-semibold text-sm">İnternet Bağlantısı Yok</h4>
                    <p className="text-xs text-red-100">Değişiklikleriniz daha sonra kaydedilmek üzere sıraya alındı.</p>
                </div>
            </div>
        );
    }

    if (showBackOnline) {
        return (
            <div className="fixed bottom-4 left-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <Wifi className="h-5 w-5" />
                <div>
                    <h4 className="font-semibold text-sm">Bağlantı Kuruldu</h4>
                    <p className="text-xs text-emerald-100">Veriler senkronize ediliyor...</p>
                </div>
            </div>
        );
    }

    return null;
};
