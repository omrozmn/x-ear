/* eslint-disable no-restricted-syntax */
import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Paintbrush2, Globe2, LayoutTemplate, MessageCircle, Package, Plus, Settings, Sparkles, Store, Trash2 } from 'lucide-react';
import { useBreakpoints } from '@/hooks/useMediaQuery';
import {
    addSitePageSection,
    applyAiEdit,
    createBlogPost,
    createMarketplaceLink,
    createProduct,
    createSitePage,
    createPreview,
    createSiteFromAi,
    createSiteFromWizard,
    connectSiteDomain,
    deleteBlogPost,
    deleteMarketplaceLink,
    deleteProduct,
    deleteSitePage,
    deleteSitePageSection,
    getPlatformSettings,
    listDomainProviders,
    listWizardTemplates,
    loadSiteWorkspace,
    loadWebsiteGeneratorSnapshot,
    proposeAiEdit,
    publishSite,
    reorderSitePageSections,
    revertAiEdit,
    rollbackSite,
    searchSiteDomain,
    updatePlatformSettings,
    deletePlatformSetting,
    updateSitePage,
    updateSitePageSection,
    updateSiteTheme,
    updateSiteFeatureFlags,
    type AIDiscoveryResponse,
    type AIDraftAnswers,
    type AIEditProposalResponse,
    type BuilderSectionRegistryResponse,
    type DomainAvailabilityResponse,
    type DomainProviderCatalogResponse,
    type EditableFieldDefinition,
    type PlatformSettingsResponse,
    type SiteWorkspace,
    type ThemeSettings,
    type WebsiteGeneratorSnapshot,
    type WizardTemplate,
} from '@/lib/website-generator-client';
import { WebsitePreviewCanvas } from '@/components/website-builder/WebsitePreviewCanvas';

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
    | 'marketplace'
    | 'settings';

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
    'Platform Ayarlari': 'settings',
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

const WebsiteBuilderPage: React.FC = () => {
    const { isMobile } = useBreakpoints();
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
    const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
    const addBusy = (key: string) => setBusyKeys((prev) => new Set(prev).add(key));
    const removeBusy = (key: string) => setBusyKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    const isBusy = (key: string) => busyKeys.has(key);
    const isAnyBusy = busyKeys.size > 0;
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
    const [sectionFieldsDraft, setSectionFieldsDraft] = useState<Record<string, unknown>>({});
    const [pageTitleDraft, setPageTitleDraft] = useState('Ana Sayfa');
    const [pageSlugDraft, setPageSlugDraft] = useState('/');
    const [wizardTemplates, setWizardTemplates] = useState<WizardTemplate[]>([]);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
    const [wizardSiteName, setWizardSiteName] = useState('');
    const [wizardPhone, setWizardPhone] = useState('');
    const [wizardEmail, setWizardEmail] = useState('');
    const [platformSettings, setPlatformSettings] = useState<PlatformSettingsResponse | null>(null);
    const [platformSettingsDraft, setPlatformSettingsDraft] = useState<Record<string, string>>({});
    const [newBlogTitle, setNewBlogTitle] = useState('');
    const [newBlogSlug, setNewBlogSlug] = useState('');
    const [newBlogExcerpt, setNewBlogExcerpt] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newMarketplaceProvider, setNewMarketplaceProvider] = useState('trendyol');
    const [newMarketplaceLabel, setNewMarketplaceLabel] = useState('');
    const [newMarketplaceUrl, setNewMarketplaceUrl] = useState('');

    const loadWorkspace = async (siteId: string) => {
        addBusy('load-workspace');
        setError(null);
        try {
            const nextWorkspace = await loadSiteWorkspace(siteId);
            setWorkspace(nextWorkspace);
            window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Web Yonetim workspace yuklenemedi.');
        } finally {
            removeBusy('load-workspace');
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

        listWizardTemplates().then((data) => {
            if (!cancelled) {
                setWizardTemplates(data.templates);
                if (data.templates.length > 0) {
                    setSelectedTemplateKey(data.templates[0].key);
                }
            }
        }).catch(() => {});

        getPlatformSettings().then((data) => {
            if (!cancelled) {
                setPlatformSettings(data);
            }
        }).catch(() => {});

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
            { key: 'settings' as const, label: 'Platform Ayarlari' },
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

    const getEditableFields = (sectionType: string, variantKey: string): EditableFieldDefinition[] => {
        const sectionDef = sectionRegistry?.sections.find((s) => s.type === sectionType);
        const variantDef = sectionDef?.variants.find((v) => v.key === variantKey);
        return variantDef?.editable_fields ?? [];
    };

    const handleCreateDraft = async () => {
        if (!siteName.trim() || !siteSlug.trim()) { setError('Site adi ve slug bos birakilamaz.'); return; }
        addBusy('create-draft');
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
            removeBusy('create-draft');
        }
    };

    const handleProposeEdit = async (command: string) => {
        if (!workspace) {
            setError('Chat ile duzenleme icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('propose-edit');
        setError(null);
        try {
            const nextProposal = await proposeAiEdit(workspace.site.id, command);
            setProposal(nextProposal);
            setChatMessages((current) => [...current, command, nextProposal.summary]);
            setChatCommand('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit onerisi olusturulamadi.');
        } finally {
            removeBusy('propose-edit');
        }
    };

    const handleApplyProposal = async () => {
        if (!proposal || !workspace) {
            return;
        }
        addBusy('apply-proposal');
        setError(null);
        try {
            await applyAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((current) => (current ? { ...current, status: 'applied' } : current));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit uygulanamadi.');
        } finally {
            removeBusy('apply-proposal');
        }
    };

    const handleRevertProposal = async () => {
        if (!proposal || !workspace) {
            return;
        }
        addBusy('revert-proposal');
        setError(null);
        try {
            await revertAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((current) => (current ? { ...current, status: 'reverted' } : current));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'AI edit geri alinamadi.');
        } finally {
            removeBusy('revert-proposal');
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
        addBusy('apply-theme');
        setError(null);
        try {
            await updateSiteTheme(workspace.site.id, theme.settings);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Tema ayarlari guncellenemedi.');
        } finally {
            removeBusy('apply-theme');
        }
    };

    const handlePreview = async () => {
        if (!workspace) {
            setError('Preview icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('preview');
        setError(null);
        try {
            await createPreview(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Preview olusturulamadi.');
        } finally {
            removeBusy('preview');
        }
    };

    const handlePublish = async () => {
        if (!workspace) {
            setError('Publish icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('publish');
        setError(null);
        try {
            await publishSite(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Publish islemi basarisiz oldu.');
        } finally {
            removeBusy('publish');
        }
    };

    const handleRollback = async () => {
        if (!workspace) {
            setError('Rollback icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('rollback');
        setError(null);
        try {
            await rollbackSite(workspace.site.id);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Rollback islemi basarisiz oldu.');
        } finally {
            removeBusy('rollback');
        }
    };

    const handleDomainSearch = async () => {
        if (!workspace) {
            setError('Domain aramak icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('domain-search');
        setError(null);
        try {
            const result = await searchSiteDomain(workspace.site.id, domainQuery);
            setDomainSearch(result);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Domain arama yapilamadi.');
        } finally {
            removeBusy('domain-search');
        }
    };

    const handleConnectDomain = async (domain: string) => {
        if (!workspace) {
            setError('Domain baglamak icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('connect-domain');
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
            removeBusy('connect-domain');
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
        addBusy('create-page');
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
            removeBusy('create-page');
        }
    };

    const handleSavePageMeta = async () => {
        if (!workspace || !selectedPage) {
            setError('Guncellenecek sayfa bulunamadi.');
            return;
        }
        addBusy('save-page');
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
            removeBusy('save-page');
        }
    };

    const handleAddSection = async () => {
        if (!workspace || !selectedPage) {
            setError('Section eklemek icin once bir sayfa secilmesi gerekiyor.');
            return;
        }
        addBusy('add-section');
        setError(null);
        try {
            await addSitePageSection(workspace.site.id, selectedPage.slug, {
                type: newSectionType,
                variant: newSectionVariant,
                fields: {},
            });
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section eklenemedi.');
        } finally {
            removeBusy('add-section');
        }
    };

    const handleSaveSectionContent = async (sectionIndex: number, currentVariant: string) => {
        if (!workspace || !selectedPage) {
            return;
        }
        addBusy('save-section');
        setError(null);
        try {
            await updateSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex, {
                variant: currentVariant,
                fields: sectionFieldsDraft,
            });
            await loadWorkspace(workspace.site.id);
            setEditingSectionIndex(null);
            setSectionFieldsDraft({});
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section icerigi guncellenemedi.');
        } finally {
            removeBusy('save-section');
        }
    };

    const handleDeleteSection = async (sectionIndex: number) => {
        if (!workspace || !selectedPage) {
            return;
        }
        if (!window.confirm('Bu ogesi silmek istediginize emin misiniz?')) return;
        addBusy('delete-section');
        setError(null);
        try {
            await deleteSitePageSection(workspace.site.id, selectedPage.slug, sectionIndex);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section silinemedi.');
        } finally {
            removeBusy('delete-section');
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
        addBusy('reorder-sections');
        setError(null);
        try {
            await reorderSitePageSections(workspace.site.id, selectedPage.slug, nextOrder);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Section sirasi guncellenemedi.');
        } finally {
            removeBusy('reorder-sections');
        }
    };

    const handleCreateFromWizard = async () => {
        if (!selectedTemplateKey || !wizardSiteName.trim()) {
            setError('Lutfen bir sablon secin ve site adi girin.');
            return;
        }
        addBusy('create-wizard');
        setError(null);
        try {
            const result = await createSiteFromWizard({
                template_key: selectedTemplateKey,
                site_name: wizardSiteName,
                phone_number: wizardPhone || undefined,
                email: wizardEmail || undefined,
            });
            await loadWorkspace(result.site.id);
            setChatMessages((current) => [...current, `Sablon ile olusturuldu: ${result.message}`]);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Sablondan site olusturulamadi.');
        } finally {
            removeBusy('create-wizard');
        }
    };

    const handleAddBlogPost = async () => {
        if (!workspace || !newBlogTitle.trim()) return;
        addBusy('add-blog');
        setError(null);
        try {
            const slug = newBlogSlug || newBlogTitle.toLowerCase().replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/İ/g,'i').replace(/Ö/g,'o').replace(/Ü/g,'u').replace(/Ç/g,'c').replace(/Ş/g,'s').replace(/Ğ/g,'g').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            await createBlogPost(workspace.site.id, {
                slug,
                title: newBlogTitle,
                excerpt: newBlogExcerpt || newBlogTitle,
                body: '',
                status: 'draft',
                categories: [],
            });
            await loadWorkspace(workspace.site.id);
            setNewBlogTitle('');
            setNewBlogSlug('');
            setNewBlogExcerpt('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Blog yazisi eklenemedi.');
        } finally {
            removeBusy('add-blog');
        }
    };

    const handleDeleteBlogPost = async (postSlug: string) => {
        if (!workspace) return;
        if (!window.confirm('Bu ogesi silmek istediginize emin misiniz?')) return;
        addBusy('delete-blog');
        setError(null);
        try {
            await deleteBlogPost(workspace.site.id, postSlug);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Blog yazisi silinemedi.');
        } finally {
            removeBusy('delete-blog');
        }
    };

    const handleAddProduct = async () => {
        if (!workspace || !newProductName.trim()) return;
        setBusyKey('add-product');
        setError(null);
        try {
            const sku = newProductSku || `SKU-${Date.now()}`;
            const slug = newProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            await createProduct(workspace.site.id, {
                sku,
                slug,
                name: newProductName,
                description: '',
                price: Number(newProductPrice) || 0,
                currency: 'TRY',
                status: 'draft',
                in_stock: true,
            });
            await loadWorkspace(workspace.site.id);
            setNewProductName('');
            setNewProductSku('');
            setNewProductPrice('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Urun eklenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeleteProduct = async (productSku: string) => {
        if (!workspace) return;
        setBusyKey('delete-product');
        setError(null);
        try {
            await deleteProduct(workspace.site.id, productSku);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Urun silinemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleAddMarketplaceLink = async () => {
        if (!workspace || !newMarketplaceLabel.trim() || !newMarketplaceUrl.trim()) return;
        setBusyKey('add-marketplace');
        setError(null);
        try {
            await createMarketplaceLink(workspace.site.id, {
                provider: newMarketplaceProvider,
                label: newMarketplaceLabel,
                url: newMarketplaceUrl,
                visible: true,
            });
            await loadWorkspace(workspace.site.id);
            setNewMarketplaceLabel('');
            setNewMarketplaceUrl('');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Pazaryeri linki eklenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeleteMarketplaceLink = async (linkId: string) => {
        if (!workspace) return;
        setBusyKey('delete-marketplace');
        setError(null);
        try {
            await deleteMarketplaceLink(workspace.site.id, linkId);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Pazaryeri linki silinemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeletePage = async (pageSlug: string) => {
        if (!workspace) return;
        setBusyKey('delete-page');
        setError(null);
        try {
            await deleteSitePage(workspace.site.id, pageSlug);
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Sayfa silinemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleSavePlatformSettings = async () => {
        setBusyKey('save-settings');
        setError(null);
        try {
            const cleanPayload: Record<string, string> = {};
            for (const [key, value] of Object.entries(platformSettingsDraft)) {
                if (value && !value.includes('****')) {
                    cleanPayload[key] = value;
                }
            }
            const updated = await updatePlatformSettings(cleanPayload);
            setPlatformSettings(updated);
            setPlatformSettingsDraft({});
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Platform ayarlari guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeletePlatformSetting = async (key: string) => {
        setBusyKey('delete-setting');
        setError(null);
        try {
            const updated = await deletePlatformSetting(key);
            setPlatformSettings(updated);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Ayar silinemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
        if (!workspace) return;
        setBusyKey('toggle-feature');
        setError(null);
        try {
            await updateSiteFeatureFlags(workspace.site.id, { [featureKey]: enabled });
            await loadWorkspace(workspace.site.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Ozellik guncellenemedi.');
        } finally {
            setBusyKey(null);
        }
    };

    const renderFieldInput = (field: EditableFieldDefinition, value: unknown, onChange: (val: unknown) => void) => {
        switch (field.field_type) {
            case 'textarea':
            case 'rich_text':
                return (
                    <textarea
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder ?? ''}
                        rows={3}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                    />
                );
            case 'boolean':
                return (
                    <button
                        onClick={() => onChange(!value)}
                        className={`rounded-2xl px-3 py-2 text-xs font-medium ${value ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        {value ? 'Aktif' : 'Pasif'}
                    </button>
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={String(value ?? '')}
                        onChange={(e) => onChange(Number(e.target.value))}
                        placeholder={field.placeholder ?? ''}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                    />
                );
            case 'select':
                return (
                    <select
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    >
                        <option value="">Seciniz</option>
                        {(field.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'color':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={String(value ?? '#000000')}
                            onChange={(e) => onChange(e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded-xl border border-gray-200"
                        />
                        <input
                            type="text"
                            value={String(value ?? '')}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                        />
                    </div>
                );
            default:
                return (
                    <input
                        type={field.field_type === 'url' ? 'url' : 'text'}
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder ?? ''}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                    />
                );
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
            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Sayfa gorunum stüdyosu</h3>
                            <p className="mt-1 text-sm text-gray-500">Hangi sayfayi tasarladigini sec, sonra tema ve section ritmini kontrollu presetlerle ayarla.</p>
                        </div>
                        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            {selectedPage?.title ?? 'Sayfa secilmedi'}
                        </div>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                        <div className="rounded-[1.5rem] bg-gray-50 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Sayfa secici</div>
                            <select value={selectedPage?.slug ?? ''} onChange={(event) => setSelectedPageSlug(event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                                {pages.map((page) => (
                                    <option key={page.slug} value={page.slug}>
                                        {page.title} ({page.slug})
                                    </option>
                                ))}
                            </select>
                            <div className="mt-4 space-y-2">
                                {[
                                    `Header: controlled`,
                                    `Section sayisi: ${selectedPage?.sections.length ?? 0}`,
                                    `Footer: controlled`,
                                ].map((item) => (
                                    <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="grid gap-3">
                                {themeOptions.map((theme) => (
                                    <button
                                        key={theme.key}
                                        onClick={() => setSelectedTheme(theme.key)}
                                        className={`w-full rounded-[1.5rem] px-4 py-4 text-left ring-1 transition-all ${
                                            selectedTheme === theme.key
                                                ? 'bg-gray-950 text-white ring-gray-950 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.8)]'
                                                : 'bg-gray-50 text-gray-900 ring-gray-200 hover:bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold">{theme.label}</div>
                                                <div className={`mt-1 text-xs ${selectedTheme === theme.key ? 'text-gray-300' : 'text-gray-500'}`}>{theme.detail}</div>
                                            </div>
                                            <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selectedTheme === theme.key ? 'bg-white/10 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>
                                                {selectedTheme === theme.key ? 'Secili' : 'Preset'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleApplyTheme}
                                disabled={!workspace || busyKey === 'apply-theme'}
                                className="mt-4 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {busyKey === 'apply-theme' ? 'Tema uygulanıyor...' : 'Secili temayi uygula'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="grid gap-4">
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Deneyim stacki</h3>
                        <div className="mt-4 grid gap-3">
                            {[
                                { title: 'Motion dili', detail: 'sticky story, snap sections, kontrollu scroll ritmi' },
                                { title: 'WebGL fallback', detail: 'agir sahnelerde degrade olabilen modern arka plan presetleri' },
                                { title: 'Aktif preset', detail: selectedTheme },
                            ].map((item) => (
                                <div key={item.title} className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                    <div className="mt-1 text-sm text-gray-500">{item.detail}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Safe layout guard</h3>
                        <div className="mt-3 text-sm text-gray-600">
                            Maksimum icerik genisligi: {snapshot?.safeLayoutPolicy?.max_content_width_px ?? '-'}px
                        </div>
                        <div className="mt-4 space-y-2">
                            {(snapshot?.safeLayoutPolicy?.guard_rules ?? []).map((rule) => (
                                <div key={rule} className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-700 ring-1 ring-gray-200">
                                    {rule}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ),
        pages: (
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Sayfa yapisi stüdyosu</h3>
                            <p className="mt-1 text-sm text-gray-500">Sayfalari olustur, sec, yeniden adlandir ve menu baglamini buradan yonet.</p>
                        </div>
                        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            {pages.length} sayfa
                        </div>
                    </div>
                    <div className="mt-5 space-y-3">
                        {pages.map((page) => (
                            <button
                                key={page.slug}
                                onClick={() => setSelectedPageSlug(page.slug)}
                                className={`w-full rounded-[1.5rem] px-4 py-4 text-left transition-all ${
                                    selectedPage?.slug === page.slug
                                        ? 'bg-gray-950 text-white shadow-[0_24px_50px_-36px_rgba(15,23,42,0.8)]'
                                        : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">{page.title}</div>
                                        <div className={`mt-1 text-xs ${selectedPage?.slug === page.slug ? 'text-gray-300' : 'text-gray-500'}`}>{page.slug}</div>
                                    </div>
                                    <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selectedPage?.slug === page.slug ? 'bg-white/10 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>
                                        {page.sections.length} section
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 rounded-[1.5rem] bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-gray-900">Yeni sayfa ekle</div>
                        <div className="mt-3 grid gap-3">
                            <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Sayfa basligi" />
                            <input value={newPageSlug} onChange={(event) => setNewPageSlug(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="/ornek-sayfa" />
                            <button onClick={handleCreatePage} disabled={!workspace || busyKey === 'create-page'} className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'create-page' ? 'Sayfa ekleniyor...' : 'Yeni sayfayi olustur'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="grid gap-4">
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Secilen sayfa metasi</h3>
                        <div className="mt-4 grid gap-3">
                            <input value={pageTitleDraft} onChange={(event) => setPageTitleDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                            <input value={pageSlugDraft} onChange={(event) => setPageSlugDraft(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                            <div className="flex gap-2">
                                <button onClick={handleSavePageMeta} disabled={!selectedPage || busyKey === 'save-page'} className="flex-1 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                    {busyKey === 'save-page' ? 'Kaydediliyor...' : 'Sayfa bilgilerini kaydet'}
                                </button>
                                {selectedPage && selectedPage.slug !== '/' && (
                                    <button onClick={() => handleDeletePage(selectedPage.slug)} disabled={busyKey === 'delete-page'} className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60">
                                        <Trash2 className="inline h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Menu ve yayin baglami</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {menuItems.length > 0 ? (
                                menuItems.map((item) => (
                                    <div key={`${item.page_slug}-${item.position}`} className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                        <div className="text-sm font-semibold text-gray-900">{item.position}. {item.label}</div>
                                        <div className="mt-1 text-xs text-gray-500">{item.page_slug}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4 text-sm text-gray-600 ring-1 ring-gray-200">Menu item henuz yok.</div>
                            )}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Preview state</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{workspace?.previewStatus.preview_state ?? '-'}</div>
                            </div>
                            <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Publish state</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{workspace?.publishStatus.status ?? '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        publishing: (
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                    <div className="rounded-[2rem] bg-gray-950 p-6 text-white shadow-sm">
                        <h3 className="text-lg font-semibold">Canliya alma merkezi</h3>
                        <p className="mt-2 text-sm text-gray-300">Preview, domain baglama ve publish akisini tek karar panelinden yonet.</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button onClick={handlePreview} disabled={!workspace || busyKey === 'preview'} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gray-950 disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'preview' ? 'Preview hazirlaniyor...' : 'Preview olustur'}
                            </button>
                            <button onClick={handlePublish} disabled={!workspace || busyKey === 'publish'} className="rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-medium text-gray-950 disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'publish' ? 'Canliya aliniyor...' : 'Canliya al'}
                            </button>
                            <button onClick={handleRollback} disabled={!workspace || busyKey === 'rollback'} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'rollback' ? 'Geri aliniyor...' : 'Rollback'}
                            </button>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {[
                                { label: 'Preview URL', value: workspace?.publishStatus.preview_url ?? '-' },
                                { label: 'Published URL', value: workspace?.publishStatus.published_url ?? '-' },
                                { label: 'Release ID', value: workspace?.publishStatus.active_release_id ?? '-' },
                                { label: 'Primary domain', value: workspace?.domainSetup.current_primary_domain ?? '-' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-[1.5rem] bg-white/5 px-4 py-4 ring-1 ring-white/10">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</div>
                                    <div className="mt-2 text-sm font-semibold text-white break-all">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Readiness checklist</h3>
                        <div className="mt-4 space-y-2">
                            {previewChecks.map((check) => (
                                <div key={check.key} className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-gray-900">{check.label}</div>
                                        <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                            check.status === 'pass'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : check.status === 'warning'
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {check.status}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">{check.detail}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Canli preview</h3>
                        <div className="mt-4 grid gap-4">
                            {workspace ? <WebsitePreviewCanvas site={workspace.site} pageSlug={selectedPageSlug} selectedTargetKey={previewReviewTarget?.key} onSelectTarget={handlePreviewTargetFeedback} /> : (
                                <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-sm text-slate-200">
                                    Preview icin once aktif bir site gerekiyor.
                                </div>
                            )}
                            <div className="rounded-[1.5rem] bg-gray-50 p-4 ring-1 ring-gray-200">
                                <div className="text-sm font-semibold text-gray-900">Preview uzerinden AI duzenleme</div>
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
                                        <span className="text-sm text-gray-500">Section hedefleri draft olustuktan sonra gorunur.</span>
                                    )}
                                </div>
                                <a href="/web-management-preview" className="mt-4 inline-flex rounded-2xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white">
                                    Ayrı preview sayfasinda ac
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">Domain baglama</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Workspace</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{workspace?.domainSetup.workspace_domain ?? '-'}</div>
                            </div>
                            <div className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Custom domain</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{workspace?.domainSetup.custom_domain ?? 'Baglanmadi'}</div>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_170px]">
                            <input value={domainQuery} onChange={(event) => setDomainQuery(event.target.value)} className="rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" placeholder="ornek: markaniz.com.tr" />
                            <select value={selectedDomainProvider} onChange={(event) => setSelectedDomainProvider(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                                {(domainProviders?.providers ?? []).map((provider) => (
                                    <option key={provider.key} value={provider.key}>
                                        {provider.label}
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleDomainSearch} disabled={!workspace || busyKey === 'domain-search'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === 'domain-search' ? 'Araniyor...' : 'Domain ara'}
                            </button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {(domainSearch?.results ?? []).map((result) => (
                                <div key={`${result.provider_key}-${result.domain}`} className="rounded-[1.5rem] bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-gray-900">{result.domain}</div>
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
                            <button onClick={handleAddBlogPost} disabled={!newBlogTitle.trim() || busyKey === 'add-blog'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                <Plus className="mr-1 inline h-4 w-4" />{busyKey === 'add-blog' ? 'Ekleniyor...' : 'Yazi Ekle'}
                            </button>
                        </div>
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
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="mt-1 text-xs text-gray-500">{product.sku} - {product.price} {product.currency}</div>
                                        </div>
                                        <button onClick={() => handleDeleteProduct(product.sku)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                            <Trash2 className="inline h-3 w-3" /> Sil
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Katalog aktif ama henuz urun eklenmemis.</div>
                        )}
                    </div>
                    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-gray-900">Yeni Urun Ekle</div>
                        <div className="mt-3 grid gap-2">
                            <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Urun adi" />
                            <input value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="SKU (bos birakilirsa otomatik)" />
                            <input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Fiyat (TRY)" />
                            <button onClick={handleAddProduct} disabled={!newProductName.trim() || busyKey === 'add-product'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                <Plus className="mr-1 inline h-4 w-4" />{busyKey === 'add-product' ? 'Ekleniyor...' : 'Urun Ekle'}
                            </button>
                        </div>
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
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{item.label}</div>
                                            <div className="mt-1 text-xs text-gray-500">{item.provider} - {item.url}</div>
                                        </div>
                                        <button onClick={() => handleDeleteMarketplaceLink(item.id)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                            <Trash2 className="inline h-3 w-3" /> Sil
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Bagli pazaryeri linki yok.</div>
                        )}
                    </div>
                    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-gray-900">Yeni Kanal Ekle</div>
                        <div className="mt-3 grid gap-2">
                            <select value={newMarketplaceProvider} onChange={(e) => setNewMarketplaceProvider(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                                <option value="trendyol">Trendyol</option>
                                <option value="hepsiburada">Hepsiburada</option>
                                <option value="amazon">Amazon</option>
                                <option value="n11">N11</option>
                                <option value="ciceksepeti">Ciceksepeti</option>
                            </select>
                            <input value={newMarketplaceLabel} onChange={(e) => setNewMarketplaceLabel(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Etiket (orn: Trendyol Magaza)" />
                            <input value={newMarketplaceUrl} onChange={(e) => setNewMarketplaceUrl(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="URL" />
                            <button onClick={handleAddMarketplaceLink} disabled={!newMarketplaceLabel.trim() || !newMarketplaceUrl.trim() || busyKey === 'add-marketplace'} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                <Plus className="mr-1 inline h-4 w-4" />{busyKey === 'add-marketplace' ? 'Ekleniyor...' : 'Kanal Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ),
        settings: (
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-700" />
                        <h3 className="text-lg font-semibold text-gray-900">API Anahtarlari</h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Pexels, Unsplash ve sosyal medya API anahtarlarini buradan yonetin.</p>
                    <div className="mt-4 space-y-3">
                        {([
                            { key: 'pexels_api_key', label: 'Pexels API Key' },
                            { key: 'unsplash_access_key', label: 'Unsplash Access Key' },
                            { key: 'unsplash_secret_key', label: 'Unsplash Secret Key' },
                            { key: 'unsplash_app_id', label: 'Unsplash App ID' },
                        ] as const).map((item) => (
                            <div key={item.key} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                                <div className="text-xs font-medium text-gray-500">{item.label}</div>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={platformSettingsDraft[item.key] ?? (platformSettings?.[item.key] as string) ?? ''}
                                        onChange={(e) => setPlatformSettingsDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                                        placeholder="API anahtarini girin"
                                    />
                                    {(platformSettings?.[item.key] as string) && (
                                        <button onClick={() => handleDeletePlatformSetting(item.key)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                            <Trash2 className="inline h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Sosyal Medya Tokenlari</h3>
                    <p className="mt-2 text-sm text-gray-500">Facebook, Instagram, Twitter ve LinkedIn entegrasyon ayarlari.</p>
                    <div className="mt-4 space-y-3">
                        {([
                            { key: 'facebook_page_access_token', label: 'Facebook Page Access Token' },
                            { key: 'instagram_app_token', label: 'Instagram App Token' },
                            { key: 'meta_app_id', label: 'Meta App ID' },
                            { key: 'meta_app_secret', label: 'Meta App Secret' },
                            { key: 'twitter_bearer_token', label: 'Twitter/X Bearer Token' },
                            { key: 'linkedin_client_id', label: 'LinkedIn Client ID' },
                            { key: 'linkedin_client_secret', label: 'LinkedIn Client Secret' },
                        ] as const).map((item) => (
                            <div key={item.key} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                                <div className="text-xs font-medium text-gray-500">{item.label}</div>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={platformSettingsDraft[item.key] ?? (platformSettings?.[item.key] as string) ?? ''}
                                        onChange={(e) => setPlatformSettingsDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                                        placeholder="Token girin"
                                    />
                                    {(platformSettings?.[item.key] as string) && (
                                        <button onClick={() => handleDeletePlatformSetting(item.key)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                            <Trash2 className="inline h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleSavePlatformSettings}
                        disabled={Object.keys(platformSettingsDraft).length === 0 || busyKey === 'save-settings'}
                        className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {busyKey === 'save-settings' ? 'Kaydediliyor...' : 'Ayarlari Kaydet'}
                    </button>
                </div>
            </div>
        ),
    };

    const draftProgressLabel = workspace
        ? workspace.publishStatus.status === 'published'
            ? 'Canlida'
            : workspace.publishStatus.preview_url
              ? 'Preview hazir'
              : 'Taslak asamasinda'
        : 'Baslangic asamasinda';

    const nextActionCards = [
        {
            title: 'AI ile basla',
            detail: '1-3 kritik soruyla ilk taslagi uret, bos ekranla baslama.',
            cta: busyKey === 'create-draft' ? 'Taslak olusturuluyor...' : 'AI taslak olustur',
            onClick: handleCreateDraft,
            disabled: busyKey === 'create-draft',
            tone: 'primary',
        },
        {
            title: 'Sayfalari duzenle',
            detail: 'Ana sayfa, menu ve section yapisini kontrollu varyantlarla yonet.',
            cta: 'Sayfa studyo',
            onClick: () => setActiveTab('pages'),
            disabled: false,
            tone: 'neutral',
        },
        {
            title: 'Onizle ve canliya al',
            detail: 'Preview, domain baglama ve publish akisini tek yerden yonet.',
            cta: 'Yayin sekmesi',
            onClick: () => setActiveTab('publishing'),
            disabled: false,
            tone: 'neutral',
        },
    ] as const;

    return (
        <div className={isMobile ? 'mx-auto max-w-7xl p-4 pb-safe' : 'mx-auto max-w-7xl p-6'}>
            <div className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.24),_transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#111827_100%)] p-6 text-white shadow-xl">
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-slate-100">
                            <Globe2 className="h-4 w-4" />
                            Website Builder
                        </div>
                        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                            Bos ekranla degil, yonlendirilmis bir taslakla basla
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            AI ile ilk surumu olustur, sonra sayfalar, gorunum, icerik ve yayin sekmelerinden kontrollu olarak duzenle.
                            Tum alanlar safe layout guard altinda kalir.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {['1. Ihtiyaci cikar', '2. Taslagi olustur', '3. Preview ve publish'].map((step) => (
                                <span key={step} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
                                    {step}
                                </span>
                            ))}
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Aktif site</div>
                                <div className="mt-2 text-base font-semibold text-white">{workspace?.site.name ?? 'Henuz taslak yok'}</div>
                                <div className="mt-1 text-xs text-slate-400">{workspace?.site.slug ?? 'AI veya sablon ile basla'}</div>
                            </div>
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Durum</div>
                                <div className="mt-2 text-base font-semibold text-white">{draftProgressLabel}</div>
                                <div className="mt-1 text-xs text-slate-400">{workspace?.publishStatus.status ?? 'hazirlik'}</div>
                            </div>
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Moduller</div>
                                <div className="mt-2 text-base font-semibold text-white">{activeFeatureCount}</div>
                                <div className="mt-1 text-xs text-slate-400">{visibleTabs.length} calisma sekmesi gorunuyor</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-white">Baslangic yontemi</div>
                                <div className="mt-1 text-xs text-slate-300">AI hizli baslangic, sablon kontrollu kurulum icin.</div>
                            </div>
                            <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                                {workspace ? 'Devam ediyor' : 'Ilk kurulum'}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                onClick={() => setEntryMode('template')}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'template' ? 'bg-white text-gray-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
                            >
                                <LayoutTemplate className="h-4 w-4" />
                                Hazir sablon
                            </button>
                            <button
                                onClick={() => setEntryMode('ai')}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'ai' ? 'bg-emerald-300 text-gray-950' : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'}`}
                            >
                                <Sparkles className="h-4 w-4" />
                                Yapay zeka
                            </button>
                        </div>
                        <div className="mt-5 space-y-3">
                            {nextActionCards.map((card) => (
                                <button
                                    key={card.title}
                                    onClick={card.onClick}
                                    disabled={card.disabled}
                                    className={`w-full rounded-[1.5rem] px-4 py-4 text-left transition-all ${
                                        card.tone === 'primary'
                                            ? 'bg-emerald-300 text-slate-950 shadow-[0_24px_60px_-32px_rgba(110,231,183,0.85)]'
                                            : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <div className="text-sm font-semibold">{card.title}</div>
                                    <div className={`mt-1 text-xs ${card.tone === 'primary' ? 'text-slate-700' : 'text-slate-300'}`}>{card.detail}</div>
                                    <div className={`mt-3 text-xs font-semibold ${card.tone === 'primary' ? 'text-slate-900' : 'text-emerald-200'}`}>{card.cta}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50/95 px-4 py-4 text-sm text-rose-800 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-semibold">Baglanti veya islem hatasi</div>
                            <div className="mt-1 text-xs text-rose-700">{error}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setError(null)}
                                className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={() => {
                                    if (workspace?.site.id) {
                                        void loadWorkspace(workspace.site.id);
                                    } else {
                                        window.location.reload();
                                    }
                                }}
                                className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                                Tekrar dene
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="mt-6 grid gap-4 xl:grid-cols-4">
                {[
                    {
                        title: 'Sonraki adim',
                        value: workspace ? 'Icerik ve gorunum' : 'Taslak olustur',
                        detail: workspace ? 'Sayfa veya gorunum sekmesine gecerek devam et.' : 'AI veya sablonla ilk siteyi baslat.',
                    },
                    {
                        title: 'Preview',
                        value: workspace?.publishStatus.preview_url ? 'Hazir' : 'Bekliyor',
                        detail: workspace?.publishStatus.preview_url ?? 'Canli onizleme olusunca burada gorunur',
                    },
                    {
                        title: 'Domain',
                        value: workspace?.domainSetup.custom_domain ?? workspace?.domainSetup.workspace_domain ?? 'Bekleniyor',
                        detail: workspace?.domainSetup.status ?? 'workspace_ready',
                    },
                    {
                        title: 'Safe layout',
                        value: snapshot?.safeLayoutPolicy?.enforce_safe_area ? 'Zorunlu' : 'Belirsiz',
                        detail: `${snapshot?.safeLayoutPolicy?.max_content_width_px ?? '-'}px max width`,
                    },
                ].map((item) => (
                    <div key={item.title} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-gray-200 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{item.title}</div>
                        <div className="mt-3 text-lg font-semibold text-gray-900">{item.value}</div>
                        <div className="mt-2 text-sm leading-6 text-gray-500">{item.detail}</div>
                    </div>
                ))}
            </div>

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
                                disabled={!selectedTemplateKey || !wizardSiteName.trim() || busyKey === 'create-wizard'}
                                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {busyKey === 'create-wizard' ? 'Olusturuluyor...' : 'Sablondan Site Olustur'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Modul Aktivasyonlari</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                        {featureCards.map((item) => {
                            const isActive = workspace
                                ? workspace.site.feature_flags[item.key as keyof typeof workspace.site.feature_flags]
                                : answers[item.key];
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        if (workspace) {
                                            void handleToggleFeature(item.key, !isActive);
                                        } else {
                                            setAnswers((current) => ({ ...current, [item.key]: !current[item.key] }));
                                        }
                                    }}
                                    disabled={busyKey === 'toggle-feature'}
                                    className={`flex w-full items-start justify-between rounded-3xl px-4 py-4 text-left ring-1 transition-colors disabled:opacity-60 ${
                                        isActive ? 'bg-emerald-50 ring-emerald-200' : 'bg-gray-50 ring-gray-200'
                                    }`}
                                >
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                                        <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                                    </div>
                                    <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {isActive ? 'Aktif' : 'Pasif'}
                                    </div>
                                </button>
                            );
                        })}
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

export default WebsiteBuilderPage;
