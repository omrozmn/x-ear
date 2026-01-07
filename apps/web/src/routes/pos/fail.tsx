
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
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 dark:bg-red-900/10">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="text-red-500 text-5xl mb-4">✕</div>
                <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Ödeme Başarısız</h1>
                <p className="text-gray-600 dark:text-gray-300">{reason}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Lütfen tekrar deneyiniz.</p>
            </div>
        </div>
    );
}
