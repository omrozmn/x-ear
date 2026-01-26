import React, { useState, useEffect } from 'react';
import {
    Button,
    Select,
    Alert,
    Loading
} from '@x-ear/ui-web';
import { useCreatePaymentPoPaytrInitiate } from '@/api/client/payments.client';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation(['finance', 'common']);
    const [installmentCount, setInstallmentCount] = useState(1);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { mutate: initiatePayment, isPending } = useCreatePaymentPoPaytrInitiate();

    // Listen for messages from the iframe (success/fail)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate origin if needed

            if (event.data?.type === 'POS_PAYMENT_SUCCESS') {
                onSuccess();
            } else if (event.data?.type === 'POS_PAYMENT_FAILED') {
                setError(event.data?.message || t('pos.payment_failed'));
                setIframeUrl(null); // Return to form
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onSuccess]); // t is stable and doesn't need to be in deps

    const handleStartPayment = () => {
        setError(null);
        initiatePayment({
            data: {
                sale_id: saleId,
                amount: amount,
                installment_count: installmentCount
            }
        }, {
            onSuccess: (response: unknown) => {
                const res = response as { iframe_url?: string; error?: string };
                // Response structure: { iframe_url, payment_record_id } or { error }
                if (res?.iframe_url) {
                    setIframeUrl(res.iframe_url);
                } else {
                    setError(res?.error || t('pos.payment_init_failed'));
                }
            },
            onError: (err: unknown) => {
                const errorObj = err as { message?: string };
                setError(errorObj.message || t('common.error_occurred'));
            }
        });
    };

    if (iframeUrl) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="mb-2 flex justify-between items-center">
                    <h3 className="text-lg font-medium">{t('pos.secure_payment_screen')}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIframeUrl(null)}>{t('pos.return')}</Button>
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
                <div className="text-gray-500 text-sm uppercase tracking-wide mb-2">{t('pos.amount_to_pay')}</div>
                <div className="text-4xl font-bold text-blue-600">
                    {amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('pos.installment_options')}</label>
                <Select
                    value={installmentCount.toString()}
                    onChange={(e) => setInstallmentCount(Number(e.target.value))}
                    options={[
                        { value: '1', label: t('pos.single_installment') },
                        { value: '2', label: t('pos.x_installments', { count: 2 }) },
                        { value: '3', label: t('pos.x_installments', { count: 3 }) },
                        { value: '6', label: t('pos.x_installments', { count: 6 }) },
                        { value: '9', label: t('pos.x_installments', { count: 9 }) },
                        { value: '12', label: t('pos.x_installments', { count: 12 }) }
                    ]}
                />
                {installmentCount > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                        {t('pos.installment_warning')}
                    </p>
                )}
            </div>

            <div className="pt-4">
                <Button
                    className="w-full h-12 text-lg"
                    onClick={handleStartPayment}
                    disabled={isPending}
                >
                    {isPending ? <><Loading className="w-5 h-5 mr-2" /> {t('pos.starting')}</> : t('pos.pay_btn')}
                </Button>
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {t('pos.ssl_secure_short')}
                </p>
            </div>
        </div>
    );
};
