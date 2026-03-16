import React, { useState } from 'react';
import { useListAdminSettings, useUpdateAdminSettings, useListAdminPlans } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/useAuth';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import type {
    PlanListResponse,
    SettingItem,
    SystemSettingRead,
    ResponseEnvelopeListSystemSettingRead,
} from '@/api/generated/schemas';
import { ChevronDown, ChevronRight, X, Check } from 'lucide-react';
import { adminApi } from '@/api/orval-mutator';
import { getCountryConfig } from '@/config/countryRegistry';

type FeatureMode = 'visible' | 'hidden';
type FeatureConfig = {
    mode: FeatureMode;
    plans: string[];
    countries: string[];
};
type FeatureMap = Record<string, FeatureConfig>;

interface PlanInfo {
    id: string;
    name: string;
}

// Feature hierarchy definition
interface FeatureDef {
    key: string;
    label: string;
    defaultMode: FeatureMode;
    children?: FeatureDef[];
}

const FEATURE_HIERARCHY: FeatureDef[] = [
    { key: 'patients', label: '👤 Hastalar', defaultMode: 'visible' },
    { key: 'appointments', label: '📅 Randevular', defaultMode: 'visible' },
    { key: 'inventory', label: '📦 Envanter / Stok', defaultMode: 'visible' },
    { key: 'suppliers', label: '🚛 Tedarikçiler', defaultMode: 'visible' },
    { key: 'sales', label: '🛒 Satışlar', defaultMode: 'visible' },
    { key: 'purchases', label: '💳 Alışlar', defaultMode: 'visible' },
    { key: 'payments', label: '💰 Ödemeler', defaultMode: 'visible' },
    { key: 'campaigns', label: '📢 Kampanyalar', defaultMode: 'visible' },
    { key: 'website_builder', label: '🌐 Web Sitesi Yönetimi', defaultMode: 'visible' },
    {
        key: 'invoices', label: '🧾 Faturalar', defaultMode: 'visible',
        children: [
            { key: 'invoices.outgoing', label: 'Giden Faturalar', defaultMode: 'visible' },
            { key: 'invoices.incoming', label: 'Gelen Faturalar', defaultMode: 'visible' },
            { key: 'invoices.proformas', label: 'Proformalar', defaultMode: 'visible' },
            { key: 'invoices.summary', label: 'Fatura Özeti', defaultMode: 'visible' },
            { key: 'invoices.new', label: 'Yeni Fatura', defaultMode: 'visible' },
        ],
    },
    {
        key: 'sgk', label: '🏥 SGK', defaultMode: 'visible',
        children: [
            { key: 'sgk.upload', label: 'SGK Yükleme', defaultMode: 'visible' },
            { key: 'sgk.reports', label: 'Rapor Listesi', defaultMode: 'visible' },
        ],
    },
    { key: 'reports', label: '📊 Raporlar', defaultMode: 'visible' },
    { key: 'uts', label: '🩺 ÜTS', defaultMode: 'visible' },
    { key: 'invoice_normalizer', label: '📒 Muhasebe', defaultMode: 'visible' },
    { key: 'cashflow', label: '💵 Nakit Akış', defaultMode: 'visible' },
    { key: 'pos', label: '🏪 POS / Satış Noktası', defaultMode: 'visible' },
    { key: 'automation', label: '⚙️ Otomasyon', defaultMode: 'visible' },
    { key: 'ai_chat', label: '🤖 AI Chat', defaultMode: 'visible' },
    { key: 'integrations_ui', label: '🔌 Entegrasyonlar', defaultMode: 'hidden' },
    { key: 'pricing_ui', label: '💲 Fiyatlandırma', defaultMode: 'hidden' },
    { key: 'security_ui', label: '🔒 Güvenlik', defaultMode: 'hidden' },
];

function buildDefaults(defs: FeatureDef[]): FeatureMap {
    const map: FeatureMap = {};
    for (const def of defs) {
        map[def.key] = { mode: def.defaultMode, plans: [], countries: [] };
        if (def.children) {
            for (const child of def.children) {
                map[child.key] = { mode: child.defaultMode, plans: [], countries: [] };
            }
        }
    }
    return map;
}

const ALL_FEATURE_DEFAULTS = buildDefaults(FEATURE_HIERARCHY);

const modeBadge: Record<FeatureMode, string> = {
    visible: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    hidden: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const modeColors: Record<FeatureMode, string> = {
    visible: 'text-green-600 dark:text-green-400',
    hidden: 'text-red-500 dark:text-red-400',
};

/* ─── Plan Selection Modal ─── */
const PlanModal: React.FC<{
    featureLabel: string;
    featureKey: string;
    allPlans: PlanInfo[];
    selectedPlanIds: string[];
    onSave: (planIds: string[]) => void;
    onClose: () => void;
}> = ({ featureLabel, featureKey, allPlans, selectedPlanIds, onSave, onClose }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(selectedPlanIds));

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(allPlans.map((p) => p.id)));
    const clearAll = () => setSelected(new Set());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plan Seçimi</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {featureLabel} <span className="font-mono text-xs">({featureKey})</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-4 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                        💡 Hiçbir plan seçilmezse bu özellik <strong>tüm planlara</strong> açık olur. Plan seçerseniz sadece o planlardaki kullanıcılar erişebilir.
                    </p>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 px-4 pt-3">
                    <button onClick={selectAll} className="text-xs px-3 py-1 rounded-md border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        Tümünü Seç
                    </button>
                    <button onClick={clearAll} className="text-xs px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Temizle
                    </button>
                </div>

                {/* Plan list */}
                <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {allPlans.map((plan) => {
                        const isSelected = selected.has(plan.id);
                        return (
                            <button
                                key={plan.id}
                                onClick={() => toggle(plan.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                    isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'border-2 border-gray-300 dark:border-gray-500'
                                }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <span className={`font-medium text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {plan.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selected.size === 0 ? 'Tüm planlar' : `${selected.size} plan seçili`}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            İptal
                        </button>
                        <button
                            onClick={() => onSave(Array.from(selected))}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Country Info ─── */
interface CountryInfo {
    code: string;
    name: string;
    enabled: boolean;
}

function useEnabledCountries() {
    return useQuery({
        queryKey: ['/api/admin/countries/enabled'],
        queryFn: async () => {
            const response = await adminApi<{ countries: CountryInfo[] }>({
                url: '/admin/countries',
                method: 'GET',
            });
            const raw = response as Record<string, unknown>;
            const countries = Array.isArray(raw.countries) ? raw.countries as CountryInfo[] : Array.isArray(raw) ? raw as CountryInfo[] : [];
            return countries.filter(c => c.enabled);
        },
    });
}

/* ─── Country Selection Modal ─── */
const CountryModal: React.FC<{
    featureLabel: string;
    featureKey: string;
    allCountries: CountryInfo[];
    selectedCountryCodes: string[];
    onSave: (codes: string[]) => void;
    onClose: () => void;
}> = ({ featureLabel, featureKey, allCountries, selectedCountryCodes, onSave, onClose }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(selectedCountryCodes));

    const toggle = (code: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(allCountries.map((c) => c.code)));
    const clearAll = () => setSelected(new Set());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ulke Secimi</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {featureLabel} <span className="font-mono text-xs">({featureKey})</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-4 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                        Hicbir ulke secilmezse bu ozellik <strong>tum ulkelere</strong> acik olur. Ulke secerseniz sadece o ulkelerdeki tenantlar erisebilir.
                    </p>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 px-4 pt-3">
                    <button onClick={selectAll} className="text-xs px-3 py-1 rounded-md border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        Tumunu Sec
                    </button>
                    <button onClick={clearAll} className="text-xs px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Temizle
                    </button>
                </div>

                {/* Country list */}
                <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {allCountries.map((country) => {
                        const isSelected = selected.has(country.code);
                        const config = getCountryConfig(country.code);
                        return (
                            <button
                                key={country.code}
                                onClick={() => toggle(country.code)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                    isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'border-2 border-gray-300 dark:border-gray-500'
                                }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-lg">{config.flag}</span>
                                <span className={`font-medium text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {country.name}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">{country.code}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selected.size === 0 ? 'Tum ulkeler' : `${selected.size} ulke secili`}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            Iptal
                        </button>
                        <button
                            onClick={() => onSave(Array.from(selected))}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Component ─── */
const Features: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const { user } = useAuth();
    const { data: settingsData, isLoading: featuresLoading, refetch: refetchFeatures } = useListAdminSettings();
    const { data: plansData } = useListAdminPlans();
    const { mutateAsync: updateSettings } = useUpdateAdminSettings();
    const { data: enabledCountries } = useEnabledCountries();

    const features = getFeatures(settingsData);
    const plans = getPlans(plansData);
    const countries: CountryInfo[] = enabledCountries || [];

    const canToggle = Boolean(user && ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role));

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [planModal, setPlanModal] = useState<{ featureKey: string; featureLabel: string } | null>(null);
    const [countryModal, setCountryModal] = useState<{ featureKey: string; featureLabel: string } | null>(null);

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleUpdateFeature = async (key: string, patch: Partial<FeatureConfig>) => {
        if (!canToggle) return toast.error('Yetkiniz yok');

        const currentFeature = features[key] || { mode: 'hidden', plans: [] };
        const nextFeature = { ...currentFeature, ...patch };
        const updatedFeatures = { ...features, [key]: nextFeature };

        const updates: SettingItem[] = [{
            key: 'features',
            value: JSON.stringify(updatedFeatures),
        }];

        try {
            await updateSettings({ data: updates });
            toast.success('Güncellendi');
            await refetchFeatures();
        } catch (e) {
            console.error(e);
            toast.error('Güncelleme başarısız');
        }
    };

    const handleSavePlans = (featureKey: string, planIds: string[]) => {
        handleUpdateFeature(featureKey, { plans: planIds });
        setPlanModal(null);
    };

    const handleSaveCountries = (featureKey: string, countryCodes: string[]) => {
        handleUpdateFeature(featureKey, { countries: countryCodes });
        setCountryModal(null);
    };

    const planNameById = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

    const renderFeatureRow = (def: FeatureDef, isChild = false) => {
        const v = features[def.key] || { mode: def.defaultMode, plans: [], countries: [] };
        const hasChildren = !isChild && def.children && def.children.length > 0;
        const isExpanded = expandedGroups.has(def.key);
        const parentHidden = isChild && features[def.key.split('.')[0]]?.mode === 'hidden';

        return (
            <div key={def.key} className={isChild ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}>
                <div className={`p-3 ${isChild ? 'py-2' : 'p-4'} border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${parentHidden ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {hasChildren && (
                                <button onClick={() => toggleGroup(def.key)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-gray-500" />
                                        : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                </button>
                            )}
                            <div className="min-w-0">
                                <div className={`font-medium text-gray-900 dark:text-white ${isChild ? 'text-sm' : ''}`}>{def.label}</div>
                                <div className="text-xs text-gray-400 font-mono truncate">{def.key}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Plan info + button */}
                            {v.mode === 'visible' && plans.length > 0 && !parentHidden && (
                                <button
                                    onClick={() => setPlanModal({ featureKey: def.key, featureLabel: def.label })}
                                    disabled={!canToggle}
                                    className="text-xs px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                >
                                    {v.plans.length === 0
                                        ? '📋 Tüm planlar'
                                        : `📋 ${v.plans.length} plan`}
                                </button>
                            )}

                            {/* Country info + button */}
                            {v.mode === 'visible' && countries.length > 0 && !parentHidden && (
                                <button
                                    onClick={() => setCountryModal({ featureKey: def.key, featureLabel: def.label })}
                                    disabled={!canToggle}
                                    className="text-xs px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors"
                                >
                                    {(v.countries || []).length === 0
                                        ? '🌍 Tüm ülkeler'
                                        : `🌍 ${v.countries.length} ülke`}
                                </button>
                            )}

                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modeBadge[v.mode]}`}>
                                {v.mode === 'visible' ? 'Açık' : 'Kapalı'}
                            </span>
                            <select
                                className={`border dark:border-gray-600 px-2 py-1 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${modeColors[v.mode]}`}
                                value={v.mode}
                                onChange={(e) => handleUpdateFeature(def.key, { mode: getFeatureMode(e.target.value) })}
                                disabled={!canToggle || parentHidden}
                            >
                                <option value="visible">✅ Açık</option>
                                <option value="hidden">❌ Kapalı</option>
                            </select>
                        </div>
                    </div>

                    {/* Selected plans summary */}
                    {v.mode === 'visible' && v.plans.length > 0 && !parentHidden && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {v.plans.map((pid) => (
                                <span key={pid} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                    {planNameById(pid)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Selected countries summary */}
                    {v.mode === 'visible' && (v.countries || []).length > 0 && !parentHidden && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {v.countries.map((code) => {
                                const config = getCountryConfig(code);
                                return (
                                    <span key={code} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700">
                                        {config.flag} {code}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                        {def.children!.map((child) => renderFeatureRow(child, true))}
                    </div>
                )}
            </div>
        );
    };

    if (featuresLoading) return <div className={isMobile ? 'p-4' : 'p-6'}>Loading...</div>;

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Feature Flags</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Web uygulaması modüllerini açıp kapatın</p>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {Object.values(features).filter((f) => f.mode === 'visible').length} / {Object.keys(features).length} aktif
                </div>
            </div>
            <div className="space-y-2">
                {FEATURE_HIERARCHY.map((def) => renderFeatureRow(def))}
            </div>

            {/* Plan selection modal */}
            {planModal && (
                <PlanModal
                    featureLabel={planModal.featureLabel}
                    featureKey={planModal.featureKey}
                    allPlans={plans}
                    selectedPlanIds={features[planModal.featureKey]?.plans || []}
                    onSave={(ids) => handleSavePlans(planModal.featureKey, ids)}
                    onClose={() => setPlanModal(null)}
                />
            )}

            {/* Country selection modal */}
            {countryModal && (
                <CountryModal
                    featureLabel={countryModal.featureLabel}
                    featureKey={countryModal.featureKey}
                    allCountries={countries}
                    selectedCountryCodes={features[countryModal.featureKey]?.countries || []}
                    onSave={(codes) => handleSaveCountries(countryModal.featureKey, codes)}
                    onClose={() => setCountryModal(null)}
                />
            )}
        </div>
    );
};

export default Features;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getFeatures(settingsData: ResponseEnvelopeListSystemSettingRead | undefined): FeatureMap {
    // Orval already unwraps the ResponseEnvelope, so settingsData is the inner payload directly.
    const settingsArray = Array.isArray(settingsData) ? settingsData
        : isRecord(settingsData) && Array.isArray((settingsData as Record<string, unknown>).items) ? (settingsData as Record<string, unknown>).items as unknown[]
        : [];
    if (!Array.isArray(settingsArray)) return { ...ALL_FEATURE_DEFAULTS };

    const featureSettings = settingsArray.find(
        (setting: Record<string, unknown>) => setting.key === 'features'
    ) as SystemSettingRead | undefined;
    const saved = parseFeatureMap(featureSettings);
    return { ...ALL_FEATURE_DEFAULTS, ...saved };
}

function parseFeatureMap(setting: SystemSettingRead | undefined): FeatureMap {
    if (!setting?.value || typeof setting.value !== 'string') {
        return {};
    }

    try {
        const parsed = JSON.parse(setting.value) as unknown;
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }

        return Object.fromEntries(
            Object.entries(parsed).flatMap(([key, value]) => {
                if (!value || typeof value !== 'object') {
                    return [];
                }

                const mode = getFeatureMode((value as { mode?: unknown }).mode);
                const plans = Array.isArray((value as { plans?: unknown }).plans)
                    ? (value as { plans: unknown[] }).plans.filter((plan): plan is string => typeof plan === 'string')
                    : [];
                const countries = Array.isArray((value as { countries?: unknown }).countries)
                    ? (value as { countries: unknown[] }).countries.filter((c): c is string => typeof c === 'string')
                    : [];

                return [[key, { mode, plans, countries }]];
            })
        );
    } catch {
        return {};
    }
}

function getFeatureMode(value: unknown): FeatureMode {
    return value === 'visible' ? 'visible' : 'hidden';
}

function getPlans(plansData: PlanListResponse | undefined): PlanInfo[] {
    if (!plansData) return [];

    const raw = plansData as unknown as Record<string, unknown>;
    const items = Array.isArray(plansData) ? plansData
        : Array.isArray(raw.items) ? raw.items
        : [];
    if (!Array.isArray(items)) return [];

    return items
        .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object' && 'id' in p && 'name' in p)
        .map((p) => ({ id: String(p.id), name: String(p.name) }));
}
