
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/pos/success')({
    component: PosSuccess,
});

function PosSuccess() {
    useEffect(() => {
        // Notify parent window (iframe container)
        window.parent.postMessage({ type: 'POS_PAYMENT_SUCCESS' }, '*');
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-success/10">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <div className="text-success text-5xl mb-4">✓</div>
                <h1 className="text-2xl font-bold text-success mb-2">Ödeme Başarılı</h1>
                <p className="text-muted-foreground">Ödemeniz başarıyla alınmıştır.</p>
                <p className="text-sm text-muted-foreground mt-4">Pencere otomatik olarak kapanacaktır.</p>
            </div>
        </div>
    );
}
