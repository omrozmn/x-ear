import React, { useEffect, useState } from 'react';
import { Activity, Bot, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import {
    listDomainProviders,
    loadSiteWorkspace,
    loadWebsiteGeneratorSnapshot,
    type DomainProviderCatalogResponse,
    type SiteWorkspace,
    type WebsiteGeneratorSnapshot,
} from '@/lib/website-generator-client';

const ACTIVE_SITE_STORAGE_KEY = 'xear.websiteGenerator.activeSiteId';

const oversightCards = [
    {
        title: 'Tenant Denetimi',
        detail: 'Aktif tenant site durumu, feature flag ve publish state izlenir.',
        icon: ShieldCheck,
    },
    {
        title: 'AI ve Audit',
        detail: 'AI edit trail, preview review ve operator denetimi burada kalir.',
        icon: Bot,
    },
    {
        title: 'Domain Operasyonlari',
        detail: 'Provider katalogu, .tr destegi ve go-live baglamlari denetlenir.',
        icon: Globe2,
    },
];

const WebManagementOversightPage: React.FC = () => {
    const [workspace, setWorkspace] = useState<SiteWorkspace | null>(null);
    const [snapshot, setSnapshot] = useState<WebsiteGeneratorSnapshot | null>(null);
    const [providers, setProviders] = useState<DomainProviderCatalogResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const siteId = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);

        loadWebsiteGeneratorSnapshot().then((data) => {
            if (!cancelled) {
                setSnapshot(data);
            }
        });

        listDomainProviders().then((data) => {
            if (!cancelled) {
                setProviders(data);
            }
        });

        if (siteId) {
            loadSiteWorkspace(siteId)
                .then((data) => {
                    if (!cancelled) {
                        setWorkspace(data);
                    }
                })
                .catch((nextError) => {
                    if (!cancelled) {
                        setError(nextError instanceof Error ? nextError.message : 'Tenant web workspace okunamadi.');
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Super Admin Oversight
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Web Sitesi Yonetimi denetim katmaninda</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                            Tenant tarafindaki website builder artik web app deneyimi. Bu ekran sadece denetim, provider sagligi,
                            publish durumu ve audit baglami icin kullanilir.
                        </p>
                    </div>
                    <a
                        href="http://localhost:3005/web-management"
                        className="inline-flex items-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                    >
                        Web app builder&apos;i ac
                    </a>
                </div>
            </div>

            {error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
                {oversightCards.map((card) => (
                    <div key={card.title} className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                        <card.icon className="h-5 w-5 text-cyan-500" />
                        <h2 className="mt-4 text-lg font-semibold text-gray-900">{card.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-500">{card.detail}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Activity className="h-4 w-4 text-cyan-500" />
                        Aktif Tenant Durumu
                    </div>
                    {workspace ? (
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div className="font-medium text-gray-900">{workspace.site.name}</div>
                                <div className="mt-1 text-xs text-gray-500">{workspace.site.slug}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">Preview: {workspace.previewStatus.preview_state}</div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">Publish: {workspace.publishStatus.status}</div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">Primary domain: {workspace.domainSetup.current_primary_domain}</div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">Visible menu: {workspace.adminMenu.visible_items.length}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                Audit entry count: {workspace.auditTrail.entries.length}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                            Henüz tenant builder tarafindan aktif bir site secilmedi.
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                        <div className="text-sm font-semibold text-gray-900">Domain Provider Katalogu</div>
                        <div className="mt-4 space-y-3">
                            {(providers?.providers ?? []).map((provider) => (
                                <div key={provider.key} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    <div className="font-medium text-gray-900">{provider.label}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {provider.supports_tr_domains ? '.tr destekli' : '.tr belirsiz'} / {provider.integration_mode}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                        <div className="text-sm font-semibold text-gray-900">Runtime Guard</div>
                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                            {(snapshot?.safeLayoutPolicy?.guard_rules ?? []).map((rule) => (
                                <div key={rule} className="rounded-2xl bg-gray-50 px-4 py-3">
                                    {rule}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebManagementOversightPage;
