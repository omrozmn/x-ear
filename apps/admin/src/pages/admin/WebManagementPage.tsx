import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Paintbrush2, FileStack, Globe2, LayoutTemplate, MessageCircle, Package, Rocket, Sparkles, Store } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';
import {
    addSitePageSection,
    applyAiEdit,
    createSitePage,
    createPreview,
    createSiteFromAi,
    connectSiteDomain,
    deleteSitePageSection,
    listDomainProviders,
    loadSiteWorkspace,
    loadWebsiteGeneratorSnapshot,
    proposeAiEdit,
    publishSite,
    reorderSitePageSections,
    revertAiEdit,
    rollbackSite,
    searchSiteDomain,
    updateSitePage,
    updateSitePageSection,
    updateSiteTheme,
    type AIDiscoveryResponse,
    type AIDraftAnswers,
    type AIEditProposalResponse,
    type BuilderSectionRegistryResponse,
    type DomainAvailabilityResponse,
    type DomainProviderCatalogResponse,
    type SiteWorkspace,
    type ThemeSettings,
    type WebsiteGeneratorSnapshot,
} from '@/lib/website-generator-client';
import { WebsitePreviewCanvas } from '@/components/admin/web-management/WebsitePreviewCanvas';

type TabKey =
    | 'content'
    | 'appearance'
    | 'pages'
    | 'publishing'
    | 'blog'
    | 'products'
    | 'orders'
    | 'commerce'
    | 'appointments'
    | 'chatbot'
    | 'marketplace';

type DiscoveryAnswerKey = Exclude<keyof AIDraftAnswers, 'chatbot_mode'>;

const ACTIVE_SITE_STORAGE_KEY = 'xear.websiteGenerator.activeSiteId';
const PENDING_PREVIEW_COMMAND_STORAGE_KEY = 'xear.websiteGenerator.pendingPreviewCommand';

const aiQuestionGroups = [
    {
        title: 'Temel Site Yapisi',
        items: [
            'Urunlerinizi web sitenizde listelemek istiyor musunuz?',
            'Randevu veya form toplama alani olsun mu?',
            'WhatsApp iletisim butonu olsun mu?',
        ],
    },
    {
        title: 'Icerik ve Buyume',
        items: [
            'Blog bolumu olsun mu?',
            'Kampanya veya duyuru sayfasi ister misiniz?',
            'Yorumlar veya referanslar bolumu eklensin mi?',
        ],
    },
    {
        title: 'Satis ve Entegrasyon',
        items: [
            'Online satis ister misiniz?',
            'Pazaryeri baglantilari olsun mu?',
            'AI chatbot musteri destegi aktif olsun mu?',
        ],
    },
];

const featureCards: Array<{ key: DiscoveryAnswerKey; label: string; detail: string }> = [
    { key: 'blog', label: 'Blog Modulu', detail: 'Bilgilendirme, kampanya ve duyuru icerikleri' },
    { key: 'product_listing', label: 'Urun Modulu', detail: 'Katalog, markalar ve urun listeleme alanlari' },
    { key: 'ecommerce', label: 'E-Ticaret', detail: 'Siparis, odeme ve kargo surecleri' },
    { key: 'appointment_forms', label: 'Randevu ve Formlar', detail: 'Lead toplama ve randevu talepleri' },
    { key: 'whatsapp_contact', label: 'WhatsApp Iletisim', detail: 'Hizli destek ve donusum CTA alanlari' },
    { key: 'ai_chatbot', label: 'AI Chatbot', detail: 'SSS, katalog ve siparis destegi' },
    { key: 'marketplace_links', label: 'Pazaryeri Baglantilari', detail: 'Trendyol, Amazon, Hepsiburada yonlendirmeleri' },
];

const themeOptions: Array<{ key: string; label: string; detail: string; settings: ThemeSettings }> = [
    {
        key: 'hearing-center-modern',
        label: 'Hearing Center Modern',
        detail: 'Premium clinic hero, trust blocks, calm motion',
        settings: { primary_color: '#0f172a', accent_color: '#14b8a6', font_family: 'Manrope' },
    },
    {
        key: 'commerce-modern',
        label: 'Commerce Modern',
        detail: 'Snap commerce highlights, product storytelling, CTA rhythm',
        settings: { primary_color: '#111827', accent_color: '#f97316', font_family: 'Manrope' },
    },
    {
        key: 'soft-minimal',
        label: 'Soft Minimal',
        detail: 'Calm typography, lightweight motion, content-first layout',
        settings: { primary_color: '#1f2937', accent_color: '#8b5cf6', font_family: 'Instrument Sans' },
    },
];

const suggestedCommands = ['Hero basligini degistir', 'Blog ekle', 'E-ticareti ac', 'Footera Instagram ekle'];
const adminMenuToTabKey: Record<string, TabKey> = {
    'Icerik Yonetimi': 'content',
    'Gorunum Yonetimi': 'appearance',
    'Sayfa ve Menu Yonetimi': 'pages',
    Yayinlama: 'publishing',
    'Blog Yonetimi': 'blog',
    'Urun Yonetimi': 'products',
    Siparisler: 'orders',
    'Kargo / Odeme Ayarlari': 'commerce',
    'Randevu ve Formlar': 'appointments',
    'AI Chatbot': 'chatbot',
    'Pazaryeri Entegrasyonlari': 'marketplace',
};

function TabButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
        >
            {label}
        </button>
    );
}

const WebManagementPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [entryMode, setEntryMode] = useState<'template' | 'ai'>('ai');
    const [activeTab, setActiveTab] = useState<TabKey>('content');
    const [snapshot, setSnapshot] = useState<WebsiteGeneratorSnapshot | null>(null);
    const [workspace, setWorkspace] = useState<SiteWorkspace | null>(null);
    const [selectedTheme, setSelectedTheme] = useState('hearing-center-modern');
    const [siteName, setSiteName] = useState('X-Ear Hearing Center');
    const [siteSlug, setSiteSlug] = useState('x-ear-hearing-center');
    const [aiPrompt, setAiPrompt] = useState('Isitme merkezim icin modern bir site olustur. Randevu formu olsun, cihaz markalarini gosterelim ve WhatsApp aktif olsun.');
    const [chatCommand, setChatCommand] = useState('Hero basligini degistir');
    const [answers, setAnswers] = useState<AIDraftAnswers>({
        blog: true,
        product_listing: true,
        ecommerce: true,
        appointment_forms: true,
        whatsapp_contact: true,
        ai_chatbot: true,
        marketplace_links: true,
        chatbot_mode: 'platform_managed',
    });
    const [chatMessages, setChatMessages] = useState<string[]>([
        'Isletme ihtiyacini cikar, sonra feature config ve site draft olustur.',
    ]);
    const [discovery, setDiscovery] = useState<AIDiscoveryResponse | null>(null);
    const [proposal, setProposal] = useState<AIEditProposalResponse | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [domainProviders, setDomainProviders] = useState<DomainProviderCatalogResponse | null>(null);
    const [domainSearch, setDomainSearch] = useState<DomainAvailabilityResponse | null>(null);
    const [domainQuery, setDomainQuery] = useState('xear-clinic.com.tr');
    const [selectedDomainProvider, setSelectedDomainProvider] = useState('metunic');
    const [previewReviewTarget, setPreviewReviewTarget] = useState<{ key: string; label: string } | null>(null);
    const [selectedPageSlug, setSelectedPageSlug] = useState('/');
    const [newPageTitle, setNewPageTitle] = useState('Yeni Sayfa');
    const [newPageSlug, setNewPageSlug] = useState('/new-page');
    const [newSectionType, setNewSectionType] = useState('hero');
    const [newSectionVariant, setNewSectionVariant] = useState('hero-clinic-a');
    const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
    const [sectionTitleDraft, setSectionTitleDraft] = useState('');
    const [pageTitleDraft, setPageTitleDraft] = useState('Ana Sayfa');
    const [pageSlugDraft, setPageSlugDraft] = useState('/');

    const loadWorkspace = async (siteId: string) => {
        setBusyKey('load-workspace');
        setError(null);
        try {
            const nextWorkspace = await loadSiteWorkspace(siteId);
            setWorkspace(nextWorkspace);
            window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Web Yonetim workspace yuklenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const activeSiteId = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
        const pendingPreviewCommand = window.localStorage.getItem(PENDING_PREVIEW_COMMAND_STORAGE_KEY);
        if (pendingPreviewCommand) {
            setChatCommand(pendingPreviewCommand);
            setActiveTab('publishing');
            window.localStorage.removeItem(PENDING_PREVIEW_COMMAND_STORAGE_KEY);
        }

        loadWebsiteGeneratorSnapshot().then((data) => {
            if (!cancelled) {
                setSnapshot(data);
            }
        });

        listDomainProviders().then((data) => {
            if (!cancelled) {
                setDomainProviders(data);
            }
        });

        if (activeSiteId) {
            loadSiteWorkspace(activeSiteId)
                .then((data) => {
                    if (!cancelled) {
                        setWorkspace(data);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (workspace) {
            const activePreset = themeOptions.find(
                (theme) =>
                    theme.settings.primary_color === workspace.site.theme_settings.primary_color &&
                    theme.settings.accent_color === workspace.site.theme_settings.accent_color,
            );
            if (activePreset) {
                setSelectedTheme(activePreset.key);
            }
        }
    }, [workspace]);

    const visibleTabs = useMemo(() => {
        if (workspace?.adminMenu.visible_items.length) {
            return workspace.adminMenu.visible_items
                .map((item) => ({ key: adminMenuToTabKey[item.label], label: item.label }))
                .filter((item): item is { key: TabKey; label: string } => Boolean(item.key));
        }
        const featureFlags = workspace?.site.feature_flags ?? discovery?.inferred_features;
        return [
            { key: 'content' as const, label: 'Icerik Yonetimi' },
            { key: 'appearance' as const, label: 'Gorunum Yonetimi' },
            { key: 'pages' as const, label: 'Sayfa ve Menu Yonetimi' },
            { key: 'publishing' as const, label: 'Yayinlama' },
            ...(featureFlags?.blog ? [{ key: 'blog' as const, label: 'Blog Yonetimi' }] : []),
            ...(featureFlags?.product_listing ? [{ key: 'products' as const, label: 'Urun Yonetimi' }] : []),
            ...(featureFlags?.ecommerce ? [{ key: 'orders' as const, label: 'Siparisler' }, { key: 'commerce' as const, label: 'Kargo / Odeme Ayarlari' }] : []),
            ...(featureFlags?.appointment_forms ? [{ key: 'appointments' as const, label: 'Randevu ve Formlar' }] : []),
            ...(featureFlags?.ai_chatbot ? [{ key: 'chatbot' as const, label: 'AI Chatbot' }] : []),
            ...(featureFlags?.marketplace_links ? [{ key: 'marketplace' as const, label: 'Pazaryeri Entegrasyonlari' }] : []),
        ];
    }, [discovery?.inferred_features, workspace?.adminMenu.visible_items, workspace?.site.feature_flags]);

    useEffect(() => {
        if (!visibleTabs.some((tab) => tab.key === activeTab)) {
            setActiveTab(visibleTabs[0]?.key ?? 'content');
        }
    }, [activeTab, visibleTabs]);

    const activeFeatureCount = useMemo(
        () =>
            Object.values({
                blog: workspace?.site.feature_flags.blog ?? discovery?.inferred_features.blog ?? false,
                product_listing: workspace?.site.feature_flags.product_listing ?? discovery?.inferred_features.product_listing ?? false,
                ecommerce: workspace?.site.feature_flags.ecommerce ?? discovery?.inferred_features.ecommerce ?? false,
                appointment_forms: workspace?.site.feature_flags.appointment_forms ?? discovery?.inferred_features.appointment_forms ?? false,
                whatsapp_contact: workspace?.site.feature_flags.whatsapp_contact ?? discovery?.inferred_features.whatsapp_contact ?? false,
                ai_chatbot: workspace?.site.feature_flags.ai_chatbot ?? discovery?.inferred_features.ai_chatbot ?? false,
                marketplace_links: workspace?.site.feature_flags.marketplace_links ?? discovery?.inferred_features.marketplace_links ?? false,
            }).filter(Boolean).length,
        [discovery?.inferred_features, workspace?.site.feature_flags],
    );

    const pages = useMemo(() => workspace?.site.pages ?? [], [workspace?.site.pages]);
    const menuItems = useMemo(() => workspace?.site.menu_items ?? [], [workspace?.site.menu_items]);
    const previewChecks = useMemo(() => workspace?.previewStatus.checks ?? [], [workspace?.previewStatus.checks]);
    const sectionRegistry = snapshot?.sectionRegistry as BuilderSectionRegistryResponse | undefined;
    const selectedPage = pages.find((page) => page.slug === selectedPageSlug) ?? pages[0] ?? null;
    const previewTargets = pages.flatMap((page) =>
        page.sections.map((section) => ({
            key: `${page.slug}::${section.type}`,
            label: `${page.title} / ${section.type}`,
        })),
    );
    const selectedSectionDefinition = useMemo(
        () => sectionRegistry?.sections.find((section) => section.type === newSectionType),
        [newSectionType, sectionRegistry?.sections],
    );
    const availableSectionVariants = useMemo(
        () => selectedSectionDefinition?.variants ?? [],
        [selectedSectionDefinition],
    );

    useEffect(() => {
        if (pages.length > 0 && !pages.some((page) => page.slug === selectedPageSlug)) {
            setSelectedPageSlug(pages[0].slug);
        }
    }, [pages, selectedPageSlug]);

    useEffect(() => {
        if (availableSectionVariants.length > 0 && !availableSectionVariants.some((variant) => variant.key === newSectionVariant)) {
            setNewSectionVariant(availableSectionVariants[0].key);
        }
    }, [availableSectionVariants, newSectionVariant]);

    useEffect(() => {
        if (selectedPage) {
            setPageTitleDraft(selectedPage.title);
            setPageSlugDraft(selectedPage.slug);
        }
    }, [selectedPage]);

    const handleCreateDraft = async () => {
        setBusyKey('create-draft');
        setError(null);
        try {
            const result = await createSiteFromAi({
                prompt: aiPrompt,
                siteName,
                siteSlug,
                answers,
            });
            setDiscovery(result.discovery);
            setChatMessages((current) => [
                ...current,
                `AI draft olustu: ${result.site.name}`,
                `Oncelikli tema: ${result.draft.theme_key}`,
            ]);
            await loadWorkspace(result.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI draft olusturulamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleProposeEdit = async (command: string) => {
        if (!workspace) {
            setError('Chat ile duzenleme icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('propose-edit');
        setError(null);
        try {
            const nextProposal = await proposeAiEdit(workspace.site.id, command);
            setProposal(nextProposal);
            setChatMessages((current) => [...current, command, nextProposal.summary]);
            setChatCommand('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit onerisi olusturulamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleApplyProposal = async () => {
        if (!proposal || !workspace) {
            return;
        }
        setBusyKey('apply-proposal');
        setError(null);
        try {
            await applyAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((current) => (current ? { ...current, status: 'applied' } : current));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit uygulanamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleRevertProposal = async () => {
        if (!proposal || !workspace) {
            return;
        }
        setBusyKey('revert-proposal');
        setError(null);
        try {
            await revertAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((current) => (current ? { ...current, status: 'reverted' } : current));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit geri alinamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleApplyTheme = async () => {
        if (!workspace) {
            setError('Tema uygulamak icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        const theme = themeOptions.find((item) => item.key === selectedTheme);
        if (!theme) {
            return;
        }
        setBusyKey('apply-theme');
        setError(null);
        try {
            await updateSiteTheme(workspace.site.id, theme.settings);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Tema ayarlari guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handlePreview = async () => {
        if (!workspace) {
            setError('Preview icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('preview');
        setError(null);
        try {
            await createPreview(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Preview olusturulamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handlePublish = async () => {
        if (!workspace) {
            setError('Publish icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('publish');
        setError(null);
        try {
            await publishSite(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Publish islemi basarisiz oldu.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleRollback = async () => {
        if (!workspace) {
            setError('Rollback icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('rollback');
        setError(null);
        try {
            await rollbackSite(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Rollback islemi basarisiz oldu.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDomainSearch = async () => {
        if (!workspace) {
            setError('Domain aramak icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('domain-search');
        setError(null);
        try {
            const result = await searchSiteDomain(workspace.site.id, domainQuery);
            setDomainSearch(result);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Domain arama yapilamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleConnectDomain = async (domain: string) => {
        if (!workspace) {
            setError('Domain baglamak icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('connect-domain');
        setError(null);
        try {
            await connectSiteDomain(workspace.site.id, {
                domain,
                provider_key: selectedDomainProvider,
                activate_on_publish: true,
            });
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Domain baglama istegi olusturulamadi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handlePreviewTargetFeedback = (target: { key: string; label: string }) => {
        setPreviewReviewTarget(target);
        setChatCommand(`${target.label} kartini daha modern hale getir ve icerigi guclendir`);
        setActiveTab('content');
    };

    const handleCreatePage = async () => {
        if (!workspace) {
            setError('Sayfa eklemek icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        setBusyKey('create-page');
        setError(null);
        try {
            await createSitePage(workspace.site.id, {
                title: newPageTitle,
                slug: newPageSlug,
                sections: [],
            });
            await loadWorkspace(workspace.site.id);
            setSelectedPageSlug(newPageSlug);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Yeni sayfa eklenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleSavePageMeta = async () => {
        if (!workspace || !selectedPage) {
            setError('Guncellenecek sayfa bulunamadi.');
            return;
        }
        setBusyKey('save-page');
        setError(null);
        try {
            await updateSitePage(workspace.site.id, selectedPage.slug, {
                title: pageTitleDraft,
                slug: pageSlugDraft,
                sections: selectedPage.sections,
            });
            await loadWorkspace(workspace.site.id);
            setSelectedPageSlug(pageSlugDraft);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Sayfa bilgileri guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleAddSection = async () => {
        if (!workspace || !selectedPage) {
            setError('Section eklemek icin once bir sayfa secilmesi gerekiyor.');
            return;
        }
        setBusyKey('add-section');
        setError(null);
        try {
            await addSitePageSection(workspace.site.id, selectedPage.slug, {
                type: newSectionType,
                variant: newSectionVariant,
                fields: { title: `${selectedSectionDefinition?.label ?? newSectionType} basligi` },
            });
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section eklenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleSaveSectionContent = async (sectionIndex: number, currentVariant: string) => {
        if (!workspace || !selectedPage) {
            return;
        }
        setBusyKey('save-section');
        setError(null);
        try {
            await updateSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex, {
                variant: currentVariant,
                fields: { title: sectionTitleDraft },
            });
            await loadWorkspace(workspace.site.id);
            setEditingSectionIndex(null);
            setSectionTitleDraft('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section icerigi guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeleteSection = async (sectionIndex: number) => {
        if (!workspace || !selectedPage) {
            return;
        }
        setBusyKey('delete-section');
        setError(null);
        try {
            await deleteSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section silinemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleMoveSection = async (sectionIndex: number, direction: 'up' | 'down') => {
        if (!workspace || !selectedPage) {
            return;
        }
        const nextOrder = selectedPage.sections.map((_, index) => index);
        const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
        if (targetIndex < 0 || targetIndex >= nextOrder.length) {
            return;
        }
        [nextOrder[sectionIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[sectionIndex]];
        setBusyKey('reorder-sections');
        setError(null);
        try {
            await reorderSitePageSections(workspace.site.id, selectedPage.slug, nextOrder);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section sirasi guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const tabContent: Record<TabKey, React.ReactNode> = {
        content: (
            <div className="grid gap-4 lg:grid-cols-2">
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
                                                <input value={sectionTitleDraft} onChange={(event) => setSectionTitleDraft(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" placeholder="Section basligi" />
                                                <button onClick={() => handleSaveSectionContent(index, section.variant)} className="rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white">
                                                    Kaydet
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <div className="text-sm text-gray-600">{String(section.fields.title ?? 'Baslik veya icerik girilmemis.')}</div>
                                                <button
                                                    onClick={() => {
                                                        setEditingSectionIndex(index);
                                                        setSectionTitleDraft(String(section.fields.title ?? ''));
                                                    }}
                                                    className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
                                                >
                                                    Icerigi Duzenle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Henüz olusturulmus bir draft yok.</div>
                        )}
                    </div>
                </div>
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
                        <button onClick={handleAddSection} disabled={!selectedPage || busyKey === 'add-section'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                            {busyKey === 'add-section' ? 'Ekleniyor...' : 'Section Ekle'}
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
            </div>
        ),
        appearance: (
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
                        disabled={!workspace || busyKey === 'apply-theme'}
                        className="mt-4 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {busyKey === 'apply-theme' ? 'Uygulaniyor...' : 'Temayi Uygula'}
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
        ),
        pages: (
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
                            <button onClick={handleCreatePage} disabled={!workspace || busyKey === 'create-page'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'create-page' ? 'Ekleniyor...' : 'Sayfa Ekle'}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-gray-200">
                        <div className="text-sm font-semibold text-gray-900">Secilen Sayfa Bilgileri</div>
                        <div className="mt-3 grid gap-3">
                            <input value={pageTitleDraft} onChange={(event) => setPageTitleDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                            <input value={pageSlugDraft} onChange={(event) => setPageSlugDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                            <button onClick={handleSavePageMeta} disabled={!selectedPage || busyKey === 'save-page'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'save-page' ? 'Kaydediliyor...' : 'Sayfa Bilgilerini Kaydet'}
                            </button>
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
        ),
        publishing: (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Draft ve Readiness Durumu</h3>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li>Preview state: {workspace?.previewStatus.preview_state ?? 'bekleniyor'}</li>
                        <li>Publish state: {workspace?.previewStatus.publish_state ?? 'bekleniyor'}</li>
                        <li>Release status: {workspace?.publishStatus.status ?? 'draft'}</li>
                    </ul>
                    <div className="mt-4 space-y-2">
                        {previewChecks.map((check) => (
                            <div key={check.key} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div className="font-medium">{check.label}</div>
                                <div className="mt-1 text-xs text-gray-500">{check.status} - {check.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-3xl bg-gray-900 p-6 text-white">
                    <h3 className="text-lg font-semibold">Canliya Alma</h3>
                    <p className="mt-2 text-sm text-gray-300">Preview, publish ve rollback akislari bu sekmeden yonetilir.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={handlePreview} disabled={!workspace || busyKey === 'preview'} className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-60">
                            {busyKey === 'preview' ? 'Hazirlaniyor...' : 'Preview Ac'}
                        </button>
                        <button onClick={handlePublish} disabled={!workspace || busyKey === 'publish'} className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-gray-950 disabled:cursor-not-allowed disabled:opacity-60">
                            {busyKey === 'publish' ? 'Publish...' : 'Publish Et'}
                        </button>
                        <button onClick={handleRollback} disabled={!workspace || busyKey === 'rollback'} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                            {busyKey === 'rollback' ? 'Rollback...' : 'Rollback'}
                        </button>
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-gray-300">
                        <div>Preview URL: {workspace?.publishStatus.preview_url ?? '-'}</div>
                        <div>Published URL: {workspace?.publishStatus.published_url ?? '-'}</div>
                        <div>Release ID: {workspace?.publishStatus.active_release_id ?? '-'}</div>
                        <div>Workspace domain: {workspace?.domainSetup.workspace_domain ?? '-'}</div>
                        <div>Primary domain: {workspace?.domainSetup.current_primary_domain ?? '-'}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Preview Shell</h3>
                    <div className="mt-4 grid gap-4">
                        {workspace ? <WebsitePreviewCanvas site={workspace.site} pageSlug={selectedPageSlug} selectedTargetKey={previewReviewTarget?.key} onSelectTarget={handlePreviewTargetFeedback} /> : (
                            <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-sm text-slate-200">
                                Preview icin once aktif bir site gerekiyor.
                            </div>
                        )}
                        <div className="rounded-3xl bg-gray-50 p-4">
                            <div className="text-sm font-semibold text-gray-900">Preview icinden AI geri bildirim</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {previewTargets.length > 0 ? (
                                    previewTargets.map((target) => (
                                        <button
                                            key={target.key}
                                            onClick={() => handlePreviewTargetFeedback(target)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                previewReviewTarget?.key === target.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'
                                            }`}
                                        >
                                            {target.label}
                                        </button>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500">Review hedefi olusmasi icin section iceren bir draft gerekiyor.</span>
                                )}
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                                Bir hedef secip chat komutunu otomatik doldurabilir, sonra AI&apos;a karti veya icerigi degistir diyebilirsin.
                            </div>
                            <a href="/web-management-preview" className="mt-4 inline-flex rounded-2xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white">
                                Ayrı preview sayfasinda ac
                            </a>
                        </div>
                        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-gray-900">Domain ve Yayin Domaini</h4>
                                    <p className="mt-1 text-sm text-gray-500">Site ilk olarak workspace domain ile olusur, sonra custom domain baglanir.</p>
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="text-xs uppercase tracking-wide text-gray-500">Workspace</div>
                                    <div className="mt-1 font-medium">{workspace?.domainSetup.workspace_domain ?? '-'}</div>
                                </div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="text-xs uppercase tracking-wide text-gray-500">Custom Domain</div>
                                    <div className="mt-1 font-medium">{workspace?.domainSetup.custom_domain ?? 'Baglanmadi'}</div>
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_160px]">
                                <input value={domainQuery} onChange={(event) => setDomainQuery(event.target.value)} className="rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" placeholder="ornek: markaniz.com.tr" />
                                <select value={selectedDomainProvider} onChange={(event) => setSelectedDomainProvider(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                                    {(domainProviders?.providers ?? []).map((provider) => (
                                        <option key={provider.key} value={provider.key}>
                                            {provider.label}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={handleDomainSearch} disabled={!workspace || busyKey === 'domain-search'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                    {busyKey === 'domain-search' ? 'Araniyor...' : 'Domain Ara'}
                                </button>
                            </div>
                            <div className="mt-4 space-y-3">
                                {(domainSearch?.results ?? []).map((result) => (
                                    <div key={`${result.provider_key}-${result.domain}`} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="font-medium">{result.domain}</div>
                                                <div className="mt-1 text-xs text-gray-500">{result.provider_key} - {result.price_note}</div>
                                            </div>
                                            <button
                                                onClick={() => handleConnectDomain(result.domain)}
                                                disabled={!result.available || busyKey === 'connect-domain'}
                                                className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {result.available ? 'Bagla' : 'Dolu'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        blog: (
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
                                    <div className="font-medium">{post.title}</div>
                                    <div className="mt-1 text-xs text-gray-500">{post.slug} - {post.status}</div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Blog aktif ama henuz yazi yok.</div>
                        )}
                    </div>
                </div>
            </div>
        ),
        products: (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Katalog Ayarlari</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Gorunum modu: {workspace?.site.product_catalog_settings?.display_mode ?? '-'}</div>
                        <div>One cikan SKU sayisi: {workspace?.site.product_catalog_settings?.featured_skus.length ?? 0}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Urunler</h3>
                    <div className="mt-4 space-y-3">
                        {(workspace?.site.products ?? []).length > 0 ? (
                            workspace?.site.products?.map((product) => (
                                <div key={product.sku} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="mt-1 text-xs text-gray-500">{product.sku} - {product.price} {product.currency}</div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Katalog aktif ama henuz urun eklenmemis.</div>
                        )}
                    </div>
                </div>
            </div>
        ),
        orders: (
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Siparisler</h3>
                <div className="mt-4 space-y-3">
                    {(workspace?.site.orders ?? []).length > 0 ? (
                        workspace?.site.orders?.map((order) => (
                            <div key={order.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div className="font-medium">{order.id}</div>
                                <div className="mt-1 text-xs text-gray-500">{order.customer_name} - {order.status} - {order.total_amount} {order.currency}</div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Siparis bulunmuyor.</div>
                    )}
                </div>
            </div>
        ),
        commerce: (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Kargo ve Odeme Ayarlari</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Currency: {workspace?.site.commerce_settings?.currency ?? '-'}</div>
                        <div>Checkout: {workspace?.site.commerce_settings?.checkout_mode ?? '-'}</div>
                        <div>Kargo aktif: {workspace?.site.commerce_settings?.shipping_enabled ? 'Evet' : 'Hayir'}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Odeme Metotlari</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {(workspace?.site.commerce_settings?.payment_methods ?? []).map((method) => (
                            <span key={method} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                {method}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ),
        appointments: (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Randevu Ayarlari</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Mod: {workspace?.site.appointment_settings?.booking_mode ?? '-'}</div>
                        <div>Telefon topla: {workspace?.site.appointment_settings?.collect_phone ? 'Evet' : 'Hayir'}</div>
                        <div>Bildirim email: {workspace?.site.appointment_settings?.notification_email ?? '-'}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Lead Listesi</h3>
                    <div className="mt-4 space-y-3">
                        {(workspace?.site.leads ?? []).length > 0 ? (
                            workspace?.site.leads?.map((lead) => (
                                <div key={lead.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="font-medium">{lead.name}</div>
                                    <div className="mt-1 text-xs text-gray-500">{lead.source} - {lead.status}</div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Lead bulunmuyor.</div>
                        )}
                    </div>
                </div>
            </div>
        ),
        chatbot: (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">AI Chatbot Ayarlari</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Mode: {workspace?.site.chatbot_settings?.mode ?? '-'}</div>
                        <div>Mesaj limiti: {workspace?.site.chatbot_settings?.monthly_message_limit ?? 0}</div>
                        <div>Handoff: {workspace?.site.chatbot_settings?.handoff_channel ?? '-'}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Yetkinlikler</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {(workspace?.site.chatbot_settings?.enabled_capabilities ?? []).map((capability) => (
                            <span key={capability} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                {capability}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ),
        marketplace: (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Pazaryeri Ayarlari</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Gorunum: {workspace?.site.marketplace_settings?.display_mode ?? '-'}</div>
                        <div>WhatsApp CTA: {workspace?.site.whatsapp_settings?.enabled ? 'Destekli' : 'Kapali'}</div>
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bagli Kanallar</h3>
                    <div className="mt-4 space-y-3">
                        {(workspace?.site.marketplace_links_data ?? []).length > 0 ? (
                            workspace?.site.marketplace_links_data?.map((item) => (
                                <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="font-medium">{item.label}</div>
                                    <div className="mt-1 text-xs text-gray-500">{item.provider} - {item.url}</div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Bagli pazaryeri linki yok.</div>
                        )}
                    </div>
                </div>
            </div>
        ),
    };

    return (
        <div className={isMobile ? 'mx-auto max-w-7xl p-4 pb-safe' : 'mx-auto max-w-7xl p-6'}>
            <div className="rounded-[2rem] bg-gradient-to-br from-gray-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
                            <Globe2 className="h-4 w-4" />
                            Web Yonetim
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">AI ve panel ile website olusturma ve yonetme</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            Kullanici ister panelden hazir sablonla, ister AI ile site olusturur. Sonra ayni drafti sekmeler altindan duzenler, preview eder ve publish eder.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setEntryMode('template')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'template' ? 'bg-white text-gray-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                            Hazir Sablonla Olustur
                        </button>
                        <button
                            onClick={() => setEntryMode('ai')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'ai' ? 'bg-emerald-300 text-gray-950' : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'}`}
                        >
                            <Sparkles className="h-4 w-4" />
                            Yapay Zeka ile Olustur
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        {entryMode === 'ai' ? <Bot className="h-5 w-5 text-sky-500" /> : <Paintbrush2 className="h-5 w-5 text-fuchsia-500" />}
                        <h2 className="text-lg font-semibold text-gray-900">
                            {entryMode === 'ai' ? 'AI Onboarding Akisi' : 'Hazir Sablon Baslangici'}
                        </h2>
                    </div>

                    {entryMode === 'ai' ? (
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
                                disabled={busyKey === 'create-draft'}
                                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {busyKey === 'create-draft' ? 'Draft olusturuluyor...' : 'AI ile Taslak Olustur'}
                            </button>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            {[
                                { icon: LayoutTemplate, title: 'Tema Sec', detail: 'Health, clinic ve commerce presetleri' },
                                { icon: FileStack, title: 'Sayfa Seti', detail: 'Ana sayfa, hakkimizda, iletisim ve opsiyonel moduller' },
                                { icon: Rocket, title: 'Draft Baslat', detail: 'Kullanici sonra panel veya chat ile duzenler' },
                            ].map((item) => (
                                <div key={item.title} className="rounded-3xl bg-gray-50 p-5">
                                    <item.icon className="h-5 w-5 text-gray-700" />
                                    <h3 className="mt-3 text-sm font-semibold text-gray-900">{item.title}</h3>
                                    <p className="mt-2 text-sm text-gray-500">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Modul Aktivasyonlari</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                        {featureCards.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setAnswers((current) => ({ ...current, [item.key]: !current[item.key] }))}
                                className={`flex w-full items-start justify-between rounded-3xl px-4 py-4 text-left ring-1 transition-colors ${
                                    answers[item.key] ? 'bg-emerald-50 ring-emerald-200' : 'bg-gray-50 ring-gray-200'
                                }`}
                            >
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                                    <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                                </div>
                                <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${answers[item.key] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {answers[item.key] ? 'Aktif' : 'Pasif'}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chatbot Faturalama Modu</div>
                        <div className="mt-3 flex gap-2">
                            {[
                                { key: 'platform_managed', label: 'Biz Yonetelim' },
                                { key: 'bring_your_own_api', label: 'Kendi API Anahtari' },
                            ].map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => setAnswers((current) => ({ ...current, chatbot_mode: option.key as AIDraftAnswers['chatbot_mode'] }))}
                                    className={`rounded-2xl px-3 py-2 text-xs font-medium ${answers.chatbot_mode === option.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
                {[
                    {
                        title: 'Service Baglantisi',
                        value: snapshot?.featureCatalog ? 'Hazir' : 'Bekleniyor',
                        detail: snapshot?.baseUrl ?? 'Website Generator API baglantisi',
                    },
                    {
                        title: 'x-ear Checklist',
                        value: snapshot?.xearChecklist ? 'Yuklendi' : 'Bekleniyor',
                        detail: 'Host uyumluluk checklist surface',
                    },
                    {
                        title: 'Active Site',
                        value: workspace?.site.name ?? 'Yok',
                        detail: workspace?.site.slug ?? 'Olusturulmus aktif site bekleniyor',
                    },
                    {
                        title: 'Visible Tabs',
                        value: `${visibleTabs.length}`,
                        detail: `${activeFeatureCount} aktif modul / feature`,
                    },
                ].map((item) => (
                    <div key={item.title} className="rounded-3xl bg-white p-5 ring-1 ring-gray-200">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.title}</div>
                        <div className="mt-3 text-lg font-semibold text-gray-900">{item.value}</div>
                        <div className="mt-2 text-sm text-gray-500">{item.detail}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        <h2 className="text-lg font-semibold text-gray-900">AI Chat ile Duzenleme</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                        {chatMessages.map((message, index) => (
                            <div
                                key={`${message}-${index}`}
                                className={`rounded-3xl px-4 py-3 text-sm ${
                                    index % 2 === 0 ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
                                }`}
                            >
                                {message}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                        <div className="flex flex-col gap-3">
                            <input value={chatCommand} onChange={(event) => setChatCommand(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Ornek: Blog ekle" />
                            <button onClick={() => handleProposeEdit(chatCommand)} disabled={!chatCommand || busyKey === 'propose-edit'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'propose-edit' ? 'Oneri hazirlaniyor...' : 'AI Onerisi Uret'}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {suggestedCommands.map((command) => (
                            <button
                                key={command}
                                onClick={() => setChatCommand(command)}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                            >
                                {command}
                            </button>
                        ))}
                    </div>
                    {proposal ? (
                        <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-sm font-semibold text-gray-900">Son Oneri</div>
                            <div className="mt-2 text-sm text-gray-600">{proposal.summary}</div>
                            <div className="mt-2 text-xs text-gray-500">Durum: {proposal.status}</div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={handleApplyProposal} disabled={proposal.status !== 'proposed' || busyKey === 'apply-proposal'} className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                                    Uygula
                                </button>
                                <button onClick={handleRevertProposal} disabled={proposal.status !== 'applied' || busyKey === 'revert-proposal'} className="rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                                    Geri Al
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <LayoutTemplate className="h-5 w-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Olusturulan Draft Ozeti</h2>
                    </div>
                    <div className="mt-5 grid gap-3">
                        {[
                            `Tema: ${selectedTheme}`,
                            `Gorunen sekme sayisi: ${visibleTabs.length}`,
                            `AI mesaj sayisi: ${chatMessages.length}`,
                            `Aktif modul sayisi: ${activeFeatureCount}`,
                            `Menu item sayisi: ${workspace?.adminMenu.visible_items.length ?? 0}`,
                        ].map((item) => (
                            <div key={item} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                {item}
                            </div>
                        ))}
                    </div>
                    {discovery ? (
                        <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4">
                            <div className="text-sm font-semibold text-sky-900">AI Discovery Sonucu</div>
                            <div className="mt-2 text-sm text-sky-800">Site tipi: {discovery.inferred_site_type}</div>
                            <div className="mt-1 text-sm text-sky-800">Onerilen tema: {discovery.suggested_theme_key}</div>
                            <div className="mt-3 space-y-2">
                                {discovery.questions.map((question) => (
                                    <div key={question.key} className="rounded-2xl bg-white px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200">
                                        {question.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Web Yonetim Sekmeleri</h2>
                </div>
                <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                    {visibleTabs.map((tab) => (
                        <TabButton
                            key={tab.key}
                            label={tab.label}
                            active={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                        />
                    ))}
                </div>
                <div className="mt-6">{tabContent[activeTab]}</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                    { icon: Sparkles, title: 'AI ile Taslak Olustur', detail: 'Kullanici prompt verir, AI discovery ve draft cikarir.' },
                    { icon: MessageCircle, title: 'Chat ile Duzenle', detail: 'AI edit proposal olusur, host admin icinden uygula veya geri al.' },
                    { icon: Globe2, title: 'Preview ve Publish', detail: 'Draft ayni panelden preview edilir, publish edilir ve rollback desteklenir.' },
                ].map((card) => (
                    <div key={card.title} className="rounded-3xl bg-white p-5 ring-1 ring-gray-200">
                        <card.icon className="h-5 w-5 text-gray-700" />
                        <h3 className="mt-3 text-sm font-semibold text-gray-900">{card.title}</h3>
                        <p className="mt-2 text-sm text-gray-500">{card.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WebManagementPage;
