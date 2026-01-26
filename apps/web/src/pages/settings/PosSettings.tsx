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

import { useTranslation } from 'react-i18next';

export const PosSettings = () => {
    const { t } = useTranslation(['settings', 'common']);
    const PROVIDER_OPTIONS = [
        { value: 'none', label: t('pos.providers.none') },
        { value: 'xear', label: t('pos.providers.xear') },
        { value: 'paytr', label: t('pos.providers.paytr') },
        { value: 'iyzico', label: t('pos.providers.iyzico') },
    ];
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
            error(t('pos.messages.select_provider'));
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
                    success(t('pos.messages.success'));
                },
                onError: (err: unknown) => {
                    const axiosError = err as { response?: { data?: { error?: string } } };
                    error(axiosError.response?.data?.error || t('pos.messages.error'));
                }
            });
        } else {
            // Third-party provider (PayTR, İyzico)
            if (!data.merchant_id || !data.merchant_key || !data.merchant_salt) {
                error(t('pos.messages.fill_all_fields'));
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
                    success(t('pos.messages.success'));
                },
                onError: (err: unknown) => {
                    const axiosError = err as { response?: { data?: { error?: string } } };
                    error(axiosError.response?.data?.error || t('pos.messages.error'));
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
                    {t('pos.title')}
                </h3>
            </div>

            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                {t('pos.description')}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('pos.provider_label')}
                    </label>

                    <Select
                        {...register('provider')}
                        options={PROVIDER_OPTIONS}
                        fullWidth
                        className="h-11"
                    />

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('pos.provider_help')}
                    </p>
                </div>

                {/* X-Ear POS Info Banner */}
                {selectedProvider === 'xear' && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800 dark:text-green-200">
                            <p className="font-medium mb-1">{t('pos.xear_active.title')}</p>
                            <p>{t('pos.xear_active.description')}</p>
                        </div>
                    </div>
                )}

                {/* Third-Party Provider Configuration */}
                {selectedProvider !== 'none' && selectedProvider !== 'xear' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                {selectedProvider === 'paytr' && t('pos.config.paytr_desc')}
                                {selectedProvider === 'iyzico' && t('pos.config.iyzico_desc')}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.config.merchant_id')}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <Input
                                {...register('merchant_id', { required: showThirdPartyConfig })}
                                placeholder={t('pos.config.merchant_id_placeholder')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('pos.config.merchant_key')}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <Input
                                    {...register('merchant_key', { required: showThirdPartyConfig })}
                                    type="password"
                                    placeholder={t('pos.config.merchant_key_placeholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('pos.config.merchant_salt')}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <Input
                                    {...register('merchant_salt', { required: showThirdPartyConfig })}
                                    type="password"
                                    placeholder={t('pos.config.merchant_salt_placeholder')}
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
                                {t('pos.config.test_mode')}
                            </label>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="submit" disabled={updateConfigMutation.isPending || selectedProvider === 'none'}>
                        {updateConfigMutation.isPending ? t('pos.config.saving') : t('pos.config.save_btn')}
                    </Button>
                </div>
            </form>
        </div>
    );
};
