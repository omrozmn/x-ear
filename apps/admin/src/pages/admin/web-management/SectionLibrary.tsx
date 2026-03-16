import React from 'react';
import type { BuilderSectionRegistryResponse, SiteWorkspace } from '@/lib/website-generator-client';

export interface SectionLibraryProps {
    selectedPage: SiteWorkspace['site']['pages'][number] | null;
    sectionRegistry: BuilderSectionRegistryResponse | undefined;
    newSectionType: string;
    setNewSectionType: (type: string) => void;
    newSectionVariant: string;
    setNewSectionVariant: (variant: string) => void;
    availableSectionVariants: BuilderSectionRegistryResponse['sections'][number]['variants'];
    isBusy: (key: string) => boolean;
    handleAddSection: () => void;
}

export const SectionLibrary: React.FC<SectionLibraryProps> = ({
    selectedPage,
    sectionRegistry,
    newSectionType,
    setNewSectionType,
    newSectionVariant,
    setNewSectionVariant,
    availableSectionVariants,
    isBusy,
    handleAddSection,
}) => {
    return (
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Section Kutuphanesi</h3>
            <p className="mt-2 text-sm text-gray-500">Kullanici controlled builder mantigiyla sadece izinli section ve varyantlari kullanir.</p>
            <div className="mt-4 grid gap-3">
                <select value={newSectionType} onChange={(event) => setNewSectionType(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                    {(sectionRegistry?.sections ?? []).map((section) => (
                        <option key={section.type} value={section.type}>
                            {section.label}
                        </option>
                    ))}
                </select>
                <select value={newSectionVariant} onChange={(event) => setNewSectionVariant(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                    {availableSectionVariants.map((variant) => (
                        <option key={variant.key} value={variant.key}>
                            {variant.label}
                        </option>
                    ))}
                </select>
                <button onClick={handleAddSection} disabled={!selectedPage || isBusy('add-section')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {isBusy('add-section') ? 'Ekleniyor...' : 'Section Ekle'}
                </button>
            </div>
            <div className="mt-4 space-y-3">
                {(sectionRegistry?.sections ?? []).map((section) => (
                    <div key={section.type} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{section.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{section.responsive_behavior.mobile} / {section.responsive_behavior.tablet} / {section.responsive_behavior.desktop}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {section.variants.map((variant) => (
                                <span key={variant.key} className="rounded-full bg-white px-3 py-1 text-xs ring-1 ring-gray-200">
                                    {variant.label}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 rounded-3xl bg-gray-50 p-4 text-sm text-gray-600">
                Safe area zorunlu. Icerik ne kadar uzarsa uzasin layout container disina cikamaz.
            </div>
        </div>
    );
};
