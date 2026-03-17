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

            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-muted m-4 rounded-3xl border border-border">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Monitor className="h-10 w-10 text-primary" />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2">Masaüstü Görünümü Gerekli</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                    {message}
                </p>

                <button
                    data-allow-raw="true"
                    onClick={() => navigate({ to: '/' })}
                    className="px-6 py-3 bg-card text-foreground font-medium rounded-xl border border-border shadow-sm w-full active:bg-muted flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Ana Sayfaya Dön
                </button>
            </div>
        </MobileLayout>
    );
};
