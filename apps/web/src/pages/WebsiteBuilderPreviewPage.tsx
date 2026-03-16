/* eslint-disable no-restricted-syntax */
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { loadSiteWorkspace, type SiteWorkspace } from '@/lib/website-generator-client';
import { WebsitePreviewCanvas } from '@/components/website-builder/WebsitePreviewCanvas';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { useNavigate } from '@tanstack/react-router';

const ACTIVE_SITE_STORAGE_KEY = 'xear.websiteGenerator.activeSiteId';
const PENDING_PREVIEW_COMMAND_STORAGE_KEY = 'xear.websiteGenerator.pendingPreviewCommand';

const WebsiteBuilderPreviewPage: React.FC = () => {
    const [workspace, setWorkspace] = useState<SiteWorkspace | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<{ key: string; label: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const siteId = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
        if (!siteId) {
            setError('Preview acmak icin once Web Yonetim panelinden aktif bir site olusturulmasi gerekiyor.');
            return;
        }

        loadSiteWorkspace(siteId)
            .then((data) => {
                setWorkspace(data);
            })
            .catch((nextError) => {
                setError(nextError instanceof Error ? nextError.message : 'Preview workspace yuklenemedi.');
            });
    }, []);

    const transferCommand = () => {
        if (!selectedTarget) {
            return;
        }
        const command = `${selectedTarget.label} kartini degistir, daha modern bir varyant sec ve icerigi guclendir`;
        window.localStorage.setItem(PENDING_PREVIEW_COMMAND_STORAGE_KEY, command);
        navigate({ to: '/web-management' });
    };

    const handleBack = () => {
        navigate({ to: '/web-management' });
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <HeaderBackButton
                        label="Web Yonetim paneline don"
                        onClick={handleBack}
                        className="text-white hover:text-cyan-200 dark:text-white dark:hover:text-cyan-200"
                    />
                    <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        True Preview Review
                    </div>
                </div>

                {error ? <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

                <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                    <div>
                        {workspace ? (
                            <WebsitePreviewCanvas
                                site={workspace.site}
                                selectedTargetKey={selectedTarget?.key}
                                onSelectTarget={(target) => setSelectedTarget(target)}
                            />
                        ) : (
                            <div className="rounded-[2rem] bg-white/5 p-8 text-sm text-slate-300 ring-1 ring-white/10">
                                Preview yukleniyor...
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="rounded-[2rem] bg-white/5 p-6 ring-1 ring-white/10">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <Sparkles className="h-4 w-4 text-cyan-300" />
                                Preview icinden AI duzenleme
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                Preview uzerinden bir alan sec. Sonra komutu paneldeki chat akisina tasiyip duzenlemeye devam et.
                            </p>
                            <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Secilen hedef</div>
                                <div className="mt-2 text-sm font-medium text-white">{selectedTarget?.label ?? 'Henuz secim yok'}</div>
                            </div>
                            <button
                                onClick={transferCommand}
                                disabled={!selectedTarget}
                                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Komutu Web Yonetim paneline tasi
                            </button>
                        </div>
                        <div className="rounded-[2rem] bg-white/5 p-6 ring-1 ring-white/10">
                            <div className="text-sm font-semibold text-white">Safe Area Hatirlatmalari</div>
                            <div className="mt-4 space-y-2 text-sm text-slate-300">
                                {(workspace?.domainSetup.notes ?? []).map((note) => (
                                    <div key={note} className="rounded-2xl bg-white/5 px-4 py-3">
                                        {note}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebsiteBuilderPreviewPage;
