import React, { useState } from 'react';
import {
    useListAdminPosts,
    useDeleteAdminPost,
    useUpdateAdminPost,
    useCreateAdminPost,
    type BlogListResponse,
    type BlogPost,
} from '@/lib/api-client';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    PencilSquareIcon,
    TrashIcon,
    GlobeAltIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

const AdminBlogPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

    const { data: postsData, isLoading, refetch } = useListAdminPosts({
        page,
        limit,
        search: search || undefined
    });

    const deletePost = useDeleteAdminPost({
        onSuccess: () => refetch()
    });

    const updatePost = useUpdateAdminPost({
        onSuccess: () => refetch()
    });

    // Handle flat array response or wrapped response
    let posts: BlogPost[] = [];
    if (Array.isArray(postsData)) {
        posts = postsData;
    } else if (postsData?.data && Array.isArray(postsData.data)) {
        posts = postsData.data;
    } else if (postsData?.posts && Array.isArray(postsData.posts)) {
        posts = postsData.posts;
    }

    const pagination = Array.isArray(postsData) ? undefined : (postsData as BlogListResponse | undefined)?.pagination;
    const totalPages = pagination?.totalPages || 1;

    const handleDeleteClick = (post: BlogPost) => {
        setPostToDelete(post);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (postToDelete) {
            await deletePost.mutateAsync(postToDelete.id);
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
        }
    };

    const togglePublish = async (post: BlogPost) => {
        await updatePost.mutateAsync({
            postId: String(post.id),
            data: { is_published: !post.is_published }
        });
    };

    const columns = [
        {
            key: 'title',
            header: 'Başlık',
            render: (post: BlogPost) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{post.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">/{post.slug}</span>
                </div>
            )
        },
        {
            key: 'category',
            header: 'Kategori',
            mobileHidden: true,
            render: (post: BlogPost) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {post.category || 'Genel'}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            render: (post: BlogPost) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${post.is_published
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                    {post.is_published ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
                    {post.is_published ? 'Yayında' : 'Taslak'}
                </span>
            )
        },
        {
            key: 'date',
            header: 'Tarih',
            mobileHidden: true,
            render: (post: BlogPost) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('tr-TR') : 'Yayınlanmadı'}
                </span>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (post: BlogPost) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => togglePublish(post)}
                        title={post.is_published ? "Taslağa Çek" : "Yayınla"}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${post.is_published ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                        <GlobeAltIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedPost(post);
                            setIsEditModalOpen(true);
                        }}
                        title="Düzenle"
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-all flex items-center justify-center"
                    >
                        <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => window.open(`http://localhost:3000/blog/${post.slug}`, '_blank')}
                        title="Görüntüle"
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all flex items-center justify-center"
                    >
                        <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handleDeleteClick(post)}
                        title="Sil"
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all flex items-center justify-center"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>Blog Yönetimi</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Blog yazılarını oluşturun, düzenleyin ve yayınlayın.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Yeni Yazı
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Başlık veya içerik ara..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500">Yazılar yükleniyor...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                        <p className="text-lg font-medium">Henüz yazı bulunmuyor.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            İlk yazınızı oluşturun
                        </button>
                    </div>
                ) : (
                    <>
                        <ResponsiveTable
                            data={posts}
                            columns={columns}
                            keyExtractor={(post) => post.id}
                        />
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={pagination?.total || 0}
                                itemsPerPage={limit}
                                onPageChange={setPage}
                                onItemsPerPageChange={setLimit}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal would go here - for now using a simple prompt for title to demo create */}
            {isCreateModalOpen && (
                <PostModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        refetch();
                    }}
                />
            )}

            {isEditModalOpen && selectedPost && (
                <PostModal
                    post={selectedPost}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedPost(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedPost(null);
                        refetch();
                    }}
                />
            )}

            {/* Custom Delete Modal */}
            {isDeleteModalOpen && postToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                                <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-medium text-center text-gray-900 dark:text-white mb-2">
                                Yazıyı Sil
                            </h3>
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">"{postToDelete.title}"</span> başlıklı yazıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setPostToDelete(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deletePost.isPending}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deletePost.isPending ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    ) : 'Evet, Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Comprehensive Post Modal for Create and Edit
interface BlogPostFormData {
    title: string;
    slug: string;
    content: string;
    category: string;
    excerpt: string;
    imageUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    isPublished: boolean;
}

const PostModal = ({ post, onClose, onSuccess }: { post?: BlogPost, onClose: () => void, onSuccess: () => void }) => {
    const isEdit = !!post;
    const createPost = useCreateAdminPost({ onSuccess });
    const updatePost = useUpdateAdminPost({ onSuccess });

    const [formData, setFormData] = useState<BlogPostFormData>({
        title: post?.title || '',
        slug: post?.slug || '',
        content: typeof post?.content === 'string' ? post.content : '',
        category: post?.category || 'Duyurular',
        excerpt: typeof post?.excerpt === 'string' ? post.excerpt : '',
        imageUrl: typeof post?.imageUrl === 'string' ? post.imageUrl : '',
        metaTitle: typeof post?.metaTitle === 'string' ? post.metaTitle : '',
        metaDescription: typeof post?.metaDescription === 'string' ? post.metaDescription : '',
        metaKeywords: typeof post?.metaKeywords === 'string' ? post.metaKeywords : '',
        isPublished: typeof post?.isPublished === 'boolean' ? post.isPublished : false
    });

    // Auto-generate slug from title if not editing an existing slug
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setFormData(prev => ({
            ...prev,
            title: newTitle,
            slug: !isEdit ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : prev.slug
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            // Map camelCase to snake_case for backend if needed, but api-client usually handles it
            // Based on schemas, we use aliases, so we can send camelCase if using Orval, 
            // but for manual axios calls we check the router.
            // Actually, the schemas use Field(alias="imageUrl") etc, so they expect camelCase in JSON if using Pydantic.
        };

        if (isEdit) {
            await updatePost.mutateAsync({
                postId: String(post.id),
                data: payload
            });
        } else {
            await createPost.mutateAsync(payload);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-white/10">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        {isEdit ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold border-l-4 border-blue-500 pl-3">Temel Bilgiler</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Başlık</label>
                            <input
                                required
                                value={formData.title}
                                onChange={handleTitleChange}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Yazı başlığı..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL / Slug</label>
                            <input
                                required
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="yazi-url-adresi"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kategori</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option>Duyurular</option>
                                    <option>Yapay Zeka</option>
                                    <option>Teknoloji</option>
                                    <option>Sektörel</option>
                                    <option>Geliştirici Günlüğü</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-3">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPublished}
                                        onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                    <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">Hemen Yayınla</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kapak Görseli URL</label>
                            <input
                                value={formData.imageUrl}
                                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="https://example.com/image.jpg"
                            />
                            {formData.imageUrl && (
                                <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden h-32 bg-gray-100 flex items-center justify-center">
                                    <img src={formData.imageUrl} alt="Önizleme" className="h-full w-auto object-contain" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Geçersiz+Resim')} />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kısa Özet (Excerpt)</label>
                            <textarea
                                value={formData.excerpt}
                                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                rows={3}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                placeholder="Okuyucuyu etkileyecek kısa bir giriş cümlesi..."
                            />
                        </div>
                    </div>

                    {/* Right Column: SEO & Content */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold border-l-4 border-purple-500 pl-3">SEO Ayarları</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Meta Başlık (Alt+T)</label>
                            <input
                                value={formData.metaTitle}
                                onChange={e => setFormData({ ...formData, metaTitle: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                                placeholder="Google sonuçlarında görünecek başlık..."
                            />
                            <p className="mt-1 text-[10px] text-gray-400">Önerilen: 50-60 karakter. Şu an: {formData.metaTitle.length}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Meta Açıklama</label>
                            <textarea
                                value={formData.metaDescription}
                                onChange={e => setFormData({ ...formData, metaDescription: e.target.value })}
                                rows={2}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                                placeholder="Arama sonuçlarında görünecek kısa açıklama..."
                            />
                            <p className="mt-1 text-[10px] text-gray-400">Önerilen: 150-160 karakter. Şu an: {formData.metaDescription.length}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Anahtar Kelimeler (Virgülle ayırın)</label>
                            <input
                                value={formData.metaKeywords}
                                onChange={e => setFormData({ ...formData, metaKeywords: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                                placeholder="işitme, crm, ai, x-ear..."
                            />
                        </div>

                        <div className="pt-4">
                            <h3 className="text-lg font-semibold border-l-4 border-green-500 pl-3 mb-4">İçerik</h3>
                            <textarea
                                required
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                rows={10}
                                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                placeholder="Yazı içeriği (HTML/Markdown desteklenir)..."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-6 flex justify-end gap-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={createPost.isPending || updatePost.isPending}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {(createPost.isPending || updatePost.isPending) ? (
                                <>
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-4 h-4" />
                                    {isEdit ? 'Değişiklikleri Kaydet' : 'Yayına Al / Taslak Kaydet'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminBlogPage;
