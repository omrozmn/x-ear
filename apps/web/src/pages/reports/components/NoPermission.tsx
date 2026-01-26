import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function NoPermission() {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Yetkiniz Yok</h3>
            <p className="text-gray-500 text-center max-w-md">
                Bu sayfayı görüntülemek için gerekli izinlere sahip değilsiniz.
                Yöneticinizle iletişime geçin.
            </p>
        </div>
    );
}
