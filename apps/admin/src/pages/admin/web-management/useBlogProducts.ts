import { useState } from 'react';
import {
    createBlogPost,
    createMarketplaceLink,
    createProduct,
    deleteBlogPost,
    deleteMarketplaceLink,
    deleteProduct,
} from '@/lib/website-generator-client';
import type { CoreState } from './useWebManagementCore';

export function useBlogProducts(core: CoreState) {
    const { addBusy, removeBusy, setError, loadWorkspace, workspace } = core;

    const [newBlogTitle, setNewBlogTitle] = useState('');
    const [newBlogSlug, setNewBlogSlug] = useState('');
    const [newBlogExcerpt, setNewBlogExcerpt] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newMarketplaceProvider, setNewMarketplaceProvider] = useState('trendyol');
    const [newMarketplaceLabel, setNewMarketplaceLabel] = useState('');
    const [newMarketplaceUrl, setNewMarketplaceUrl] = useState('');

    const handleAddBlogPost = async () => {
        if (!workspace || !newBlogTitle.trim()) return;
        addBusy('add-blog'); setError(null);
        try {
            const slug = newBlogSlug || newBlogTitle.toLowerCase().replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/İ/g,'i').replace(/Ö/g,'o').replace(/Ü/g,'u').replace(/Ç/g,'c').replace(/Ş/g,'s').replace(/Ğ/g,'g').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            await createBlogPost(workspace.site.id, {
                slug, title: newBlogTitle, excerpt: newBlogExcerpt || newBlogTitle,
                body: '', status: 'draft', categories: [],
            });
            await loadWorkspace(workspace.site.id);
            setNewBlogTitle(''); setNewBlogSlug(''); setNewBlogExcerpt('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Blog yazisi eklenemedi.'); } finally { removeBusy('add-blog'); }
    };

    const handleDeleteBlogPost = async (postSlug: string) => {
        if (!workspace) return;
        if (!window.confirm('Bu blog yazisini silmek istediginize emin misiniz?')) return;
        addBusy('delete-blog'); setError(null);
        try { await deleteBlogPost(workspace.site.id, postSlug); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Blog yazisi silinemedi.'); } finally { removeBusy('delete-blog'); }
    };

    const handleAddProduct = async () => {
        if (!workspace || !newProductName.trim()) return;
        addBusy('add-product'); setError(null);
        try {
            const sku = newProductSku || `SKU-${Date.now()}`;
            const slug = newProductName.toLowerCase().replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/İ/g,'i').replace(/Ö/g,'o').replace(/Ü/g,'u').replace(/Ç/g,'c').replace(/Ş/g,'s').replace(/Ğ/g,'g').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            await createProduct(workspace.site.id, {
                sku, slug, name: newProductName, description: '',
                price: Number(newProductPrice) || 0, currency: 'TRY', status: 'draft', in_stock: true,
            });
            await loadWorkspace(workspace.site.id);
            setNewProductName(''); setNewProductSku(''); setNewProductPrice('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Urun eklenemedi.'); } finally { removeBusy('add-product'); }
    };

    const handleDeleteProduct = async (productSku: string) => {
        if (!workspace) return;
        if (!window.confirm('Bu urunu silmek istediginize emin misiniz?')) return;
        addBusy('delete-product'); setError(null);
        try { await deleteProduct(workspace.site.id, productSku); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Urun silinemedi.'); } finally { removeBusy('delete-product'); }
    };

    const handleAddMarketplaceLink = async () => {
        if (!workspace || !newMarketplaceLabel.trim() || !newMarketplaceUrl.trim()) return;
        try { const u = new URL(newMarketplaceUrl); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
        catch { setError('Gecerli bir URL girin (https://...)'); return; }
        addBusy('add-marketplace'); setError(null);
        try {
            await createMarketplaceLink(workspace.site.id, {
                provider: newMarketplaceProvider, label: newMarketplaceLabel,
                url: newMarketplaceUrl, visible: true,
            });
            await loadWorkspace(workspace.site.id);
            setNewMarketplaceLabel(''); setNewMarketplaceUrl('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Pazaryeri linki eklenemedi.'); } finally { removeBusy('add-marketplace'); }
    };

    const handleDeleteMarketplaceLink = async (linkId: string) => {
        if (!workspace) return;
        if (!window.confirm('Bu pazaryeri linkini silmek istediginize emin misiniz?')) return;
        addBusy('delete-marketplace'); setError(null);
        try { await deleteMarketplaceLink(workspace.site.id, linkId); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Pazaryeri linki silinemedi.'); } finally { removeBusy('delete-marketplace'); }
    };

    return {
        newBlogTitle, setNewBlogTitle, newBlogSlug, setNewBlogSlug, newBlogExcerpt, setNewBlogExcerpt,
        newProductName, setNewProductName, newProductSku, setNewProductSku, newProductPrice, setNewProductPrice,
        newMarketplaceProvider, setNewMarketplaceProvider, newMarketplaceLabel, setNewMarketplaceLabel,
        newMarketplaceUrl, setNewMarketplaceUrl,
        handleAddBlogPost, handleDeleteBlogPost, handleAddProduct, handleDeleteProduct,
        handleAddMarketplaceLink, handleDeleteMarketplaceLink,
    };
}
