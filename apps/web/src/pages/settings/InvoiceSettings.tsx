import { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, AlertCircle, Hash, Key, Eye, EyeOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button, Input, Select, useToastHelpers } from '@x-ear/ui-web';
import { useAuthStore } from '@/stores/authStore';
import { useGetCurrentTenant, useUpdateTenantSettings } from '@/api/generated';
import { GOVERNMENT_EXEMPTION_REASONS } from '@/constants/governmentInvoiceConstants';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/orval-mutator';

// Type definitions for tenant settings structure
interface InvoiceIntegrationSettings {
    useManualNumbering?: boolean;
    invoicePrefix?: string;
    invoicePrefixes?: string[];
    defaultSenderTag?: string;
    apiKey?: string;
    secretKey?: string;
    // Legacy snake_case support
    use_manual_numbering?: boolean;
    invoice_prefix?: string;
    invoice_prefixes?: string[];
    default_sender_tag?: string;
    api_key?: string;
    secret_key?: string;
}

interface TenantSettings {
    invoiceIntegration?: InvoiceIntegrationSettings;
    // Legacy snake_case support
    invoice_integration?: InvoiceIntegrationSettings;
    [key: string]: unknown;
}

interface CompanyInfo {
    defaultExemptionCode?: string;
    [key: string]: unknown;
}

type CurrentTenantQueryData = {
    data?: {
        settings?: TenantSettings;
        companyInfo?: CompanyInfo;
        [key: string]: unknown;
    };
};

export function InvoiceSettings() {
    const [defaultPrefix, setDefaultPrefix] = useState('XER');
    const [additionalPrefixes, setAdditionalPrefixes] = useState<string[]>([]);
    const [defaultExemptionCode, setDefaultExemptionCode] = useState('');
    const [senderTags, setSenderTags] = useState<Array<{ value: string; label: string; type?: string }>>([]);
    const [senderTagsLoading, setSenderTagsLoading] = useState(false);
    const [defaultSenderTag, setDefaultSenderTag] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
    const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const isTenantAdmin = user?.role === 'tenant_admin' || user?.isImpersonatingTenant === true;

    // Fetch current tenant settings
    const { data: tenantData, isLoading: loading } = useGetCurrentTenant();
    const updateMutation = useUpdateTenantSettings({
        mutation: {
            onSuccess: (data) => {
                // Update query cache with new data (optimistic update)
                queryClient.setQueryData(['getCurrentTenant'], data);
                console.log('✅ Mutation successful, cache updated:', data);
            }
        }
    });

    // Load settings when data arrives
    useEffect(() => {
        console.log('📥 useEffect triggered, tenantData:', tenantData);
        
        if (tenantData?.data) {
            // tenantData is ResponseEnvelope, so tenantData.data is the actual tenant object
            const tenant = tenantData.data;
            const settings = (tenant.settings as TenantSettings) || {};
            const companyInfo = (tenant.companyInfo as CompanyInfo) || {};
            // Backend returns camelCase (invoiceIntegration), not snake_case
            const invoiceSettings = (settings.invoiceIntegration || settings.invoice_integration) as InvoiceIntegrationSettings | undefined || {};

            console.log('📋 Tenant object:', tenant);
            console.log('📋 Settings:', settings);
            console.log('📋 Invoice settings from server:', invoiceSettings);

            // Generate default prefix from company name if not set
            let prefix = invoiceSettings.invoicePrefix || invoiceSettings.invoice_prefix;
            if (!prefix) {
                // Get first 3 characters of company name, uppercase, A-Z only
                const companyName = tenant.name || 'XER';
                prefix = companyName
                    .toUpperCase()
                    .replace(/[^A-Z]/g, '') // Remove non-letters
                    .slice(0, 3)
                    .padEnd(3, 'X'); // Pad with X if less than 3 chars
                
                console.log('🔧 Generated prefix from company name:', companyName, '→', prefix);
            }
            
            setDefaultPrefix(prefix);
            setDefaultExemptionCode(companyInfo.defaultExemptionCode || '');
            setDefaultSenderTag(invoiceSettings.defaultSenderTag || invoiceSettings.default_sender_tag || '');
            setApiKey(invoiceSettings.apiKey || invoiceSettings.api_key || '');
            setSecretKey(invoiceSettings.secretKey || invoiceSettings.secret_key || '');

            // Load additional prefixes (excluding default)
            const allPrefixes = invoiceSettings.invoicePrefixes || invoiceSettings.invoice_prefixes || [];
            const additional = Array.isArray(allPrefixes) 
                ? allPrefixes.filter((p: string) => p !== prefix)
                : [];
            
            console.log('📌 Setting state:', {
                defaultPrefix: prefix,
                additionalPrefixes: additional,
                allPrefixesFromServer: allPrefixes
            });
            
            setAdditionalPrefixes(additional);
        }
    }, [tenantData]);

    useEffect(() => {
        let isMounted = true;
        const loadSenderTags = async () => {
            setSenderTagsLoading(true);
            try {
                const response = await apiClient.get<{ data?: Array<{ value: string; label: string; type?: string }> }>('/api/birfatura/sender-tags');
                if (!isMounted) return;
                setSenderTags(response.data?.data ?? []);
            } catch (error) {
                console.error('❌ Failed to load sender tags:', error);
                if (isMounted) {
                    setSenderTags([]);
                }
            } finally {
                if (isMounted) {
                    setSenderTagsLoading(false);
                }
            }
        };
        void loadSenderTags();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSync = async () => {
        if (!apiKey || !secretKey) {
            showErrorToast('Senkronizasyon için API Key ve Secret Key gereklidir');
            return;
        }
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await apiClient.post<{ data?: { incoming?: number; outgoing?: number; duplicates?: number; synced_count?: number } }>('/api/birfatura/sync-invoices', {});
            const incoming = res.data?.data?.incoming ?? 0;
            const outgoing = res.data?.data?.outgoing ?? 0;
            // Backfill details in background (non-blocking)
            apiClient.post('/api/birfatura/backfill-invoice-items', {}).catch(() => {});
            apiClient.post('/api/birfatura/backfill-outgoing-detail', {}).catch(() => {});
            
            const total = incoming + outgoing;
            setSyncResult({ success: true, message: `${total} fatura senkronize edildi (${incoming} gelen, ${outgoing} giden)` });
            showSuccessToast(`Senkronizasyon tamamlandı: ${total} fatura`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Senkronizasyon başarısız';
            setSyncResult({ success: false, message: msg });
            showErrorToast(msg);
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        if (!isTenantAdmin) {
            showErrorToast('Sadece Tenant Admin ayarları değiştirebilir');
            return;
        }

        console.log('=== SAVE START ===');
        console.log('defaultPrefix:', defaultPrefix);
        console.log('additionalPrefixes:', additionalPrefixes);
        console.log('defaultExemptionCode:', defaultExemptionCode);

        // Validate prefixes according to GİB rules
        // Filter out empty strings BEFORE validation
        const allPrefixes = [defaultPrefix, ...additionalPrefixes]
            .map(p => p.trim())
            .filter(p => p.length > 0);
        
        console.log('allPrefixes (after filter):', allPrefixes);
        
        // Check for duplicates
        const uniquePrefixes = [...new Set(allPrefixes)];
        if (allPrefixes.length !== uniquePrefixes.length) {
            showErrorToast('Ön ekler benzersiz olmalıdır');
            return;
        }

        // Validate each prefix
        for (const prefix of uniquePrefixes) {
            // Must be exactly 3 characters
            if (prefix.length !== 3) {
                console.error('Validation failed: length', prefix, prefix.length);
                showErrorToast(`Ön ek tam 3 karakter olmalıdır: "${prefix}" (${prefix.length} karakter)`);
                return;
            }
            
            // Must contain only A-Z and 0-9
            if (!/^[A-Z0-9]{3}$/.test(prefix)) {
                console.error('Validation failed: format', prefix);
                showErrorToast(`Ön ek sadece büyük harf (A-Z) ve rakam (0-9) içerebilir: "${prefix}"`);
                return;
            }
        }

        try {
            const payload = {
                settings: {
                    invoice_integration: {
                        use_manual_numbering: true,
                        invoice_prefix: defaultPrefix,
                        invoice_prefixes: uniquePrefixes,
                        default_sender_tag: defaultSenderTag || undefined,
                        api_key: apiKey || undefined,
                        secret_key: secretKey || undefined,
                    },
                },
                companyInfo: {
                    defaultExemptionCode: defaultExemptionCode,
                },
            };

            console.log('💾 Saving payload:', JSON.stringify(payload, null, 2));
            
            // Optimistic update - update UI immediately
            const currentData = queryClient.getQueryData<CurrentTenantQueryData>(['getCurrentTenant']);
            if (currentData) {
                const optimisticData = {
                    ...currentData,
                    data: {
                        ...(currentData.data || {}),
                        settings: {
                            ...(currentData.data?.settings || {}),
                            invoiceIntegration: {
                                useManualNumbering: true,
                                invoicePrefix: defaultPrefix,
                                invoicePrefixes: uniquePrefixes,
                                defaultSenderTag: defaultSenderTag || undefined,
                                apiKey: apiKey || undefined,
                                secretKey: secretKey || undefined,
                            },
                        },
                        companyInfo: {
                            ...(currentData.data?.companyInfo || {}),
                            defaultExemptionCode: defaultExemptionCode,
                        },
                    },
                };
                queryClient.setQueryData(['getCurrentTenant'], optimisticData);
                console.log('✨ Optimistic update applied');
            }
            
            const result = await updateMutation.mutateAsync({ data: payload });
            
            console.log('✅ Save successful, result:', result);
            console.log('✅ Result data:', result?.data);
            console.log('✅ Result companyInfo:', result?.data?.companyInfo);
            console.log('✅ Result settings:', result?.data?.settings);
            
            // Update local state from server response to ensure consistency
            if (result?.data) {
                const tenant = result.data;
                const savedSettings = (tenant.settings?.invoiceIntegration || tenant.settings?.invoice_integration) as InvoiceIntegrationSettings | undefined;
                const savedCompanyInfo = tenant.companyInfo as CompanyInfo | undefined;
                
                console.log('📦 Saved settings from response:', savedSettings);
                console.log('📦 Saved companyInfo from response:', savedCompanyInfo);
                
                if (savedSettings) {
                    const savedPrefix = savedSettings.invoicePrefix || savedSettings.invoice_prefix || defaultPrefix;
                    setDefaultPrefix(savedPrefix);
                    setDefaultSenderTag(savedSettings.defaultSenderTag || savedSettings.default_sender_tag || '');
                    setApiKey(savedSettings.apiKey || savedSettings.api_key || '');
                    setSecretKey(savedSettings.secretKey || savedSettings.secret_key || '');
                    
                    const savedPrefixes = savedSettings.invoicePrefixes || savedSettings.invoice_prefixes || [];
                    const additional = savedPrefixes.filter((p: string) => p !== savedPrefix);
                    setAdditionalPrefixes(additional);
                    
                    console.log('✅ State updated from server:', {
                        defaultPrefix: savedPrefix,
                        additionalPrefixes: additional,
                        allPrefixesFromServer: savedPrefixes
                    });
                }
                
                if (savedCompanyInfo) {
                    const savedExemptionCode = savedCompanyInfo.defaultExemptionCode || '';
                    setDefaultExemptionCode(savedExemptionCode);
                    console.log('✅ Exemption code updated from server:', savedExemptionCode);
                }
            }
            
            showSuccessToast('Fatura ayarları kaydedildi');
        } catch (error) {
            console.error('❌ Failed to save invoice settings:', error);
            // Rollback optimistic update on error
            queryClient.invalidateQueries({ queryKey: ['getCurrentTenant'] });
            showErrorToast('Kaydetme başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
        }
    };

    const handleAddPrefix = () => {
        if (!isTenantAdmin) {
            showErrorToast('Sadece Tenant Admin ön ek ekleyebilir');
            return;
        }
        console.log('➕ Adding new prefix field');
        setAdditionalPrefixes([...additionalPrefixes, '']);
    };

    const handleRemovePrefix = (index: number) => {
        if (!isTenantAdmin) {
            showErrorToast('Sadece Tenant Admin ön ek silebilir');
            return;
        }
        console.log('➖ Removing prefix at index:', index);
        setAdditionalPrefixes(additionalPrefixes.filter((_, i) => i !== index));
    };

    const handlePrefixChange = (index: number, value: string) => {
        const updated = [...additionalPrefixes];
        updated[index] = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
        console.log('✏️ Prefix changed at index', index, ':', value, '→', updated[index]);
        setAdditionalPrefixes(updated);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!isTenantAdmin && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Fatura ayarlarını sadece Tenant Admin düzenleyebilir. Sadece görüntüleme modundasınız.
                    </p>
                </div>
            )}

            {/* BirFatura API Bilgileri */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            E-Fatura API Bilgileri
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            E-Fatura entegrasyon sağlayıcınızdan aldığınız API ve Secret anahtarlarını girin
                        </p>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={updateMutation.isPending || !isTenantAdmin} 
                        className="flex items-center gap-2"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API Key
                        </label>
                        <div className="relative max-w-lg">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value.trim())}
                                disabled={!isTenantAdmin}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="font-mono pr-10"
                            />
                            {/* eslint-disable-next-line no-restricted-syntax */}
                            <button
                                type="button"
                                data-allow-raw="true"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Secret Key
                        </label>
                        <div className="relative max-w-lg">
                            <Input
                                type={showSecretKey ? 'text' : 'password'}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value.trim())}
                                disabled={!isTenantAdmin}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="font-mono pr-10"
                            />
                            {/* eslint-disable-next-line no-restricted-syntax */}
                            <button
                                type="button"
                                data-allow-raw="true"
                                onClick={() => setShowSecretKey(!showSecretKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    {apiKey && secretKey && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            API bilgileri tanımlı
                        </div>
                    )}

                    {/* Senkronizasyon */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fatura Senkronizasyonu</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Gelen ve giden faturaları entegrasyon sağlayıcıdan çek
                                </p>
                            </div>
                            <Button
                                onClick={handleSync}
                                disabled={syncing || !apiKey || !secretKey || !isTenantAdmin}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                {syncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Senkronize ediliyor...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Senkronizasyonu Başlat
                                    </>
                                )}
                            </Button>
                        </div>
                        {syncResult && (
                            <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
                                syncResult.success 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                                {syncResult.success 
                                    ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
                                    : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                }
                                {syncResult.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Numaralandırma Ayarları */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Fatura Numaralandırma
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Fatura numaralarınız için ön ek tanımlayın
                        </p>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={updateMutation.isPending || !isTenantAdmin} 
                        className="flex items-center gap-2"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Kaydet
                            </>
                        )}
                    </Button>
                </div>

                {/* Varsayılan Ön Ek */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Varsayılan Fatura Ön Eki
                    </label>
                    <Input
                        type="text"
                        value={defaultPrefix}
                        onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
                            setDefaultPrefix(value);
                        }}
                        disabled={!isTenantAdmin}
                        placeholder="XER"
                        maxLength={3}
                        className="max-w-xs font-mono text-lg"
                    />
                    <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Örnek fatura numarası: <strong className="font-mono">{defaultPrefix.padEnd(3, '_')}2026000000001</strong> (16 karakter)
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ Tam 3 karakter olmalı (A-Z, 0-9)
                        </p>
                    </div>
                </div>

                {/* Ek Ön Ekler */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                Ek Fatura Ön Ekleri
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Birden fazla ön ek tanımlayabilirsiniz. Fatura keserken hangisini kullanacağınızı seçersiniz.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddPrefix}
                            disabled={!isTenantAdmin}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Ön Ek Ekle
                        </Button>
                    </div>

                    {additionalPrefixes.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <Hash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                                Henüz ek ön ek tanımlanmamış.
                                <br />
                                Tüm faturalar için varsayılan ön ek kullanılacak.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {additionalPrefixes.map((prefix, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex-1">
                                        <Input
                                            type="text"
                                            value={prefix}
                                            onChange={(e) => handlePrefixChange(index, e.target.value)}
                                            disabled={!isTenantAdmin}
                                            placeholder="ABC"
                                            maxLength={3}
                                            className="font-mono text-lg"
                                        />
                                        {prefix.length > 0 && prefix.length < 3 && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                {3 - prefix.length} karakter daha gerekli
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemovePrefix(index)}
                                        disabled={!isTenantAdmin}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Varsayılan Gönderici Etiketi
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            E-Fatura hesabınızda birden fazla GB etiketi varsa varsayılanı seçebilirsiniz.
                        </p>
                    </div>
                    <Select
                        value={defaultSenderTag}
                        onChange={(e) => setDefaultSenderTag(e.target.value)}
                        disabled={!isTenantAdmin || senderTagsLoading}
                        options={[
                            { value: '', label: senderTagsLoading ? 'Yükleniyor...' : 'Varsayılan etiketi seçiniz' },
                            ...senderTags.map((tag) => ({
                                value: tag.value,
                                label: `${tag.label}${tag.type ? ` (${tag.type})` : ''}`,
                            })),
                        ]}
                        className="max-w-2xl"
                    />
                </div>
            </div>

            {/* Varsayılan İstisna Kodu */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                        E-Fatura Varsayılanları
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        0 KDV ile kesilen faturalarda otomatik kullanılacak istisna sebebi
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Varsayılan İstisna Sebebi
                        </label>
                        {/* eslint-disable-next-line no-restricted-syntax */}
                        <select
                            value={defaultExemptionCode || '0'}
                            onChange={(e) => setDefaultExemptionCode(e.target.value)}
                            disabled={!isTenantAdmin}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            {GOVERNMENT_EXEMPTION_REASONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            Ürün satırında KDV %0 seçildiğinde ve özel istisna kodu girilmediyse bu değer XML'e yazılır.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Manuel Resmi İstisna Kodu
                        </label>
                        <Input
                            type="text"
                            value={defaultExemptionCode || ''}
                            onChange={(e) => setDefaultExemptionCode(e.target.value.replace(/\D+/g, '').slice(0, 3))}
                            disabled={!isTenantAdmin}
                            placeholder="Örn: 301"
                            maxLength={3}
                            className="max-w-xs"
                        />
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            Listede aradığınız kod yoksa resmi istisna kodunu buraya elle girebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
