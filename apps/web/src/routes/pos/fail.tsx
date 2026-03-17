
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/pos/fail')({
    component: PosFail,
});

function PosFail() {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('fail_reason') || 'Ödeme işlemi tamamlanamadı.';

    useEffect(() => {
        // Notify parent window (iframe container)
        window.parent.postMessage({
            type: 'POS_PAYMENT_FAILED',
            message: reason
        }, '*');
    }, [reason]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-destructive/10">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <div className="text-destructive text-5xl mb-4">✕</div>
                <h1 className="text-2xl font-bold text-destructive mb-2">Ödeme Başarısız</h1>
                <p className="text-muted-foreground">{reason}</p>
                <p className="text-sm text-muted-foreground mt-4">Lütfen tekrar deneyiniz.</p>
            </div>
        </div>
    );
}
