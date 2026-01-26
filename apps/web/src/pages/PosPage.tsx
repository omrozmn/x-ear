import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, Button, Input, useToastHelpers } from '@x-ear/ui-web';
import {
    useCreatePaymentPoPaytrInitiate,
    useCreatePoCommissionInstallmentOptions
} from '@/api/client/payments.client';
import { CreditCard, AlertTriangle, ShieldCheck, Check, TrendingDown } from 'lucide-react';

interface InitPaymentPayload {
    amount: number;
    installment_count: number;
    description: string;
    sale_id: string | null;
    party_id: string | null;
}

interface InstallmentPayload {
    amount: number;
}

interface InstallmentOption {
    installment_count: number;
    label: string;
    total: number;
    installment_amount: number;
    net_amount: number;
    gross_amount: number;
    commission_amount: number;
    commission_rate: number;
    monthly_payment: number;
}


import { useTranslation } from 'react-i18next';

export default function PosPage() {
    const { t } = useTranslation(['finance', 'common']);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [result, setResult] = useState<'success' | 'fail' | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
    const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const [, setSelectedPartyName] = useState<string>(''); // Value unused, setter used in reset
    const { success } = useToastHelpers();

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            amount: '',
            description: '',
            partyName: ''
        }
    });

    const amount = watch('amount');
    // const partyName = watch('partyName'); // Watched but not directly used
    const { mutate: initiatePayment, isPending } = useCreatePaymentPoPaytrInitiate();
    const { mutate: getInstallments, isPending: loadingInstallments } = useCreatePoCommissionInstallmentOptions();

    // Fetch installment options when amount changes
    // Fetch installment options when amount changes
    useEffect(() => {
        const numAmount = parseFloat(amount);
        if (numAmount && numAmount > 0) {
            const payload: InstallmentPayload = { amount: numAmount };
            getInstallments({ data: payload }, {
                onSuccess: (response: unknown) => {
                    const responseData = response as { data?: { options?: InstallmentOption[] } };
                    const options = responseData?.data?.options || [];
                    setInstallmentOptions(options);
                    if (options.length > 0) {
                        setSelectedInstallment(options[0].installment_count || 1);
                    }
                },
                onError: () => {
                    // Fallback to single installment
                    setInstallmentOptions([
                        {
                            installment_count: 1,
                            label: t('pos.single_installment'),
                            total: numAmount,
                            installment_amount: numAmount,
                            net_amount: numAmount,
                            gross_amount: numAmount,
                            commission_amount: 0,
                            commission_rate: 0,
                            monthly_payment: numAmount
                        }
                    ]);
                    setSelectedInstallment(1);
                }
            });
        } else {
            setInstallmentOptions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [amount, getInstallments]); // t is stable and doesn't need to be in deps

    // Iframe Message Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                if (event.data?.type === 'POS_PAYMENT_SUCCESS') {
                    setResult('success');
                    setIframeUrl(null);
                    success(t('pos.payment_success'));
                } else if (event.data?.type === 'POS_PAYMENT_FAILED') {
                    setResult('fail');
                    setErrorMessage(event.data?.message || t('pos.payment_failed'));
                    setIframeUrl(null);
                }
            } catch (e) {
                // ignore
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]); // t is stable and doesn't need to be in deps

    const onSubmit = (data: { amount: string; partyName: string; description: string }) => {
        setErrorMessage(null);
        setResult(null);

        const payload: InitPaymentPayload = {
            amount: parseFloat(data.amount),
            installment_count: selectedInstallment,
            description: `${data.partyName || 'Anonim'} - ${data.description || 'Hızlı tahsilat'}`,
            sale_id: null,
            party_id: selectedPartyId
        };

        initiatePayment({
            data: payload
        }, {
            onSuccess: (response: unknown) => {
                const responseData = response as { data: { success: boolean; iframe_url?: string; error?: string } };
                if (responseData.data.success && responseData.data.iframe_url) {
                    setIframeUrl(responseData.data.iframe_url);
                } else {
                    setErrorMessage(responseData.data.error || t('pos.payment_init_failed'));
                }
            },
            onError: (err: unknown) => {
                const error = err as { response?: { data?: { error?: string } }; message?: string };
                setErrorMessage(error.response?.data?.error || error.message || t('common.error_occurred'));
            }
        });
    };

    if (iframeUrl) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 h-screen flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('pos.secure_payment_title')}</h2>
                    <Button variant="ghost" onClick={() => setIframeUrl(null)}>{t('pos.cancel_return')}</Button>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative">
                    <iframe
                        src={iframeUrl}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        scrolling="yes"
                        id="paytriframe"
                    />
                </div>
            </div>
        );
    }

    const selectedOption = installmentOptions.find(opt => opt.installment_count === selectedInstallment);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                    {t('pos.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {t('pos.description')}
                </p>
            </div>

            {result === 'success' && (
                <div className="mb-6 bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800 p-4 rounded-lg flex items-center gap-3 text-green-800 dark:text-green-300">
                    <ShieldCheck className="w-6 h-6" />
                    <div>
                        <p className="font-bold">{t('pos.payment_success_title')}</p>
                        <p className="text-sm">{t('pos.payment_success_desc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/50" onClick={() => {
                        setResult(null);
                        setValue('amount', '');
                        setValue('description', '');
                        setValue('partyName', '');
                        setSelectedPartyId(null);
                        setSelectedPartyName('');
                        setInstallmentOptions([]);
                    }}>
                        {t('pos.new_transaction')}
                    </Button>
                </div>
            )}

            {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 p-4 rounded-lg flex items-center gap-3 text-red-800 dark:text-red-300">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                        <p className="font-bold">{t('pos.error_title')}</p>
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payment Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('pos.customer_name_optional')}
                                    </label>
                                    <Input
                                        {...register('partyName')}
                                        placeholder={t('pos.customer_name_placeholder')}
                                        className="h-11 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('pos.customer_name_help')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('pos.note_desc')}
                                    </label>
                                    <Input
                                        {...register('description')}
                                        placeholder={t('pos.note_placeholder')}
                                        className="h-11 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center">
                                <label className="text-blue-800 dark:text-blue-300 text-sm font-medium mb-2">
                                    {t('pos.amount_label')}
                                </label>
                                <div className="relative w-full max-w-xs">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-blue-900 dark:text-blue-200">₺</span>
                                    <input
                                        data-allow-raw="true"
                                        type="number"
                                        step="0.01"
                                        {...register('amount', {
                                            required: t('pos.amount_required'),
                                            min: { value: 1, message: t('pos.amount_min') }
                                        })}
                                        className="w-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg py-3 pl-10 pr-4 text-2xl font-bold text-blue-900 dark:text-blue-100 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-400 dark:focus:border-blue-500 outline-none text-center transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                {errors.amount && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.amount.message as string}</p>}
                            </div>

                            {/* Installment Options */}
                            {installmentOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        {t('pos.installment_options')}
                                    </label>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {installmentOptions.map((option) => (
                                            <button
                                                data-allow-raw="true"
                                                key={option.installment_count}
                                                type="button"
                                                onClick={() => setSelectedInstallment(option.installment_count)}
                                                className={`relative p-4 rounded-lg border-2 transition-all text-left ${selectedInstallment === option.installment_count
                                                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800'
                                                    }`}
                                            >
                                                {selectedInstallment === option.installment_count && (
                                                    <div className="absolute top-2 right-2">
                                                        <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                )}

                                                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {option.label}
                                                </div>

                                                {option.installment_count > 1 && option.monthly_payment && (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                        {option.monthly_payment?.toFixed(2)} ₺ x {option.installment_count}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    <TrendingDown className="w-3 h-3" />
                                                    {t('pos.commission')}: %{option.commission_rate}
                                                </div>

                                                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    →{option.net_amount?.toFixed(2) ?? '0.00'} ₺
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {loadingInstallments && (
                                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            {t('pos.calculating')}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Summary Box */}
                            {selectedOption && (
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border-2 border-green-200 dark:border-green-800">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('pos.summary_title')}</div>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">{t('pos.collected_from_customer')}:</div>
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                {selectedOption.gross_amount?.toFixed(2) ?? '0.00'} ₺
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">{t('pos.commission')}:</div>
                                            <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                                -{selectedOption.commission_amount?.toFixed(2) ?? '0.00'} ₺
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-green-300 dark:border-green-700 my-3"></div>
                                    <div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{t('pos.net_to_account')}:</div>
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {selectedOption.net_amount?.toFixed(2) ?? '0.00'} ₺
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-medium shadow-lg shadow-blue-200 dark:shadow-none"
                                disabled={isPending || !amount || !installmentOptions.length}
                            >
                                {isPending ? t('pos.starting') : t('pos.start_payment_btn')}
                            </Button>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                <ShieldCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
                                <span>{t('pos.ssl_secure')}</span>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">{t('pos.info_title')}</h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            {t('pos.info_desc')}
                        </p>
                    </div>

                    {selectedOption && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100 mb-2">{t('pos.commission_detail_title')}</h3>
                            <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                                <div className="flex justify-between">
                                    <span>{t('pos.rate')}:</span>
                                    <span className="font-semibold">%{selectedOption.commission_rate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('pos.amount')}:</span>
                                    <span className="font-semibold">{selectedOption.commission_amount?.toFixed(2) ?? '0.00'} ₺</span>
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-300 mt-2">
                                    {t('pos.commission_note')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
