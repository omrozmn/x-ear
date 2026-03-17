import React from 'react';
import { Settings, Trash2 } from 'lucide-react';
import type { PlatformSettingsResponse } from '@/lib/website-generator-client';

export interface SettingsTabProps {
    platformSettings: PlatformSettingsResponse | null;
    platformSettingsDraft: Record<string, string>;
    setPlatformSettingsDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isBusy: (key: string) => boolean;
    handleSavePlatformSettings: () => void;
    handleDeletePlatformSetting: (key: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    platformSettings,
    platformSettingsDraft,
    setPlatformSettingsDraft,
    isBusy,
    handleSavePlatformSettings,
    handleDeletePlatformSetting,
}) => {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-gray-700" />
                    <h3 className="text-lg font-semibold text-gray-900">API Anahtarlari</h3>
                </div>
                <p className="mt-2 text-sm text-gray-500">Pexels, Unsplash ve sosyal medya API anahtarlarini buradan yonetin.</p>
                <div className="mt-4 space-y-3">
                    {([
                        { key: 'pexels_api_key', label: 'Pexels API Key' },
                        { key: 'unsplash_access_key', label: 'Unsplash Access Key' },
                        { key: 'unsplash_secret_key', label: 'Unsplash Secret Key' },
                        { key: 'unsplash_app_id', label: 'Unsplash App ID' },
                    ] as const).map((item) => (
                        <div key={item.key} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">{item.label}</div>
                            <div className="mt-2 flex gap-2">
                                <input
                                    type={item.key.includes('secret') || item.key.includes('api_key') || item.key.includes('access_key') ? 'password' : 'text'}
                                    value={platformSettingsDraft[item.key] ?? (platformSettings?.[item.key] as string) ?? ''}
                                    onChange={(e) => setPlatformSettingsDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                                    placeholder="API anahtarini girin"
                                />
                                {(platformSettings?.[item.key] as string) && (
                                    <button onClick={() => handleDeletePlatformSetting(item.key)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                        <Trash2 className="inline h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sosyal Medya Tokenlari</h3>
                <p className="mt-2 text-sm text-gray-500">Facebook, Instagram, Twitter ve LinkedIn entegrasyon ayarlari.</p>
                <div className="mt-4 space-y-3">
                    {([
                        { key: 'facebook_page_access_token', label: 'Facebook Page Access Token' },
                        { key: 'instagram_app_token', label: 'Instagram App Token' },
                        { key: 'meta_app_id', label: 'Meta App ID' },
                        { key: 'meta_app_secret', label: 'Meta App Secret' },
                        { key: 'twitter_bearer_token', label: 'Twitter/X Bearer Token' },
                        { key: 'linkedin_client_id', label: 'LinkedIn Client ID' },
                        { key: 'linkedin_client_secret', label: 'LinkedIn Client Secret' },
                    ] as const).map((item) => (
                        <div key={item.key} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">{item.label}</div>
                            <div className="mt-2 flex gap-2">
                                <input
                                    type={item.key.includes('secret') || item.key.includes('token') ? 'password' : 'text'}
                                    value={platformSettingsDraft[item.key] ?? (platformSettings?.[item.key] as string) ?? ''}
                                    onChange={(e) => setPlatformSettingsDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                                    placeholder="Token girin"
                                />
                                {(platformSettings?.[item.key] as string) && (
                                    <button onClick={() => handleDeletePlatformSetting(item.key)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                        <Trash2 className="inline h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleSavePlatformSettings}
                    disabled={Object.keys(platformSettingsDraft).length === 0 || isBusy('save-settings')}
                    className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy('save-settings') ? 'Kaydediliyor...' : 'Ayarlari Kaydet'}
                </button>
            </div>
        </div>
    );
};
