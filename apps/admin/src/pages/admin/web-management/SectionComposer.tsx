import React from 'react';
import type { EditableFieldDefinition, SiteWorkspace } from '@/lib/website-generator-client';
import { renderFieldInput } from './renderFieldInput';

export interface SectionComposerProps {
    selectedPage: SiteWorkspace['site']['pages'][number] | null;
    pages: SiteWorkspace['site']['pages'];
    setSelectedPageSlug: (slug: string) => void;
    editingSectionIndex: number | null;
    setEditingSectionIndex: (index: number | null) => void;
    sectionFieldsDraft: Record<string, unknown>;
    setSectionFieldsDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    getEditableFields: (sectionType: string, variantKey: string) => EditableFieldDefinition[];
    handleMoveSection: (sectionIndex: number, direction: 'up' | 'down') => void;
    handleDeleteSection: (sectionIndex: number) => void;
    handleSaveSectionContent: (sectionIndex: number, currentVariant: string) => void;
}

export const SectionComposer: React.FC<SectionComposerProps> = ({
    selectedPage,
    pages,
    setSelectedPageSlug,
    editingSectionIndex,
    setEditingSectionIndex,
    sectionFieldsDraft,
    setSectionFieldsDraft,
    getEditableFields,
    handleMoveSection,
    handleDeleteSection,
    handleSaveSectionContent,
}) => {
    return (
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Sayfa Icerikleri ve Section Composer</h3>
            <p className="mt-2 text-sm text-gray-500">Secili sayfa icin header, body sections ve footer controlled olarak duzenlenir.</p>
            <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Secili sayfa</div>
                <select value={selectedPage?.slug ?? ''} onChange={(event) => setSelectedPageSlug(event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                    {pages.map((page) => (
                        <option key={page.slug} value={page.slug}>
                            {page.title} ({page.slug})
                        </option>
                    ))}
                </select>
            </div>
            <div className="mt-4 space-y-3">
                {selectedPage ? (
                    selectedPage.sections.map((section, index) => (
                        <div key={`${selectedPage.slug}-${section.type}-${index}`} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-medium text-gray-900">{section.type}</div>
                                    <div className="mt-1 text-xs text-gray-500">{section.variant}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleMoveSection(index, 'up')} className="rounded-xl bg-white px-2 py-1 text-xs ring-1 ring-gray-200">Yukari</button>
                                    <button onClick={() => handleMoveSection(index, 'down')} className="rounded-xl bg-white px-2 py-1 text-xs ring-1 ring-gray-200">Asagi</button>
                                    <button onClick={() => handleDeleteSection(index)} className="rounded-xl bg-white px-2 py-1 text-xs ring-1 ring-gray-200">Sil</button>
                                </div>
                            </div>
                            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-gray-200">
                                <div className="text-xs uppercase tracking-wide text-gray-500">Icerik</div>
                                {editingSectionIndex === index ? (
                                    <div className="mt-3 space-y-3">
                                        {(() => {
                                            const fields = getEditableFields(section.type, section.variant);
                                            if (fields.length === 0) {
                                                return (
                                                    <input
                                                        value={String(sectionFieldsDraft.title ?? '')}
                                                        onChange={(e) => setSectionFieldsDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                                                        placeholder="Section basligi"
                                                    />
                                                );
                                            }
                                            return fields.map((field) => (
                                                <label key={field.key} className="block">
                                                    <div className="mb-1 text-xs font-medium text-gray-700">
                                                        {field.label}
                                                        {field.required && <span className="ml-1 text-rose-500">*</span>}
                                                    </div>
                                                    {renderFieldInput(
                                                        field,
                                                        sectionFieldsDraft[field.key],
                                                        (val) => setSectionFieldsDraft((prev) => ({ ...prev, [field.key]: val })),
                                                    )}
                                                </label>
                                            ));
                                        })()}
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSaveSectionContent(index, section.variant)} className="rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white">
                                                Kaydet
                                            </button>
                                            <button onClick={() => { setEditingSectionIndex(null); setSectionFieldsDraft({}); }} className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
                                                Iptal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        {(() => {
                                            const fields = getEditableFields(section.type, section.variant);
                                            const entries = Object.entries(section.fields).filter(([, v]) => v != null && v !== '');
                                            if (entries.length === 0) {
                                                return <div className="text-sm text-gray-400">Icerik girilmemis.</div>;
                                            }
                                            return (
                                                <div className="space-y-1">
                                                    {entries.slice(0, 4).map(([key, val]) => {
                                                        const fieldDef = fields.find((f) => f.key === key);
                                                        return (
                                                            <div key={key} className="flex items-start gap-2 text-sm">
                                                                <span className="font-medium text-gray-500">{fieldDef?.label ?? key}:</span>
                                                                <span className="text-gray-700 line-clamp-1">{String(val)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {entries.length > 4 && (
                                                        <div className="text-xs text-gray-400">+{entries.length - 4} alan daha</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <button
                                            onClick={() => {
                                                setEditingSectionIndex(index);
                                                setSectionFieldsDraft({ ...section.fields });
                                            }}
                                            className="mt-2 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
                                        >
                                            Icerigi Duzenle
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Henuz olusturulmus bir draft yok.</div>
                )}
            </div>
        </div>
    );
};
