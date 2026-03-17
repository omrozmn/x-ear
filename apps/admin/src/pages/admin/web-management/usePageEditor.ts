import { useEffect, useMemo, useState } from 'react';
import {
    addSitePageSection,
    createSitePage,
    deleteSitePage,
    deleteSitePageSection,
    reorderSitePageSections,
    updateSitePage,
    updateSitePageSection,
    type EditableFieldDefinition,
} from '@/lib/website-generator-client';
import type { CoreState } from './useWebManagementCore';

export function usePageEditor(core: CoreState) {
    const { addBusy, removeBusy, setError, loadWorkspace, workspace, sectionRegistry } = core;

    const [selectedPageSlug, setSelectedPageSlug] = useState('/');
    const [newPageTitle, setNewPageTitle] = useState('Yeni Sayfa');
    const [newPageSlug, setNewPageSlug] = useState('/new-page');
    const [newSectionType, setNewSectionType] = useState('hero');
    const [newSectionVariant, setNewSectionVariant] = useState('hero-clinic-a');
    const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
    const [sectionFieldsDraft, setSectionFieldsDraft] = useState<Record<string, unknown>>({});
    const [pageTitleDraft, setPageTitleDraft] = useState('Ana Sayfa');
    const [pageSlugDraft, setPageSlugDraft] = useState('/');

    const pages = useMemo(() => workspace?.site.pages ?? [], [workspace?.site.pages]);
    const menuItems = useMemo(() => workspace?.site.menu_items ?? [], [workspace?.site.menu_items]);
    const previewChecks = useMemo(() => workspace?.previewStatus.checks ?? [], [workspace?.previewStatus.checks]);
    const selectedPage = useMemo(() => pages.find((page) => page.slug === selectedPageSlug) ?? pages[0] ?? null, [pages, selectedPageSlug]);
    const previewTargets = useMemo(() => pages.flatMap((page) =>
        page.sections.map((section, sIdx) => ({ key: `${page.slug}::${section.type}::${sIdx}`, label: `${page.title} / ${section.type}` })),
    ), [pages]);
    const selectedSectionDefinition = useMemo(
        () => sectionRegistry?.sections.find((section) => section.type === newSectionType),
        [newSectionType, sectionRegistry?.sections],
    );
    const availableSectionVariants = useMemo(() => selectedSectionDefinition?.variants ?? [], [selectedSectionDefinition]);

    useEffect(() => {
        if (pages.length > 0 && !pages.some((page) => page.slug === selectedPageSlug)) {
            setSelectedPageSlug(pages[0].slug);
        }
    }, [pages, selectedPageSlug]);

    useEffect(() => {
        if (availableSectionVariants.length > 0 && !availableSectionVariants.some((v) => v.key === newSectionVariant)) {
            setNewSectionVariant(availableSectionVariants[0].key);
        }
    }, [availableSectionVariants, newSectionVariant]);

    useEffect(() => {
        if (selectedPage) { setPageTitleDraft(selectedPage.title); setPageSlugDraft(selectedPage.slug); }
    }, [selectedPage]);

    const getEditableFields = (sectionType: string, variantKey: string): EditableFieldDefinition[] => {
        const sectionDef = sectionRegistry?.sections.find((s) => s.type === sectionType);
        return sectionDef?.variants.find((v) => v.key === variantKey)?.editable_fields ?? [];
    };

    const handleCreatePage = async () => {
        if (!workspace) { setError('Sayfa eklemek icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('create-page'); setError(null);
        try { await createSitePage(workspace.site.id, { title: newPageTitle, slug: newPageSlug, sections: [] }); await loadWorkspace(workspace.site.id); setSelectedPageSlug(newPageSlug); }
        catch (e) { setError(e instanceof Error ? e.message : 'Yeni sayfa eklenemedi.'); } finally { removeBusy('create-page'); }
    };

    const handleSavePageMeta = async () => {
        if (!workspace || !selectedPage) { setError('Guncellenecek sayfa bulunamadi.'); return; }
        addBusy('save-page'); setError(null);
        try { await updateSitePage(workspace.site.id, selectedPage.slug, { title: pageTitleDraft, slug: pageSlugDraft, sections: selectedPage.sections }); await loadWorkspace(workspace.site.id); setSelectedPageSlug(pageSlugDraft); }
        catch (e) { setError(e instanceof Error ? e.message : 'Sayfa bilgileri guncellenemedi.'); } finally { removeBusy('save-page'); }
    };

    const handleAddSection = async () => {
        if (!workspace || !selectedPage) { setError('Section eklemek icin once bir sayfa secilmesi gerekiyor.'); return; }
        addBusy('add-section'); setError(null);
        try { await addSitePageSection(workspace.site.id, selectedPage.slug, { type: newSectionType, variant: newSectionVariant, fields: {} }); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Section eklenemedi.'); } finally { removeBusy('add-section'); }
    };

    const handleSaveSectionContent = async (sectionIndex: number, currentVariant: string) => {
        if (!workspace || !selectedPage) return;
        addBusy('save-section'); setError(null);
        try { await updateSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex, { variant: currentVariant, fields: sectionFieldsDraft }); await loadWorkspace(workspace.site.id); setEditingSectionIndex(null); setSectionFieldsDraft({}); }
        catch (e) { setError(e instanceof Error ? e.message : 'Section icerigi guncellenemedi.'); } finally { removeBusy('save-section'); }
    };

    const handleDeleteSection = async (sectionIndex: number) => {
        if (!workspace || !selectedPage) return;
        if (!window.confirm('Bu section\'i silmek istediginize emin misiniz?')) return;
        addBusy('delete-section'); setError(null);
        try { await deleteSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Section silinemedi.'); } finally { removeBusy('delete-section'); }
    };

    const handleMoveSection = async (sectionIndex: number, direction: 'up' | 'down') => {
        if (!workspace || !selectedPage) return;
        const nextOrder = selectedPage.sections.map((_, index) => index);
        const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
        if (targetIndex < 0 || targetIndex >= nextOrder.length) return;
        [nextOrder[sectionIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[sectionIndex]];
        addBusy('reorder-sections'); setError(null);
        try { await reorderSitePageSections(workspace.site.id, selectedPage.slug, nextOrder); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Section sirasi guncellenemedi.'); } finally { removeBusy('reorder-sections'); }
    };

    const handleDeletePage = async (pageSlug: string) => {
        if (!workspace) return;
        if (!window.confirm('Bu sayfayi silmek istediginize emin misiniz?')) return;
        addBusy('delete-page'); setError(null);
        try { await deleteSitePage(workspace.site.id, pageSlug); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Sayfa silinemedi.'); } finally { removeBusy('delete-page'); }
    };

    return {
        selectedPageSlug, setSelectedPageSlug, newPageTitle, setNewPageTitle, newPageSlug, setNewPageSlug,
        newSectionType, setNewSectionType, newSectionVariant, setNewSectionVariant,
        editingSectionIndex, setEditingSectionIndex, sectionFieldsDraft, setSectionFieldsDraft,
        pageTitleDraft, setPageTitleDraft, pageSlugDraft, setPageSlugDraft,
        pages, menuItems, previewChecks, selectedPage, previewTargets,
        selectedSectionDefinition, availableSectionVariants,
        getEditableFields, handleCreatePage, handleSavePageMeta, handleAddSection,
        handleSaveSectionContent, handleDeleteSection, handleMoveSection, handleDeletePage,
    };
}
