import React from 'react';
import { Monitor, ArrowLeft } from 'lucide-react';
import { MobileLayout } from './MobileLayout';
import { MobileHeader } from './MobileHeader';
import { useNavigate } from '@tanstack/react-router';

interface MobileUnsupportedPageProps {
    title: string;
    message?: string;
}

export const MobileUnsupportedPage: React.FC<MobileUnsupportedPageProps> = ({
    title,
    message = "Bu sayfa mobilde görüntülenemiyor. Lütfen masaüstü uygulamasını kullanın."
}) => {
    const navigate = useNavigate();

    return (
        <MobileLayout>
            <MobileHeader title={title} />

            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-gray-50 m-4 rounded-3xl border border-gray-100">
                <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Monitor className="h-10 w-10 text-blue-600" />
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">Masaüstü Görünümü Gerekli</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={() => navigate({ to: '/' })}
                    className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 shadow-sm w-full active:bg-gray-50 flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Ana Sayfaya Dön
                </button>
            </div>
        </MobileLayout>
    );
};
