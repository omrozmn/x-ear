import React, { useState } from 'react';
import { useGetAdminSettings, usePatchAdminSettings, useGetAdminPlans } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const Features: React.FC = () => {
    const { user } = useAuth();
    const { data: settingsData, isLoading: featuresLoading, refetch: refetchFeatures } = useGetAdminSettings();
    const { data: plansData } = useGetAdminPlans();
    const { mutateAsync: updateSettings } = usePatchAdminSettings();

    const features = (settingsData?.data?.settings as any)?.features || {};
    const plans = plansData?.data?.plans || [];

    const canToggle = Boolean(user && ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role));

    const handleUpdateFeature = async (key: string, patch: any) => {
        if (!canToggle) return toast.error('Yetkiniz yok');

        const currentFeature = features[key] || { mode: 'hidden', plans: [] };
        const nextFeature = { ...currentFeature, ...patch };

        const updates = {
            [`features.${key}`]: nextFeature
        };

        try {
            await updateSettings({ data: { updates } });
            toast.success('Updated');
            refetchFeatures();
        } catch (e) {
            console.error(e);
            toast.error('Failed to update');
        }
    };

    if (featuresLoading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
            <div className="space-y-3">
                {Object.keys(features).length === 0 && <div className="text-sm text-gray-500">No flags defined</div>}
                {Object.entries(features).map(([k, v]: [string, any]) => (
                    <div key={k} className="p-4 border rounded bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-medium">{k}</div>
                                <div className="text-xs text-gray-500">{k.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-sm text-gray-500">Mode: <strong className="ml-1">{v.mode}</strong></div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Mode</label>
                                <select
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={v.mode}
                                    onChange={(e) => handleUpdateFeature(k, { mode: e.target.value })}
                                    disabled={!canToggle}
                                >
                                    <option value="visible">Visible</option>
                                    <option value="frozen">Frozen (show, but disabled)</option>
                                    <option value="hidden">Hidden (completely remove)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Available Plans</label>
                                <div className="max-h-36 overflow-y-auto border rounded p-2 bg-gray-50">
                                    {plans.map((p: any) => {
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
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`${k}_${p.id}`} className="ml-2 text-sm text-gray-700">{p.name}</label>
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
