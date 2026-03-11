export type WebsiteGeneratorSnapshot = {
    baseUrl: string;
    featureCatalog?: unknown;
    xearChecklist?: unknown;
    mobileMatrix?: unknown;
    releaseValidation?: unknown;
    safeLayoutPolicy?: SafeLayoutPolicyResponse;
    sectionRegistry?: BuilderSectionRegistryResponse;
};

export type FeatureFlags = {
    blog: boolean;
    product_listing: boolean;
    ecommerce: boolean;
    appointment_forms: boolean;
    marketplace_links: boolean;
    whatsapp_contact: boolean;
    ai_chatbot: boolean;
};

export type ThemeSettings = {
    primary_color: string;
    accent_color: string;
    font_family: string;
};

export type MenuItem = {
    label: string;
    page_slug: string;
    position: number;
};

export type SectionDocument = {
    type: string;
    variant: string;
    fields: Record<string, unknown>;
};

export type PageDocument = {
    title: string;
    slug: string;
    sections: SectionDocument[];
};

export type SiteResponse = {
    id: string;
    name: string;
    slug: string;
    theme_settings: ThemeSettings;
    feature_flags: FeatureFlags;
    pages: PageDocument[];
    menu_items: MenuItem[];
    blog_settings?: {
        mode: 'informational' | 'campaigns' | 'info_and_campaigns';
        posts_per_page: number;
        featured_post_slug?: string | null;
    } | null;
    blog_posts?: Array<{
        slug: string;
        title: string;
        excerpt: string;
        status: 'draft' | 'published';
        categories: string[];
    }>;
    product_catalog_settings?: {
        display_mode: 'grid' | 'carousel' | 'mixed';
        featured_skus: string[];
    } | null;
    commerce_settings?: {
        currency: string;
        checkout_mode: 'inquiry' | 'direct_checkout';
        shipping_enabled: boolean;
        payment_methods: string[];
    } | null;
    products?: Array<{
        sku: string;
        slug: string;
        name: string;
        price: number;
        currency: string;
        status: 'draft' | 'published';
        in_stock: boolean;
    }>;
    orders?: Array<{
        id: string;
        customer_name: string;
        status: 'pending' | 'processing' | 'completed' | 'cancelled';
        payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
        fulfillment_status: 'unfulfilled' | 'packed' | 'shipped' | 'delivered';
        total_amount: number;
        currency: string;
    }>;
    appointment_settings?: {
        enabled: boolean;
        booking_mode: 'request_only' | 'timeslot_selection';
        notification_email?: string | null;
        collect_phone: boolean;
    } | null;
    leads?: Array<{
        id: string;
        name: string;
        email: string;
        source: 'appointment_form' | 'contact_form' | 'whatsapp';
        status: 'new' | 'contacted' | 'qualified' | 'closed';
        message: string;
    }>;
    whatsapp_settings?: {
        enabled: boolean;
        phone_number: string;
        default_message: string;
    } | null;
    marketplace_settings?: {
        enabled: boolean;
        display_mode: 'icon_links' | 'cta_cards';
    } | null;
    marketplace_links_data?: Array<{
        id: string;
        provider: string;
        label: string;
        url: string;
        visible: boolean;
    }>;
    chatbot_settings?: {
        mode: 'bring_your_own_api' | 'platform_managed';
        enabled_capabilities: string[];
        monthly_message_limit: number;
        widget_enabled: boolean;
        handoff_channel: 'whatsapp' | 'form' | 'email';
        welcome_message: string;
    } | null;
};

export type AIDiscoveryQuestion = {
    key:
        | 'product_listing'
        | 'ecommerce'
        | 'appointment_forms'
        | 'whatsapp_contact'
        | 'blog'
        | 'ai_chatbot'
        | 'marketplace_links';
    label: string;
    reason: string;
};

export type AIDiscoveryResponse = {
    inferred_site_type: string;
    suggested_theme_key: string;
    inferred_features: FeatureFlags;
    questions: AIDiscoveryQuestion[];
};

export type AIDraftAnswers = {
    product_listing?: boolean;
    ecommerce?: boolean;
    appointment_forms?: boolean;
    marketplace_links?: boolean;
    whatsapp_contact?: boolean;
    blog?: boolean;
    ai_chatbot?: boolean;
    chatbot_mode?: 'bring_your_own_api' | 'platform_managed';
};

export type AIDraftResponse = {
    inferred_site_type: string;
    theme_key: string;
    draft: {
        name: string;
        slug: string;
        theme_settings: ThemeSettings;
        feature_flags: FeatureFlags;
        pages: PageDocument[];
        menu_items: MenuItem[];
        chatbot_settings?: SiteResponse['chatbot_settings'];
    };
};

export type AIEditProposalResponse = {
    proposal_id: string;
    site_id: string;
    command: string;
    summary: string;
    operations: Array<{
        action: string;
        target: string;
        value: string | boolean;
        metadata: Record<string, string | number | boolean>;
    }>;
    status: 'proposed' | 'applied' | 'reverted';
};

export type PreviewStatusResponse = {
    site_id: string;
    draft_state: 'draft';
    preview_state: 'ready_for_preview' | 'needs_attention';
    publish_state: 'ready_for_publish' | 'blocked';
    checks: Array<{
        key: string;
        label: string;
        status: 'pass' | 'warning' | 'fail';
        detail: string;
    }>;
    can_preview: boolean;
    can_publish: boolean;
};

export type PreviewRuntimeResponse = {
    site_id: string;
    status: 'preview_live';
    preview_url: string;
    release_id: string;
};

export type PublishStatusResponse = {
    site_id: string;
    status: 'draft' | 'preview_live' | 'publish_in_progress' | 'published' | 'publish_failed';
    preview_url?: string | null;
    published_url?: string | null;
    active_release_id?: string | null;
    previous_release_id?: string | null;
    last_error?: string | null;
};

export type AuditTrailEntry = {
    entry_id: string;
    site_id: string;
    source: 'chat';
    action: string;
    detail: string;
};

export type SiteAuditTrailResponse = {
    site_id: string;
    entries: AuditTrailEntry[];
};

export type SiteAdminMenuResponse = {
    site_id: string;
    root_label: string;
    visible_items: Array<{
        key: string;
        label: string;
        visibility_rule: string;
        feature_key?: string | null;
        host_route: string;
    }>;
};

export type BuilderShellResponse = {
    site_id: string;
    mode: 'standalone_microservice' | 'x_ear_embedded';
    revision_policy: {
        autosave_interval_seconds: number;
        max_named_revisions: number;
        supports_panel_edits: boolean;
        supports_chat_edits: boolean;
    };
    supported_flows: string[];
    recommended_libraries: string[];
};

export type BuilderSectionRegistryResponse = {
    sections: Array<{
        type: string;
        label: string;
        category: 'core' | 'content' | 'commerce' | 'social' | 'support';
        variants: Array<{ key: string; label: string; description: string }>;
        safe_style_controls: Array<{ key: string; options: string[] }>;
        responsive_behavior: { mobile: string; tablet: string; desktop: string };
        recommended_for_features: string[];
    }>;
};

export type SafeLayoutPolicyResponse = {
    max_content_width_px: number;
    supported_breakpoints: Array<'mobile' | 'tablet' | 'desktop'>;
    enforce_safe_area: boolean;
    clamp_headings: boolean;
    clamp_body_copy: boolean;
    guard_rules: string[];
};

export type SiteWorkspace = {
    site: SiteResponse;
    adminMenu: SiteAdminMenuResponse;
    builderShell: BuilderShellResponse;
    previewStatus: PreviewStatusResponse;
    publishStatus: PublishStatusResponse;
    auditTrail: SiteAuditTrailResponse;
    domainSetup: SiteDomainSetupResponse;
};

export type DomainProviderDefinition = {
    key: string;
    label: string;
    local_provider: boolean;
    supports_tr_domains: boolean;
    supports_bulk_registration: boolean;
    integration_mode: 'official_api' | 'partner_program' | 'manual_review';
    supported_tlds: string[];
    official_site: string;
    notes: string;
};

export type DomainProviderCatalogResponse = {
    providers: DomainProviderDefinition[];
};

export type DomainAvailabilityResponse = {
    site_id: string;
    query: string;
    results: Array<{
        domain: string;
        provider_key: string;
        available: boolean;
        price_note: string;
    }>;
};

export type SiteDomainSetupResponse = {
    site_id: string;
    workspace_domain: string;
    current_primary_domain: string;
    custom_domain?: string | null;
    status: 'workspace_ready' | 'custom_domain_pending' | 'custom_domain_live';
    provider_key?: string | null;
    dns_target: string;
    nameservers: string[];
    notes: string[];
};

const DEFAULT_BASE_URL = (import.meta.env.VITE_WEBSITE_GENERATOR_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
};

async function requestJson<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Website Generator request failed: ${response.status}`);
    }

    return (await response.json()) as T;
}

async function getJson<T>(baseUrl: string, path: string): Promise<T | undefined> {
    try {
        return await requestJson<T>(baseUrl, path);
    } catch {
        return undefined;
    }
}

export async function loadWebsiteGeneratorSnapshot(baseUrl: string = DEFAULT_BASE_URL): Promise<WebsiteGeneratorSnapshot> {
    const [featureCatalog, xearChecklist, mobileMatrix, releaseValidation, safeLayoutPolicy, sectionRegistry] = await Promise.all([
        getJson(baseUrl, '/api/v1/features/catalog'),
        getJson(baseUrl, '/api/v1/integrations/x-ear/checklist'),
        getJson(baseUrl, '/api/v1/quality/mobile-matrix'),
        getJson(baseUrl, '/api/v1/release/validation'),
        getJson(baseUrl, '/api/v1/builder/safe-layout-policy'),
        getJson(baseUrl, '/api/v1/builder/sections'),
    ]);

    return {
        baseUrl,
        featureCatalog,
        xearChecklist,
        mobileMatrix,
        releaseValidation,
        safeLayoutPolicy,
        sectionRegistry,
    };
}

export async function runAiDiscovery(prompt: string, baseUrl: string = DEFAULT_BASE_URL): Promise<AIDiscoveryResponse> {
    return requestJson(baseUrl, '/api/v1/ai/discovery', {
        method: 'POST',
        body: { prompt },
    });
}

export async function createSiteFromAi(
    payload: {
        prompt: string;
        siteName: string;
        siteSlug: string;
        answers: AIDraftAnswers;
    },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<{ discovery: AIDiscoveryResponse; draft: AIDraftResponse; site: SiteResponse }> {
    const discovery = await runAiDiscovery(payload.prompt, baseUrl);
    const draft = await requestJson<AIDraftResponse>(baseUrl, '/api/v1/ai/drafts', {
        method: 'POST',
        body: {
            prompt: payload.prompt,
            site_name: payload.siteName,
            site_slug: payload.siteSlug,
            answers: payload.answers,
        },
    });
    const site = await requestJson<SiteResponse>(baseUrl, '/api/v1/sites', {
        method: 'POST',
        body: draft.draft,
    });

    return { discovery, draft, site };
}

export async function loadSiteWorkspace(siteId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<SiteWorkspace> {
    const [site, adminMenu, builderShell, previewStatus, publishStatus, auditTrail, domainSetup] = await Promise.all([
        requestJson<SiteResponse>(baseUrl, `/api/v1/sites/${siteId}`),
        requestJson<SiteAdminMenuResponse>(baseUrl, `/api/v1/sites/${siteId}/admin-menu`),
        requestJson<BuilderShellResponse>(baseUrl, `/api/v1/sites/${siteId}/builder-shell`),
        requestJson<PreviewStatusResponse>(baseUrl, `/api/v1/sites/${siteId}/preview-status`),
        requestJson<PublishStatusResponse>(baseUrl, `/api/v1/sites/${siteId}/publish-status`),
        requestJson<SiteAuditTrailResponse>(baseUrl, `/api/v1/sites/${siteId}/audit-trail`),
        requestJson<SiteDomainSetupResponse>(baseUrl, `/api/v1/sites/${siteId}/domain-setup`),
    ]);

    return { site, adminMenu, builderShell, previewStatus, publishStatus, auditTrail, domainSetup };
}

export async function proposeAiEdit(siteId: string, command: string, baseUrl: string = DEFAULT_BASE_URL): Promise<AIEditProposalResponse> {
    return requestJson(baseUrl, '/api/v1/ai/edits/proposals', {
        method: 'POST',
        body: { site_id: siteId, command },
    });
}

export async function applyAiEdit(proposalId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<AIEditProposalResponse> {
    return requestJson(baseUrl, `/api/v1/ai/edits/proposals/${proposalId}/apply`, {
        method: 'POST',
    });
}

export async function revertAiEdit(proposalId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<AIEditProposalResponse> {
    return requestJson(baseUrl, `/api/v1/ai/edits/proposals/${proposalId}/revert`, {
        method: 'POST',
    });
}

export async function updateSiteTheme(
    siteId: string,
    themeSettings: ThemeSettings,
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/theme`, {
        method: 'PUT',
        body: themeSettings,
    });
}

export async function createPreview(siteId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<PreviewRuntimeResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/preview`, {
        method: 'POST',
    });
}

export async function publishSite(siteId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<PublishStatusResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/publish`, {
        method: 'POST',
    });
}

export async function rollbackSite(siteId: string, baseUrl: string = DEFAULT_BASE_URL): Promise<PublishStatusResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/rollback`, {
        method: 'POST',
    });
}

export async function listDomainProviders(baseUrl: string = DEFAULT_BASE_URL): Promise<DomainProviderCatalogResponse> {
    return requestJson(baseUrl, '/api/v1/domains/providers');
}

export async function searchSiteDomain(
    siteId: string,
    query: string,
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<DomainAvailabilityResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/domain-search`, {
        method: 'POST',
        body: { query },
    });
}

export async function connectSiteDomain(
    siteId: string,
    payload: { domain: string; provider_key: string; activate_on_publish: boolean },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteDomainSetupResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/domains/connect`, {
        method: 'POST',
        body: payload,
    });
}

export async function updateSitePage(
    siteId: string,
    pageSlug: string,
    payload: { title: string; slug: string; sections: PageDocument['sections'] },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages/by-slug?page_slug=${encodeURIComponent(pageSlug)}`, {
        method: 'PUT',
        body: payload,
    });
}

export async function createSitePage(
    siteId: string,
    payload: { title: string; slug: string; sections: PageDocument['sections'] },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages`, {
        method: 'POST',
        body: payload,
    });
}

export async function addSitePageSection(
    siteId: string,
    pageSlug: string,
    payload: { type: string; variant: string; fields: Record<string, unknown> },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages/by-slug/sections?page_slug=${encodeURIComponent(pageSlug)}`, {
        method: 'POST',
        body: payload,
    });
}

export async function updateSitePageSection(
    siteId: string,
    pageSlug: string,
    sectionIndex: number,
    payload: { variant: string; fields: Record<string, unknown> },
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages/by-slug/sections/${sectionIndex}?page_slug=${encodeURIComponent(pageSlug)}`, {
        method: 'PUT',
        body: payload,
    });
}

export async function deleteSitePageSection(
    siteId: string,
    pageSlug: string,
    sectionIndex: number,
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages/by-slug/sections/${sectionIndex}?page_slug=${encodeURIComponent(pageSlug)}`, {
        method: 'DELETE',
    });
}

export async function reorderSitePageSections(
    siteId: string,
    pageSlug: string,
    sectionOrder: number[],
    baseUrl: string = DEFAULT_BASE_URL,
): Promise<SiteResponse> {
    return requestJson(baseUrl, `/api/v1/sites/${siteId}/pages/by-slug/sections/reorder?page_slug=${encodeURIComponent(pageSlug)}`, {
        method: 'PUT',
        body: { section_order: sectionOrder },
    });
}
