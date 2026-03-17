import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SiteWorkspace } from '@/lib/website-generator-client';

export interface BlogTabProps {
    workspace: SiteWorkspace | null;
    newBlogTitle: string;
    setNewBlogTitle: (v: string) => void;
    newBlogSlug: string;
    setNewBlogSlug: (v: string) => void;
    newBlogExcerpt: string;
    setNewBlogExcerpt: (v: string) => void;
    isBusy: (key: string) => boolean;
    handleAddBlogPost: () => void;
    handleDeleteBlogPost: (postSlug: string) => void;
}

export const BlogTab: React.FC<BlogTabProps> = ({
    workspace,
    newBlogTitle,
    setNewBlogTitle,
    newBlogSlug,
    setNewBlogSlug,
    newBlogExcerpt,
    setNewBlogExcerpt,
    isBusy,
    handleAddBlogPost,
    handleDeleteBlogPost,
}) => {
    return (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Blog Ayarlari</h3>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div>Mod: {workspace?.site.blog_settings?.mode ?? '-'}</div>
                    <div>Sayfa basi yazi: {workspace?.site.blog_settings?.posts_per_page ?? 0}</div>
                    <div>One cikan yazi: {workspace?.site.blog_settings?.featured_post_slug ?? '-'}</div>
                </div>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Yazi Listesi</h3>
                <div className="mt-4 space-y-3">
                    {(workspace?.site.blog_posts ?? []).length > 0 ? (
                        workspace?.site.blog_posts?.map((post) => (
                            <div key={post.slug} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{post.title}</div>
                                        <div className="mt-1 text-xs text-gray-500">{post.slug} - {post.status}</div>
                                    </div>
                                    <button onClick={() => handleDeleteBlogPost(post.slug)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                        <Trash2 className="inline h-3 w-3" /> Sil
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Blog aktif ama henuz yazi yok.</div>
                    )}
                </div>
                <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Yeni Yazi Ekle</div>
                    <div className="mt-3 grid gap-2">
                        <input value={newBlogTitle} onChange={(e) => setNewBlogTitle(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Yazi basligi" />
                        <input value={newBlogSlug} onChange={(e) => setNewBlogSlug(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Slug (bos birakilirsa otomatik)" />
                        <input value={newBlogExcerpt} onChange={(e) => setNewBlogExcerpt(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Kisa aciklama" />
                        <button onClick={handleAddBlogPost} disabled={!newBlogTitle.trim() || isBusy('add-blog')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                            <Plus className="mr-1 inline h-4 w-4" />{isBusy('add-blog') ? 'Ekleniyor...' : 'Yazi Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
