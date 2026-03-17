import { useState } from 'react';
import {
    connectSiteDomain,
    createPreview,
    publishSite,
    rollbackSite,
    searchSiteDomain,
    updateSiteTheme,
    type DomainAvailabilityResponse,
} from '@/lib/website-generator-client';
import type { TabKey } from './types';
import { themeOptions } from './types';
import type { CoreState } from './useWebManagementCore';

export function usePublishing(
    core: CoreState,
    setChatCommand: React.Dispatch<React.SetStateAction<string>>,
    setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>,
) {
    const { addBusy, removeBusy, setError, loadWorkspace, workspace, selectedTheme } = core;

    const [domainSearch, setDomainSearch] = useState<DomainAvailabilityResponse | null>(null);
    const [domainQuery, setDomainQuery] = useState('xear-clinic.com.tr');
    const [selectedDomainProvider, setSelectedDomainProvider] = useState('metunic');
    const [previewReviewTarget, setPreviewReviewTarget] = useState<{ key: string; label: string } | null>(null);

    const handleApplyTheme = async () => {
        if (!workspace) { setError('Tema uygulamak icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        const theme = themeOptions.find((item) => item.key === selectedTheme);
        if (!theme) return;
        addBusy('apply-theme'); setError(null);
        try { await updateSiteTheme(workspace.site.id, theme.settings); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Tema ayarlari guncellenemedi.'); } finally { removeBusy('apply-theme'); }
    };

    const handlePreview = async () => {
        if (!workspace) { setError('Preview icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('preview'); setError(null);
        try { await createPreview(workspace.site.id); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Preview olusturulamadi.'); } finally { removeBusy('preview'); }
    };

    const handlePublish = async () => {
        if (!workspace) { setError('Publish icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('publish'); setError(null);
        try { await publishSite(workspace.site.id); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Publish islemi basarisiz oldu.'); } finally { removeBusy('publish'); }
    };

    const handleRollback = async () => {
        if (!workspace) { setError('Rollback icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('rollback'); setError(null);
        try { await rollbackSite(workspace.site.id); await loadWorkspace(workspace.site.id); }
        catch (e) { setError(e instanceof Error ? e.message : 'Rollback islemi basarisiz oldu.'); } finally { removeBusy('rollback'); }
    };

    const handleDomainSearch = async () => {
        if (!workspace) { setError('Domain aramak icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('domain-search'); setError(null);
        try { const result = await searchSiteDomain(workspace.site.id, domainQuery); setDomainSearch(result); }
        catch (e) { setError(e instanceof Error ? e.message : 'Domain arama yapilamadi.'); } finally { removeBusy('domain-search'); }
    };

    const handleConnectDomain = async (domain: string) => {
        if (!workspace) { setError('Domain baglamak icin once aktif bir site olusturulmasi gerekiyor.'); return; }
        addBusy('connect-domain'); setError(null);
        try {
            await connectSiteDomain(workspace.site.id, { domain, provider_key: selectedDomainProvider, activate_on_publish: true });
            await loadWorkspace(workspace.site.id);
        } catch (e) { setError(e instanceof Error ? e.message : 'Domain baglama istegi olusturulamadi.'); } finally { removeBusy('connect-domain'); }
    };

    const handlePreviewTargetFeedback = (target: { key: string; label: string }) => {
        setPreviewReviewTarget(target);
        setChatCommand(`${target.label} kartini daha modern hale getir ve icerigi guclendir`);
        setActiveTab('content');
    };

    return {
        domainSearch, domainQuery, setDomainQuery,
        selectedDomainProvider, setSelectedDomainProvider,
        previewReviewTarget,
        handleApplyTheme, handlePreview, handlePublish, handleRollback,
        handleDomainSearch, handleConnectDomain, handlePreviewTargetFeedback,
    };
}
