import React from 'react';
import { Link } from '@tanstack/react-router';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

const Unauthorized: React.FC = () => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <ShieldX className="h-16 w-16 text-red-600 dark:text-red-400" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Erişim Yetkisi Yok
                </h1>
                
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Bu sayfaya erişim izniniz bulunmamaktadır. 
                    Yetkiniz olduğunu düşünüyorsanız lütfen yöneticinizle iletişime geçin.
                </p>
                
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Geri Dön
                    </button>
                    
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Ana Sayfa
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
