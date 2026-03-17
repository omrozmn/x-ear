import React from 'react';
import type { WizardTemplate } from '@/lib/website-generator-client';

export interface TemplateWizardPanelProps {
    wizardTemplates: WizardTemplate[];
    selectedTemplateKey: string | null;
    setSelectedTemplateKey: (key: string) => void;
    wizardSiteName: string;
    setWizardSiteName: (v: string) => void;
    wizardPhone: string;
    setWizardPhone: (v: string) => void;
    wizardEmail: string;
    setWizardEmail: (v: string) => void;
    isBusy: (key: string) => boolean;
    handleCreateFromWizard: () => void;
}

export const TemplateWizardPanel: React.FC<TemplateWizardPanelProps> = ({
    wizardTemplates,
    selectedTemplateKey,
    setSelectedTemplateKey,
    wizardSiteName,
    setWizardSiteName,
    wizardPhone,
    setWizardPhone,
    wizardEmail,
    setWizardEmail,
    isBusy,
    handleCreateFromWizard,
}) => {
    return (
        <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {wizardTemplates.map((tmpl) => (
                    <button
                        key={tmpl.key}
                        onClick={() => setSelectedTemplateKey(tmpl.key)}
                        className={`w-full rounded-3xl p-5 text-left transition-all ${
                            selectedTemplateKey === tmpl.key
                                ? 'bg-gray-950 text-white shadow-lg'
                                : 'bg-gray-50 text-gray-900 ring-1 ring-gray-200 hover:bg-white'
                        }`}
                    >
                        <div className="text-2xl">{tmpl.icon}</div>
                        <h3 className="mt-2 text-sm font-semibold">{tmpl.label}</h3>
                        <p className={`mt-1 text-xs ${selectedTemplateKey === tmpl.key ? 'text-gray-300' : 'text-gray-500'}`}>{tmpl.description}</p>
                    </button>
                ))}
                {wizardTemplates.length === 0 && (
                    <div className="col-span-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Sablonlar yukleniyor...</div>
                )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Site adi *</div>
                    <input value={wizardSiteName} onChange={(e) => setWizardSiteName(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Ornek: X-Ear Isitme Merkezi" />
                </label>
                <label className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Telefon (opsiyonel)</div>
                    <input value={wizardPhone} onChange={(e) => setWizardPhone(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="+90 5xx xxx xx xx" />
                </label>
                <label className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">Email (opsiyonel)</div>
                    <input value={wizardEmail} onChange={(e) => setWizardEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="info@example.com" />
                </label>
            </div>
            <button
                onClick={handleCreateFromWizard}
                disabled={!selectedTemplateKey || !wizardSiteName.trim() || isBusy('create-wizard')}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isBusy('create-wizard') ? 'Olusturuluyor...' : 'Sablondan Site Olustur'}
            </button>
        </div>
    );
};
