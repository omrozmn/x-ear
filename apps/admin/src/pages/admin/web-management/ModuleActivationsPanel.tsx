import React from 'react';
import { Store } from 'lucide-react';
import type { AIDraftAnswers, SiteWorkspace } from '@/lib/website-generator-client';
import { featureCards } from './types';

export interface ModuleActivationsPanelProps {
    workspace: SiteWorkspace | null;
    answers: AIDraftAnswers;
    setAnswers: React.Dispatch<React.SetStateAction<AIDraftAnswers>>;
    isBusy: (key: string) => boolean;
    handleToggleFeature: (featureKey: string, enabled: boolean) => void;
}

export const ModuleActivationsPanel: React.FC<ModuleActivationsPanelProps> = ({
    workspace,
    answers,
    setAnswers,
    isBusy,
    handleToggleFeature,
}) => {
    return (
        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
            <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-gray-900">Modul Aktivasyonlari</h2>
            </div>
            <div className="mt-5 space-y-3">
                {featureCards.map((item) => {
                    const isActive = workspace
                        ? workspace.site.feature_flags[item.key as keyof typeof workspace.site.feature_flags]
                        : answers[item.key];
                    return (
                        <button
                            key={item.key}
                            onClick={() => {
                                if (workspace) {
                                    void handleToggleFeature(item.key, !isActive);
                                } else {
                                    setAnswers((current) => ({ ...current, [item.key]: !current[item.key] }));
                                }
                            }}
                            disabled={isBusy('toggle-feature')}
                            className={`flex w-full items-start justify-between rounded-3xl px-4 py-4 text-left ring-1 transition-colors disabled:opacity-60 ${
                                isActive ? 'bg-emerald-50 ring-emerald-200' : 'bg-gray-50 ring-gray-200'
                            }`}
                        >
                            <div>
                                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                                <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                            </div>
                            <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {isActive ? 'Aktif' : 'Pasif'}
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chatbot Faturalama Modu</div>
                <div className="mt-3 flex gap-2">
                    {[
                        { key: 'platform_managed', label: 'Biz Yonetelim' },
                        { key: 'bring_your_own_api', label: 'Kendi API Anahtari' },
                    ].map((option) => (
                        <button
                            key={option.key}
                            onClick={() => setAnswers((current) => ({ ...current, chatbot_mode: option.key as AIDraftAnswers['chatbot_mode'] }))}
                            className={`rounded-2xl px-3 py-2 text-xs font-medium ${answers.chatbot_mode === option.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
