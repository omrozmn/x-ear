import React from 'react';
import { Link } from '@tanstack/react-router';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <FileQuestion className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                    </div>
                </div>

                <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
                    404
                </h1>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Sayfa Bulunamadı
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                    Lütfen adresi kontrol edip tekrar deneyin.
                </p>

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Geri Don
                    </button>

                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Ana Sayfaya Don
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
