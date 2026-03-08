import React from 'react';
import { useListAdminSettings, useUpdateAdminSettings, useListAdminPlans } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/useAuth';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import type {
    PlanListResponse,
    SettingItem,
    SystemSettingRead,
    PlanListResponseDataAnyOf,
    DetailedPlanRead,
    ResponseEnvelopeListSystemSettingRead,
} from '@/api/generated/schemas';

type FeatureMode = 'visible' | 'frozen' | 'hidden';
type FeatureConfig = {
    mode: FeatureMode;
    plans: string[];
};
type FeatureMap = Record<string, FeatureConfig>;

const Features: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const { user } = useAuth();
    const { data: settingsData, isLoading: featuresLoading, refetch: refetchFeatures } = useListAdminSettings();
    const { data: plansData } = useListAdminPlans();
    const { mutateAsync: updateSettings } = useUpdateAdminSettings();

    const features = getFeatures(settingsData);
    const plans = getPlans(plansData);

    const canToggle = Boolean(user && ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role));

    const handleUpdateFeature = async (key: string, patch: Partial<FeatureConfig>) => {
        if (!canToggle) return toast.error('Yetkiniz yok');

        const currentFeature = features[key] || { mode: 'hidden', plans: [] };
        const nextFeature = { ...currentFeature, ...patch };

        const updates: SettingItem[] = [{
            key: `features.${key}`,
            value: JSON.stringify(nextFeature),
        }];

        try {
            await updateSettings({ data: updates });
            toast.success('Updated');
            refetchFeatures();
        } catch (e) {
            console.error(e);
            toast.error('Failed to update');
        }
    };

    if (featuresLoading) return <div className={isMobile ? 'p-4' : 'p-6'}>Loading...</div>;

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <h2 className={`font-semibold mb-4 text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Feature Flags</h2>
            <div className="space-y-3">
                {Object.keys(features).length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No flags defined</div>}
                {Object.entries(features).map(([k, v]) => (
                    <div key={k} className="p-4 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">{k}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{k.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Mode: <strong className="ml-1 text-gray-900 dark:text-white">{v.mode}</strong></div>
                        </div>
                        <div className={`mt-3 grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Mode</label>
                                <select
                                    className="w-full border dark:border-gray-600 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white touch-feedback"
                                    value={v.mode}
                                    onChange={(e) => handleUpdateFeature(k, { mode: getFeatureMode(e.target.value) })}
                                    disabled={!canToggle}
                                >
                                    <option value="visible">Visible</option>
                                    <option value="frozen">Frozen (show, but disabled)</option>
                                    <option value="hidden">Hidden (completely remove)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Available Plans</label>
                                <div className="max-h-36 overflow-y-auto border dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-700">
                                    {plans.map((p) => {
                                        const checked = (v.plans || []).includes(p.id);
                                        return (
                                            <div key={p.id} className="flex items-center py-1">
                                                <input
                                                    type="checkbox"
                                                    id={`${k}_${p.id}`}
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const nextPlans = new Set(v.plans || []);
                                                        if (e.target.checked) nextPlans.add(p.id); else nextPlans.delete(p.id);
                                                        handleUpdateFeature(k, { plans: Array.from(nextPlans) });
                                                    }}
                                                    disabled={!canToggle}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded touch-feedback"
                                                />
                                                <label htmlFor={`${k}_${p.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{p.name}</label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Features;

function getFeatures(settingsData: ResponseEnvelopeListSystemSettingRead | undefined): FeatureMap {
    const featureSettings = settingsData?.data?.find((setting) => setting.key === 'features');
    return parseFeatureMap(featureSettings);
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

                return [[key, { mode, plans }]];
            })
        );
    } catch {
        return {};
    }
}

function getFeatureMode(value: unknown): FeatureMode {
    return value === 'visible' || value === 'frozen' || value === 'hidden' ? value : 'hidden';
}

function getPlans(plansData: PlanListResponse | undefined): DetailedPlanRead[] {
    const planData = plansData?.data;
    if (!planData || typeof planData !== 'object') {
        return [];
    }

    const possiblePlans = (planData as PlanListResponseDataAnyOf & { plans?: unknown }).plans;
    return Array.isArray(possiblePlans)
        ? possiblePlans.filter((plan): plan is DetailedPlanRead => !!plan && typeof plan === 'object' && 'id' in plan && 'name' in plan)
        : [];
}
