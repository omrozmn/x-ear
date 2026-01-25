import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, useToastHelpers } from '@x-ear/ui-web';
import {
    useUpdatePaymentPoPaytrConfig,
    useListPaymentPoPaytrConfig
} from '@/api/client/payment-integrations.client';
import { CreditCard, Check, AlertCircle } from 'lucide-react';

type PosProvider = 'xear' | 'paytr' | 'iyzico' | 'none';

interface PosConfigForm {
    provider: PosProvider;
    merchant_id: string;
    merchant_key: string;
    merchant_salt: string;
    test_mode: boolean;
}

const PROVIDER_OPTIONS = [
    { value: 'none', label: 'Seçiniz...' },
    { value: 'xear', label: 'X-Ear POS (Önerilen)' },
    { value: 'paytr', label: 'PayTR' },
    { value: 'iyzico', label: 'İyzico' },
];

export const PosSettings = () => {
    const { register, handleSubmit, reset, watch } = useForm<PosConfigForm>({
        defaultValues: {
            provider: 'none',
            merchant_id: '',
            merchant_key: '',
            merchant_salt: '',
            test_mode: false
        }
    });
    const { success, error } = useToastHelpers();

    const updateConfigMutation = useUpdatePaymentPoPaytrConfig();
    const { data: configData, isLoading } = useListPaymentPoPaytrConfig();

    const selectedProvider = watch('provider');

    useEffect(() => {
        // Type the response structure
        interface ConfigResponse {
            data?: {
                merchant_id?: string;
                test_mode?: boolean;
            };
        }
        const config = configData as unknown as ConfigResponse | undefined;
        if (config?.data) {
            const d = config.data;
            // Determine provider
            const hasCustomConfig = d.merchant_id && d.merchant_id.trim() !== '';
            reset({
                provider: hasCustomConfig ? 'paytr' : 'xear', // Default xear if no custom config
                merchant_id: d.merchant_id || '',
                merchant_key: '',
                merchant_salt: '',
                test_mode: d.test_mode || false
            });
        }
    }, [configData, reset]);

    const onSubmit = (data: PosConfigForm) => {
        // The mutation expects a specific type, use type assertion for extended payload
        interface UpdateConfigPayload {
            enabled: boolean;
            provider: string;
            merchant_id?: string;
            merchant_key?: string;
            merchant_salt?: string;
            test_mode?: boolean;
        }

        if (data.provider === 'none') {
            error('Lütfen bir POS sağlayıcı seçin');
            return;
        }

        if (data.provider === 'xear') {
            // X-Ear POS - no credentials needed
            updateConfigMutation.mutate({
                data: {
                    enabled: true,
                    provider: 'xear'
                } as UpdateConfigPayload
            }, {
                onSuccess: () => {
                    success('POS ayarları güncellendi');
                },
                onError: (err: unknown) => {
                    const axiosError = err as { response?: { data?: { error?: string } } };
                    error(axiosError.response?.data?.error || 'Güncelleme başarısız');
                }
            });
        } else {
            // Third-party provider (PayTR, İyzico)
            if (!data.merchant_id || !data.merchant_key || !data.merchant_salt) {
                error('Lütfen tüm API bilgilerini doldurun');
                return;
            }

            updateConfigMutation.mutate({
                data: {
                    enabled: true,
                    provider: data.provider,
                    merchant_id: data.merchant_id,
                    merchant_key: data.merchant_key,
                    merchant_salt: data.merchant_salt,
                    test_mode: data.test_mode
                } as UpdateConfigPayload
            }, {
                onSuccess: () => {
                    success('POS ayarları güncellendi');
                },
                onError: (err: unknown) => {
                    const axiosError = err as { response?: { data?: { error?: string } } };
                    error(axiosError.response?.data?.error || 'Güncelleme başarısız');
                }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    const showThirdPartyConfig = selectedProvider !== 'none' && selectedProvider !== 'xear';

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Online Ödeme / POS Ayarları
                </h3>
            </div>

            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Online ödeme almak için bir POS sağlayıcı seçin. X-Ear POS kullanarak hızlıca başlayabilir veya kendi entegrasyonunuzu yapabilirsiniz.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        POS Sağlayıcı
                    </label>

                    <Select
                        {...register('provider')}
                        options={PROVIDER_OPTIONS}
                        fullWidth
                        className="h-11"
                    />

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Ödeme almak için kullanacağınız POS altyapısını seçin
                    </p>
                </div>

                {/* X-Ear POS Info Banner */}
                {selectedProvider === 'xear' && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800 dark:text-green-200">
                            <p className="font-medium mb-1">X-Ear POS Aktif</p>
                            <p>Herhangi bir API anahtarı girmenize gerek yok. Sistem otomatik olarak hazır POS altyapısını kullanacak. En düşük komisyon oranları için X-Ear POS tercih edilir.</p>
                        </div>
                    </div>
                )}

                {/* Third-Party Provider Configuration */}
                {selectedProvider !== 'none' && selectedProvider !== 'xear' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                {selectedProvider === 'paytr' && 'PayTR mağaza panelinden (merchant.paytr.com) API bilgilerinizi alabilirsiniz'}
                                {selectedProvider === 'iyzico' && 'İyzico iş yeri panelinden API ve gizli anahtarlarınızı alabilirsiniz'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mağaza No (Merchant ID)
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <Input
                                {...register('merchant_id', { required: showThirdPartyConfig })}
                                placeholder="örn: 123456"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mağaza Parola (Merchant Key)
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <Input
                                    {...register('merchant_key', { required: showThirdPartyConfig })}
                                    type="password"
                                    placeholder="Gizli anahtar"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mağaza Gizli Anahtar (Merchant Salt)
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <Input
                                    {...register('merchant_salt', { required: showThirdPartyConfig })}
                                    type="password"
                                    placeholder="Gizli tuz (salt)"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                data-allow-raw="true"
                                type="checkbox"
                                {...register('test_mode')}
                                id="test_mode"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="test_mode" className="text-sm text-gray-700 dark:text-gray-300 select-none">
                                Test Modu (Gerçek para çekilmez)
                            </label>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="submit" disabled={updateConfigMutation.isPending || selectedProvider === 'none'}>
                        {updateConfigMutation.isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
