import React from 'react';
import type { SiteWorkspace, DomainProviderCatalogResponse, DomainAvailabilityResponse } from '@/lib/website-generator-client';
import { WebsitePreviewCanvas } from '@/components/admin/web-management/WebsitePreviewCanvas';

export interface PublishingTabProps {
    workspace: SiteWorkspace | null;
    previewChecks: SiteWorkspace['previewStatus']['checks'];
    selectedPageSlug: string;
    previewReviewTarget: { key: string; label: string } | null;
    previewTargets: Array<{ key: string; label: string }>;
    domainProviders: DomainProviderCatalogResponse | null;
    domainSearch: DomainAvailabilityResponse | null;
    domainQuery: string;
    setDomainQuery: (v: string) => void;
    selectedDomainProvider: string;
    setSelectedDomainProvider: (v: string) => void;
    isBusy: (key: string) => boolean;
    handlePreview: () => void;
    handlePublish: () => void;
    handleRollback: () => void;
    handleDomainSearch: () => void;
    handleConnectDomain: (domain: string) => void;
    handlePreviewTargetFeedback: (target: { key: string; label: string }) => void;
}

export const PublishingTab: React.FC<PublishingTabProps> = ({
    workspace,
    previewChecks,
    selectedPageSlug,
    previewReviewTarget,
    previewTargets,
    domainProviders,
    domainSearch,
    domainQuery,
    setDomainQuery,
    selectedDomainProvider,
    setSelectedDomainProvider,
    isBusy,
    handlePreview,
    handlePublish,
    handleRollback,
    handleDomainSearch,
    handleConnectDomain,
    handlePreviewTargetFeedback,
}) => {
    return (
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
                    <button onClick={handlePreview} disabled={!workspace || isBusy('preview') || isBusy('publish') || isBusy('rollback')} className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-60">
                        {isBusy('preview') ? 'Hazirlaniyor...' : 'Preview Ac'}
                    </button>
                    <button onClick={handlePublish} disabled={!workspace || isBusy('publish') || isBusy('preview') || isBusy('rollback')} className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-gray-950 disabled:cursor-not-allowed disabled:opacity-60">
                        {isBusy('publish') ? 'Publish...' : 'Publish Et'}
                    </button>
                    <button onClick={handleRollback} disabled={!workspace || isBusy('rollback') || isBusy('preview') || isBusy('publish')} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                        {isBusy('rollback') ? 'Rollback...' : 'Rollback'}
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
                            Ayri preview sayfasinda ac
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
                            <button onClick={handleDomainSearch} disabled={!workspace || isBusy('domain-search')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                                {isBusy('domain-search') ? 'Araniyor...' : 'Domain Ara'}
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
                                            disabled={!result.available || isBusy('connect-domain')}
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
    );
};
