import React from 'react';
import { aiQuestionGroups } from './types';

export interface AiOnboardingPanelProps {
    siteName: string;
    setSiteName: (v: string) => void;
    siteSlug: string;
    setSiteSlug: (v: string) => void;
    aiPrompt: string;
    setAiPrompt: (v: string) => void;
    isBusy: (key: string) => boolean;
    handleCreateDraft: () => void;
}

export const AiOnboardingPanel: React.FC<AiOnboardingPanelProps> = ({
    siteName,
    setSiteName,
    siteSlug,
    setSiteSlug,
    aiPrompt,
    setAiPrompt,
    isBusy,
    handleCreateDraft,
}) => {
    return (
        <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Site adi</div>
                    <input value={siteName} onChange={(event) => setSiteName(event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                </label>
                <label className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Slug</div>
                    <input value={siteSlug} onChange={(event) => setSiteSlug(event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                </label>
            </div>
            <label className="block rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-medium text-gray-900">AI prompt</div>
                <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={4} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
            </label>
            {aiQuestionGroups.map((group) => (
                <div key={group.title} className="rounded-3xl bg-gray-50 p-5">
                    <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {group.items.map((item) => (
                            <li key={item} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <div className="rounded-3xl border border-dashed border-sky-300 bg-sky-50 p-5 text-sm text-sky-900">
                AI sonunda serbest HTML degil; feature config, typed site draft ve section plan uretir.
            </div>
            <button
                onClick={handleCreateDraft}
                disabled={isBusy('create-draft')}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isBusy('create-draft') ? 'Draft olusturuluyor...' : 'AI ile Taslak Olustur'}
            </button>
        </div>
    );
};
