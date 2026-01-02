import React, { useState, useEffect } from 'react';
import {
    Button,
    Select,
    Alert,
    Loading
} from '@x-ear/ui-web';
import { usePaymentIntegrationsInitiatePaytrPayment } from '@/api/generated';

interface PosPaymentFormProps {
    saleId: string;
    amount: number;
    onSuccess: () => void;
}

export const PosPaymentForm: React.FC<PosPaymentFormProps> = ({
    saleId,
    amount,
    onSuccess
}) => {
    const [installmentCount, setInstallmentCount] = useState(1);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { mutate: initiatePayment, isPending } = usePaymentIntegrationsInitiatePaytrPayment();

    // Listen for messages from the iframe (success/fail)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate origin if needed

            if (event.data?.type === 'POS_PAYMENT_SUCCESS') {
                onSuccess();
            } else if (event.data?.type === 'POS_PAYMENT_FAILED') {
                setError(event.data?.message || 'Ödeme işlemi başarısız oldu.');
                setIframeUrl(null); // Return to form
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSuccess]);

    const handleStartPayment = () => {
        setError(null);
        initiatePayment({
            data: {
                sale_id: saleId,
                amount: amount,
                installment_count: installmentCount
            }
        }, {
            onSuccess: (response: any) => {
                // Response structure: { iframe_url, payment_record_id } or { error }
                if (response?.iframe_url) {
                    setIframeUrl(response.iframe_url);
                } else {
                    setError(response?.error || 'Ödeme başlatılamadı');
                }
            },
            onError: (err: any) => {
                setError(err.message || 'Bir hata oluştu');
            }
        });
    };

    if (iframeUrl) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="mb-2 flex justify-between items-center">
                    <h3 className="text-lg font-medium">Güvenli Ödeme Ekranı</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIframeUrl(null)}>Geri Dön</Button>
                </div>
                <div className="flex-1 min-h-[500px] border rounded-lg overflow-hidden bg-gray-50 relative">
                    <iframe
                        src={iframeUrl}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        scrolling="yes"
                        id="paytriframe"
                    ></iframe>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-md mx-auto py-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="text-center pt-4 pb-6 border-b border-gray-100">
                <div className="text-gray-500 text-sm uppercase tracking-wide mb-2">Ödenecek Tutar</div>
                <div className="text-4xl font-bold text-blue-600">
                    {amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Taksit Seçenekleri</label>
                <Select
                    value={installmentCount.toString()}
                    onChange={(e) => setInstallmentCount(Number(e.target.value))}
                    options={[
                        { value: '1', label: 'Tek Çekim' },
                        { value: '2', label: '2 Taksit' },
                        { value: '3', label: '3 Taksit' },
                        { value: '6', label: '6 Taksit' },
                        { value: '9', label: '9 Taksit' },
                        { value: '12', label: '12 Taksit' }
                    ]}
                />
                {installmentCount > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                        * Taksitli işlemlerde bankanız vade farkı uygulayabilir.
                    </p>
                )}
            </div>

            <div className="pt-4">
                <Button
                    className="w-full h-12 text-lg"
                    onClick={handleStartPayment}
                    disabled={isPending}
                >
                    {isPending ? <><Loading className="w-5 h-5 mr-2" /> Başlatılıyor...</> : 'Ödemeye Geç'}
                </Button>
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    256-bit SSL ile güvenli ödeme
                </p>
            </div>
        </div>
    );
};
