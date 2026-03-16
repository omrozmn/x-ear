import React from 'react';
import type { SiteWorkspace, WebsiteGeneratorSnapshot } from '@/lib/website-generator-client';
import { themeOptions } from './types';

export interface AppearanceTabProps {
    workspace: SiteWorkspace | null;
    snapshot: WebsiteGeneratorSnapshot | null;
    selectedPage: SiteWorkspace['site']['pages'][number] | null;
    pages: SiteWorkspace['site']['pages'];
    setSelectedPageSlug: (slug: string) => void;
    selectedTheme: string;
    setSelectedTheme: (key: string) => void;
    isBusy: (key: string) => boolean;
    handleApplyTheme: () => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
    workspace,
    snapshot,
    selectedPage,
    pages,
    setSelectedPageSlug,
    selectedTheme,
    setSelectedTheme,
    isBusy,
    handleApplyTheme,
}) => {
    return (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Secilen Sayfanin Gorunumu</h3>
                <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sayfa Secici</div>
                    <select value={selectedPage?.slug ?? ''} onChange={(event) => setSelectedPageSlug(event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                        {pages.map((page) => (
                            <option key={page.slug} value={page.slug}>
                                {page.title} ({page.slug})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mt-4 space-y-3">
                    {themeOptions.map((theme) => (
                        <button
                            key={theme.key}
                            onClick={() => setSelectedTheme(theme.key)}
                            className={`w-full rounded-3xl px-4 py-4 text-left ring-1 transition-colors ${
                                selectedTheme === theme.key ? 'bg-gray-900 text-white ring-gray-900' : 'bg-gray-50 text-gray-900 ring-gray-200'
                            }`}
                        >
                            <div className="text-sm font-semibold">{theme.label}</div>
                            <div className={`mt-1 text-xs ${selectedTheme === theme.key ? 'text-gray-300' : 'text-gray-500'}`}>{theme.detail}</div>
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleApplyTheme}
                    disabled={!workspace || isBusy('apply-theme')}
                    className="mt-4 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy('apply-theme') ? 'Uygulaniyor...' : 'Temayi Uygula'}
                </button>
                <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Header / Footer ve Section Composer</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200">Header varyanti: controlled</div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200">Section sayisi: {selectedPage?.sections.length ?? 0}</div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200">Footer varyanti: controlled</div>
                    </div>
                </div>
            </div>
            <div className="grid gap-4">
                {[
                    { title: 'Motion', detail: 'sticky-story + snap-sections' },
                    { title: 'WebGL', detail: 'ambient fallback-ready preset' },
                    { title: 'Aktif Tema', detail: selectedTheme },
                ].map((item) => (
                    <div key={item.title} className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-500">{item.detail}</p>
                    </div>
                ))}
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Safe Layout Guard</h3>
                    <div className="mt-3 text-sm text-gray-600">
                        Max content width: {snapshot?.safeLayoutPolicy?.max_content_width_px ?? '-'}px
                    </div>
                    <div className="mt-3 space-y-2">
                        {(snapshot?.safeLayoutPolicy?.guard_rules ?? []).map((rule) => (
                            <div key={rule} className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-700">
                                {rule}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
