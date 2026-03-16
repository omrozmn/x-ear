import React from 'react';
import { Trash2 } from 'lucide-react';
import type { SiteWorkspace } from '@/lib/website-generator-client';

export interface PagesTabProps {
    workspace: SiteWorkspace | null;
    selectedPage: SiteWorkspace['site']['pages'][number] | null;
    pages: SiteWorkspace['site']['pages'];
    menuItems: SiteWorkspace['site']['menu_items'];
    setSelectedPageSlug: (slug: string) => void;
    newPageTitle: string;
    setNewPageTitle: (v: string) => void;
    newPageSlug: string;
    setNewPageSlug: (v: string) => void;
    pageTitleDraft: string;
    setPageTitleDraft: (v: string) => void;
    pageSlugDraft: string;
    setPageSlugDraft: (v: string) => void;
    isBusy: (key: string) => boolean;
    handleCreatePage: () => void;
    handleSavePageMeta: () => void;
    handleDeletePage: (pageSlug: string) => void;
}

export const PagesTab: React.FC<PagesTabProps> = ({
    workspace,
    selectedPage,
    pages,
    menuItems,
    setSelectedPageSlug,
    newPageTitle,
    setNewPageTitle,
    newPageSlug,
    setNewPageSlug,
    pageTitleDraft,
    setPageTitleDraft,
    pageSlugDraft,
    setPageSlugDraft,
    isBusy,
    handleCreatePage,
    handleSavePageMeta,
    handleDeletePage,
}) => {
    return (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sayfa Yapisi</h3>
                <div className="mt-4 space-y-3">
                    {pages.map((page) => (
                        <button
                            key={page.slug}
                            onClick={() => setSelectedPageSlug(page.slug)}
                            className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${
                                selectedPage?.slug === page.slug ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
                            }`}
                        >
                            <div className="font-medium">{page.title}</div>
                            <div className={`mt-1 text-xs ${selectedPage?.slug === page.slug ? 'text-gray-300' : 'text-gray-500'}`}>{page.slug}</div>
                        </button>
                    ))}
                </div>
                <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Yeni Sayfa</div>
                    <div className="mt-3 grid gap-3">
                        <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Sayfa basligi" />
                        <input value={newPageSlug} onChange={(event) => setNewPageSlug(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="/ornek-sayfa" />
                        <button onClick={handleCreatePage} disabled={!workspace || isBusy('create-page')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                            {isBusy('create-page') ? 'Ekleniyor...' : 'Sayfa Ekle'}
                        </button>
                    </div>
                </div>
                <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-gray-200">
                    <div className="text-sm font-semibold text-gray-900">Secilen Sayfa Bilgileri</div>
                    <div className="mt-3 grid gap-3">
                        <input value={pageTitleDraft} onChange={(event) => setPageTitleDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                        <input value={pageSlugDraft} onChange={(event) => setPageSlugDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                        <div className="flex gap-2">
                            <button onClick={handleSavePageMeta} disabled={!selectedPage || isBusy('save-page')} className="flex-1 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {isBusy('save-page') ? 'Kaydediliyor...' : 'Sayfa Bilgilerini Kaydet'}
                            </button>
                            {selectedPage && selectedPage.slug !== '/' && (
                                <button onClick={() => handleDeletePage(selectedPage.slug)} disabled={isBusy('delete-page')} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60">
                                    <Trash2 className="inline h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Menu ve Yayin Baglami</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {menuItems.length > 0 ? (
                        menuItems.map((item) => (
                            <div key={`${item.page_slug}-${item.position}`} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                {item.position}. {item.label} ({item.page_slug})
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Menu item henuz yok.</div>
                    )}
                </div>
                <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Yayin Durumu</div>
                    <div className="mt-2 text-sm text-gray-600">Preview: {workspace?.previewStatus.preview_state ?? '-'}</div>
                    <div className="mt-1 text-sm text-gray-600">Publish: {workspace?.publishStatus.status ?? '-'}</div>
                </div>
            </div>
        </div>
    );
};
