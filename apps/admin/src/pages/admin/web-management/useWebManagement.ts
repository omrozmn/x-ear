import { useEffect, useMemo } from 'react';
import { type TabKey, adminMenuToTabKey } from './types';
import { useWebManagementCore } from './useWebManagementCore';
import { useAiDraft } from './useAiDraft';
import { usePageEditor } from './usePageEditor';
import { usePublishing } from './usePublishing';
import { useBlogProducts } from './useBlogProducts';
import { usePlatformSettings } from './usePlatformSettings';

export function useWebManagement() {
    const core = useWebManagementCore();
    const aiDraft = useAiDraft(core);
    const pageEditor = usePageEditor(core);
    const publishing = usePublishing(core, aiDraft.setChatCommand, core.setActiveTab);
    const blogProducts = useBlogProducts(core);
    const settings = usePlatformSettings(core, aiDraft.appendChatMessage);

    const discoveryFeatures = aiDraft.discovery?.inferred_features;

    const visibleTabs = useMemo(() => {
        if (core.workspace?.adminMenu.visible_items.length) {
            return core.workspace.adminMenu.visible_items
                .map((item) => ({ key: adminMenuToTabKey[item.label], label: item.label }))
                .filter((item): item is { key: TabKey; label: string } => Boolean(item.key));
        }
        const ff = core.workspace?.site.feature_flags ?? discoveryFeatures;
        return [
            { key: 'content' as const, label: 'Icerik Yonetimi' },
            { key: 'appearance' as const, label: 'Gorunum Yonetimi' },
            { key: 'pages' as const, label: 'Sayfa ve Menu Yonetimi' },
            { key: 'publishing' as const, label: 'Yayinlama' },
            ...(ff?.blog ? [{ key: 'blog' as const, label: 'Blog Yonetimi' }] : []),
            ...(ff?.product_listing ? [{ key: 'products' as const, label: 'Urun Yonetimi' }] : []),
            ...(ff?.ecommerce ? [{ key: 'orders' as const, label: 'Siparisler' }, { key: 'commerce' as const, label: 'Kargo / Odeme Ayarlari' }] as Array<{ key: TabKey; label: string }> : []),
            ...(ff?.appointment_forms ? [{ key: 'appointments' as const, label: 'Randevu ve Formlar' }] : []),
            ...(ff?.ai_chatbot ? [{ key: 'chatbot' as const, label: 'AI Chatbot' }] : []),
            ...(ff?.marketplace_links ? [{ key: 'marketplace' as const, label: 'Pazaryeri Entegrasyonlari' }] : []),
            { key: 'settings' as const, label: 'Platform Ayarlari' },
        ];
    }, [discoveryFeatures, core.workspace?.adminMenu.visible_items, core.workspace?.site.feature_flags]);

    useEffect(() => {
        if (!visibleTabs.some((t) => t.key === core.activeTab)) core.setActiveTab(visibleTabs[0]?.key ?? 'content');
    }, [core.activeTab, visibleTabs]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFeatureCount = useMemo(() => Object.values({
        blog: core.workspace?.site.feature_flags.blog ?? discoveryFeatures?.blog ?? false,
        product_listing: core.workspace?.site.feature_flags.product_listing ?? discoveryFeatures?.product_listing ?? false,
        ecommerce: core.workspace?.site.feature_flags.ecommerce ?? discoveryFeatures?.ecommerce ?? false,
        appointment_forms: core.workspace?.site.feature_flags.appointment_forms ?? discoveryFeatures?.appointment_forms ?? false,
        whatsapp_contact: core.workspace?.site.feature_flags.whatsapp_contact ?? discoveryFeatures?.whatsapp_contact ?? false,
        ai_chatbot: core.workspace?.site.feature_flags.ai_chatbot ?? discoveryFeatures?.ai_chatbot ?? false,
        marketplace_links: core.workspace?.site.feature_flags.marketplace_links ?? discoveryFeatures?.marketplace_links ?? false,
    }).filter(Boolean).length, [discoveryFeatures, core.workspace?.site.feature_flags]);

    return {
        entryMode: core.entryMode, setEntryMode: core.setEntryMode,
        activeTab: core.activeTab, setActiveTab: core.setActiveTab,
        snapshot: core.snapshot, workspace: core.workspace,
        selectedTheme: core.selectedTheme, setSelectedTheme: core.setSelectedTheme,
        siteName: aiDraft.siteName, setSiteName: aiDraft.setSiteName,
        siteSlug: aiDraft.siteSlug, setSiteSlug: aiDraft.setSiteSlug,
        aiPrompt: aiDraft.aiPrompt, setAiPrompt: aiDraft.setAiPrompt,
        chatCommand: aiDraft.chatCommand, setChatCommand: aiDraft.setChatCommand,
        chatMessages: aiDraft.chatMessages,
        answers: aiDraft.answers, setAnswers: aiDraft.setAnswers,
        discovery: aiDraft.discovery, proposal: aiDraft.proposal,
        isBusy: core.isBusy, isAnyBusy: core.isAnyBusy, error: core.error,
        domainProviders: core.domainProviders,
        domainSearch: publishing.domainSearch, domainQuery: publishing.domainQuery, setDomainQuery: publishing.setDomainQuery,
        selectedDomainProvider: publishing.selectedDomainProvider, setSelectedDomainProvider: publishing.setSelectedDomainProvider,
        previewReviewTarget: publishing.previewReviewTarget,
        selectedPageSlug: pageEditor.selectedPageSlug, setSelectedPageSlug: pageEditor.setSelectedPageSlug,
        newPageTitle: pageEditor.newPageTitle, setNewPageTitle: pageEditor.setNewPageTitle,
        newPageSlug: pageEditor.newPageSlug, setNewPageSlug: pageEditor.setNewPageSlug,
        newSectionType: pageEditor.newSectionType, setNewSectionType: pageEditor.setNewSectionType,
        newSectionVariant: pageEditor.newSectionVariant, setNewSectionVariant: pageEditor.setNewSectionVariant,
        editingSectionIndex: pageEditor.editingSectionIndex, setEditingSectionIndex: pageEditor.setEditingSectionIndex,
        sectionFieldsDraft: pageEditor.sectionFieldsDraft, setSectionFieldsDraft: pageEditor.setSectionFieldsDraft,
        pageTitleDraft: pageEditor.pageTitleDraft, setPageTitleDraft: pageEditor.setPageTitleDraft,
        pageSlugDraft: pageEditor.pageSlugDraft, setPageSlugDraft: pageEditor.setPageSlugDraft,
        wizardTemplates: settings.wizardTemplates, selectedTemplateKey: settings.selectedTemplateKey, setSelectedTemplateKey: settings.setSelectedTemplateKey,
        wizardSiteName: settings.wizardSiteName, setWizardSiteName: settings.setWizardSiteName,
        wizardPhone: settings.wizardPhone, setWizardPhone: settings.setWizardPhone,
        wizardEmail: settings.wizardEmail, setWizardEmail: settings.setWizardEmail,
        platformSettings: settings.platformSettings, platformSettingsDraft: settings.platformSettingsDraft, setPlatformSettingsDraft: settings.setPlatformSettingsDraft,
        newBlogTitle: blogProducts.newBlogTitle, setNewBlogTitle: blogProducts.setNewBlogTitle,
        newBlogSlug: blogProducts.newBlogSlug, setNewBlogSlug: blogProducts.setNewBlogSlug,
        newBlogExcerpt: blogProducts.newBlogExcerpt, setNewBlogExcerpt: blogProducts.setNewBlogExcerpt,
        newProductName: blogProducts.newProductName, setNewProductName: blogProducts.setNewProductName,
        newProductSku: blogProducts.newProductSku, setNewProductSku: blogProducts.setNewProductSku,
        newProductPrice: blogProducts.newProductPrice, setNewProductPrice: blogProducts.setNewProductPrice,
        newMarketplaceProvider: blogProducts.newMarketplaceProvider, setNewMarketplaceProvider: blogProducts.setNewMarketplaceProvider,
        newMarketplaceLabel: blogProducts.newMarketplaceLabel, setNewMarketplaceLabel: blogProducts.setNewMarketplaceLabel,
        newMarketplaceUrl: blogProducts.newMarketplaceUrl, setNewMarketplaceUrl: blogProducts.setNewMarketplaceUrl, marketplaceUrlError: blogProducts.marketplaceUrlError, setMarketplaceUrlError: blogProducts.setMarketplaceUrlError,
        visibleTabs, activeFeatureCount,
        pages: pageEditor.pages, menuItems: pageEditor.menuItems, previewChecks: pageEditor.previewChecks,
        sectionRegistry: core.sectionRegistry, selectedPage: pageEditor.selectedPage, previewTargets: pageEditor.previewTargets,
        selectedSectionDefinition: pageEditor.selectedSectionDefinition, availableSectionVariants: pageEditor.availableSectionVariants,
        getEditableFields: pageEditor.getEditableFields,
        handleCreateDraft: aiDraft.handleCreateDraft, handleProposeEdit: aiDraft.handleProposeEdit,
        handleApplyProposal: aiDraft.handleApplyProposal, handleRevertProposal: aiDraft.handleRevertProposal,
        handleApplyTheme: publishing.handleApplyTheme, handlePreview: publishing.handlePreview,
        handlePublish: publishing.handlePublish, handleRollback: publishing.handleRollback,
        handleDomainSearch: publishing.handleDomainSearch, handleConnectDomain: publishing.handleConnectDomain,
        handlePreviewTargetFeedback: publishing.handlePreviewTargetFeedback,
        handleCreatePage: pageEditor.handleCreatePage, handleSavePageMeta: pageEditor.handleSavePageMeta,
        handleAddSection: pageEditor.handleAddSection, handleSaveSectionContent: pageEditor.handleSaveSectionContent,
        handleDeleteSection: pageEditor.handleDeleteSection, handleMoveSection: pageEditor.handleMoveSection,
        handleCreateFromWizard: settings.handleCreateFromWizard,
        handleAddBlogPost: blogProducts.handleAddBlogPost, handleDeleteBlogPost: blogProducts.handleDeleteBlogPost,
        handleAddProduct: blogProducts.handleAddProduct, handleDeleteProduct: blogProducts.handleDeleteProduct,
        handleAddMarketplaceLink: blogProducts.handleAddMarketplaceLink, handleDeleteMarketplaceLink: blogProducts.handleDeleteMarketplaceLink,
        handleDeletePage: pageEditor.handleDeletePage,
        handleSavePlatformSettings: settings.handleSavePlatformSettings,
        handleDeletePlatformSetting: settings.handleDeletePlatformSetting,
        handleToggleFeature: settings.handleToggleFeature,
    };
}

export type UseWebManagementReturn = ReturnType<typeof useWebManagement>;
