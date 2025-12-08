
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
        <div className="flex flex-col items-center justify-center h-screen bg-green-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h1 className="text-2xl font-bold text-green-700 mb-2">Ödeme Başarılı</h1>
                <p className="text-gray-600">Ödemeniz başarıyla alınmıştır.</p>
                <p className="text-sm text-gray-500 mt-4">Pencere otomatik olarak kapanacaktır.</p>
            </div>
        </div>
    );
}
