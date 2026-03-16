import React from 'react';
import { Bot, Globe2, LayoutTemplate, MessageCircle, Package, Paintbrush2, Sparkles } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';
import type { TabKey } from './web-management/types';
import { useWebManagement } from './web-management/useWebManagement';
import { TabButton } from './web-management/TabButton';
import { ContentTab } from './web-management/ContentTab';
import { AppearanceTab } from './web-management/AppearanceTab';
import { PagesTab } from './web-management/PagesTab';
import { PublishingTab } from './web-management/PublishingTab';
import { BlogTab } from './web-management/BlogTab';
import { ProductsTab } from './web-management/ProductsTab';
import { OrdersTab, CommerceTab, AppointmentsTab, ChatbotTab, MarketplaceTab } from './web-management/SimpleTabPanels';
import { SettingsTab } from './web-management/SettingsTab';
import { AiOnboardingPanel } from './web-management/AiOnboardingPanel';
import { TemplateWizardPanel } from './web-management/TemplateWizardPanel';
import { ModuleActivationsPanel } from './web-management/ModuleActivationsPanel';
import { AiChatPanel } from './web-management/AiChatPanel';
import { DraftSummaryPanel } from './web-management/DraftSummaryPanel';

const WebManagementPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const wm = useWebManagement();

    const tabContent: Record<TabKey, React.ReactNode> = {
        content: (
            <ContentTab
                workspace={wm.workspace}
                selectedPage={wm.selectedPage}
                pages={wm.pages}
                setSelectedPageSlug={wm.setSelectedPageSlug}
                editingSectionIndex={wm.editingSectionIndex}
                setEditingSectionIndex={wm.setEditingSectionIndex}
                sectionFieldsDraft={wm.sectionFieldsDraft}
                setSectionFieldsDraft={wm.setSectionFieldsDraft}
                sectionRegistry={wm.sectionRegistry}
                newSectionType={wm.newSectionType}
                setNewSectionType={wm.setNewSectionType}
                newSectionVariant={wm.newSectionVariant}
                setNewSectionVariant={wm.setNewSectionVariant}
                availableSectionVariants={wm.availableSectionVariants}
                isBusy={wm.isBusy}
                getEditableFields={wm.getEditableFields}
                handleMoveSection={wm.handleMoveSection}
                handleDeleteSection={wm.handleDeleteSection}
                handleSaveSectionContent={wm.handleSaveSectionContent}
                handleAddSection={wm.handleAddSection}
            />
        ),
        appearance: (
            <AppearanceTab
                workspace={wm.workspace}
                snapshot={wm.snapshot}
                selectedPage={wm.selectedPage}
                pages={wm.pages}
                setSelectedPageSlug={wm.setSelectedPageSlug}
                selectedTheme={wm.selectedTheme}
                setSelectedTheme={wm.setSelectedTheme}
                isBusy={wm.isBusy}
                handleApplyTheme={wm.handleApplyTheme}
            />
        ),
        pages: (
            <PagesTab
                workspace={wm.workspace}
                selectedPage={wm.selectedPage}
                pages={wm.pages}
                menuItems={wm.menuItems}
                setSelectedPageSlug={wm.setSelectedPageSlug}
                newPageTitle={wm.newPageTitle}
                setNewPageTitle={wm.setNewPageTitle}
                newPageSlug={wm.newPageSlug}
                setNewPageSlug={wm.setNewPageSlug}
                pageTitleDraft={wm.pageTitleDraft}
                setPageTitleDraft={wm.setPageTitleDraft}
                pageSlugDraft={wm.pageSlugDraft}
                setPageSlugDraft={wm.setPageSlugDraft}
                isBusy={wm.isBusy}
                handleCreatePage={wm.handleCreatePage}
                handleSavePageMeta={wm.handleSavePageMeta}
                handleDeletePage={wm.handleDeletePage}
            />
        ),
        publishing: (
            <PublishingTab
                workspace={wm.workspace}
                previewChecks={wm.previewChecks}
                selectedPageSlug={wm.selectedPageSlug}
                previewReviewTarget={wm.previewReviewTarget}
                previewTargets={wm.previewTargets}
                domainProviders={wm.domainProviders}
                domainSearch={wm.domainSearch}
                domainQuery={wm.domainQuery}
                setDomainQuery={wm.setDomainQuery}
                selectedDomainProvider={wm.selectedDomainProvider}
                setSelectedDomainProvider={wm.setSelectedDomainProvider}
                isBusy={wm.isBusy}
                handlePreview={wm.handlePreview}
                handlePublish={wm.handlePublish}
                handleRollback={wm.handleRollback}
                handleDomainSearch={wm.handleDomainSearch}
                handleConnectDomain={wm.handleConnectDomain}
                handlePreviewTargetFeedback={wm.handlePreviewTargetFeedback}
            />
        ),
        blog: (
            <BlogTab
                workspace={wm.workspace}
                newBlogTitle={wm.newBlogTitle}
                setNewBlogTitle={wm.setNewBlogTitle}
                newBlogSlug={wm.newBlogSlug}
                setNewBlogSlug={wm.setNewBlogSlug}
                newBlogExcerpt={wm.newBlogExcerpt}
                setNewBlogExcerpt={wm.setNewBlogExcerpt}
                isBusy={wm.isBusy}
                handleAddBlogPost={wm.handleAddBlogPost}
                handleDeleteBlogPost={wm.handleDeleteBlogPost}
            />
        ),
        products: (
            <ProductsTab
                workspace={wm.workspace}
                newProductName={wm.newProductName}
                setNewProductName={wm.setNewProductName}
                newProductSku={wm.newProductSku}
                setNewProductSku={wm.setNewProductSku}
                newProductPrice={wm.newProductPrice}
                setNewProductPrice={wm.setNewProductPrice}
                isBusy={wm.isBusy}
                handleAddProduct={wm.handleAddProduct}
                handleDeleteProduct={wm.handleDeleteProduct}
            />
        ),
        orders: <OrdersTab workspace={wm.workspace} />,
        commerce: <CommerceTab workspace={wm.workspace} />,
        appointments: <AppointmentsTab workspace={wm.workspace} />,
        chatbot: <ChatbotTab workspace={wm.workspace} />,
        marketplace: (
            <MarketplaceTab
                workspace={wm.workspace}
                newMarketplaceProvider={wm.newMarketplaceProvider}
                setNewMarketplaceProvider={wm.setNewMarketplaceProvider}
                newMarketplaceLabel={wm.newMarketplaceLabel}
                setNewMarketplaceLabel={wm.setNewMarketplaceLabel}
                newMarketplaceUrl={wm.newMarketplaceUrl}
                setNewMarketplaceUrl={wm.setNewMarketplaceUrl}
                isBusy={wm.isBusy}
                handleAddMarketplaceLink={wm.handleAddMarketplaceLink}
                handleDeleteMarketplaceLink={wm.handleDeleteMarketplaceLink}
            />
        ),
        settings: (
            <SettingsTab
                platformSettings={wm.platformSettings}
                platformSettingsDraft={wm.platformSettingsDraft}
                setPlatformSettingsDraft={wm.setPlatformSettingsDraft}
                isBusy={wm.isBusy}
                handleSavePlatformSettings={wm.handleSavePlatformSettings}
                handleDeletePlatformSetting={wm.handleDeletePlatformSetting}
            />
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
                            onClick={() => wm.setEntryMode('template')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${wm.entryMode === 'template' ? 'bg-white text-gray-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                            Hazir Sablonla Olustur
                        </button>
                        <button
                            onClick={() => wm.setEntryMode('ai')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${wm.entryMode === 'ai' ? 'bg-emerald-300 text-gray-950' : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'}`}
                        >
                            <Sparkles className="h-4 w-4" />
                            Yapay Zeka ile Olustur
                        </button>
                    </div>
                </div>
            </div>

            {wm.error ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {wm.error}
                </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        {wm.entryMode === 'ai' ? <Bot className="h-5 w-5 text-sky-500" /> : <Paintbrush2 className="h-5 w-5 text-fuchsia-500" />}
                        <h2 className="text-lg font-semibold text-gray-900">
                            {wm.entryMode === 'ai' ? 'AI Onboarding Akisi' : 'Hazir Sablon Baslangici'}
                        </h2>
                    </div>

                    {wm.entryMode === 'ai' ? (
                        <AiOnboardingPanel
                            siteName={wm.siteName}
                            setSiteName={wm.setSiteName}
                            siteSlug={wm.siteSlug}
                            setSiteSlug={wm.setSiteSlug}
                            aiPrompt={wm.aiPrompt}
                            setAiPrompt={wm.setAiPrompt}
                            isBusy={wm.isBusy}
                            handleCreateDraft={wm.handleCreateDraft}
                        />
                    ) : (
                        <TemplateWizardPanel
                            wizardTemplates={wm.wizardTemplates}
                            selectedTemplateKey={wm.selectedTemplateKey}
                            setSelectedTemplateKey={wm.setSelectedTemplateKey}
                            wizardSiteName={wm.wizardSiteName}
                            setWizardSiteName={wm.setWizardSiteName}
                            wizardPhone={wm.wizardPhone}
                            setWizardPhone={wm.setWizardPhone}
                            wizardEmail={wm.wizardEmail}
                            setWizardEmail={wm.setWizardEmail}
                            isBusy={wm.isBusy}
                            handleCreateFromWizard={wm.handleCreateFromWizard}
                        />
                    )}
                </div>

                <ModuleActivationsPanel
                    workspace={wm.workspace}
                    answers={wm.answers}
                    setAnswers={wm.setAnswers}
                    isBusy={wm.isBusy}
                    handleToggleFeature={wm.handleToggleFeature}
                />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
                {[
                    {
                        title: 'Service Baglantisi',
                        value: wm.snapshot?.featureCatalog ? 'Hazir' : 'Bekleniyor',
                        detail: wm.snapshot?.baseUrl ?? 'Website Generator API baglantisi',
                    },
                    {
                        title: 'x-ear Checklist',
                        value: wm.snapshot?.xearChecklist ? 'Yuklendi' : 'Bekleniyor',
                        detail: 'Host uyumluluk checklist surface',
                    },
                    {
                        title: 'Active Site',
                        value: wm.workspace?.site.name ?? 'Yok',
                        detail: wm.workspace?.site.slug ?? 'Olusturulmus aktif site bekleniyor',
                    },
                    {
                        title: 'Visible Tabs',
                        value: `${wm.visibleTabs.length}`,
                        detail: `${wm.activeFeatureCount} aktif modul / feature`,
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
                <AiChatPanel
                    chatMessages={wm.chatMessages}
                    chatCommand={wm.chatCommand}
                    setChatCommand={wm.setChatCommand}
                    proposal={wm.proposal}
                    isBusy={wm.isBusy}
                    handleProposeEdit={wm.handleProposeEdit}
                    handleApplyProposal={wm.handleApplyProposal}
                    handleRevertProposal={wm.handleRevertProposal}
                />
                <DraftSummaryPanel
                    workspace={wm.workspace}
                    selectedTheme={wm.selectedTheme}
                    visibleTabs={wm.visibleTabs}
                    chatMessages={wm.chatMessages}
                    activeFeatureCount={wm.activeFeatureCount}
                    discovery={wm.discovery}
                />
            </div>

            <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Web Yonetim Sekmeleri</h2>
                </div>
                <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                    {wm.visibleTabs.map((tab) => (
                        <TabButton
                            key={tab.key}
                            label={tab.label}
                            active={wm.activeTab === tab.key}
                            onClick={() => wm.setActiveTab(tab.key)}
                        />
                    ))}
                </div>
                <div className="mt-6">{tabContent[wm.activeTab]}</div>
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
