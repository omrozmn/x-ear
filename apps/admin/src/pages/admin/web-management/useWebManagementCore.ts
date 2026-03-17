import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getPlatformSettings,
    listDomainProviders,
    listWizardTemplates,
    loadSiteWorkspace,
    loadWebsiteGeneratorSnapshot,
    type BuilderSectionRegistryResponse,
    type DomainProviderCatalogResponse,
    type PlatformSettingsResponse,
    type SiteWorkspace,
    type WebsiteGeneratorSnapshot,
    type WizardTemplate,
} from '@/lib/website-generator-client';
import {
    type TabKey,
    ACTIVE_SITE_STORAGE_KEY,
    PENDING_PREVIEW_COMMAND_STORAGE_KEY,
    themeOptions,
} from './types';

export interface CoreState {
    workspace: SiteWorkspace | null;
    snapshot: WebsiteGeneratorSnapshot | null;
    addBusy: (key: string) => void;
    removeBusy: (key: string) => void;
    isBusy: (key: string) => boolean;
    isAnyBusy: boolean;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    loadWorkspace: (siteId: string) => Promise<void>;
    entryMode: 'template' | 'ai';
    setEntryMode: React.Dispatch<React.SetStateAction<'template' | 'ai'>>;
    activeTab: TabKey;
    setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>;
    selectedTheme: string;
    setSelectedTheme: React.Dispatch<React.SetStateAction<string>>;
    sectionRegistry: BuilderSectionRegistryResponse | undefined;
    domainProviders: DomainProviderCatalogResponse | null;
    wizardTemplates: WizardTemplate[];
    selectedTemplateKey: string | null;
    setSelectedTemplateKey: React.Dispatch<React.SetStateAction<string | null>>;
    platformSettings: PlatformSettingsResponse | null;
    setPlatformSettings: React.Dispatch<React.SetStateAction<PlatformSettingsResponse | null>>;
    pendingPreviewCommand: string | null;
}

export function useWebManagementCore(): CoreState {
    const [entryMode, setEntryMode] = useState<'template' | 'ai'>('ai');
    const [activeTab, setActiveTab] = useState<TabKey>('content');
    const [snapshot, setSnapshot] = useState<WebsiteGeneratorSnapshot | null>(null);
    const [workspace, setWorkspace] = useState<SiteWorkspace | null>(null);
    const [selectedTheme, setSelectedTheme] = useState('hearing-center-modern');
    const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
    const busyKeysRef = useRef(busyKeys);
    busyKeysRef.current = busyKeys;
    const addBusy = useCallback((key: string) => setBusyKeys((prev) => new Set(prev).add(key)), []);
    const removeBusy = useCallback((key: string) => setBusyKeys((prev) => { const next = new Set(prev); next.delete(key); return next; }), []);
    const isBusy = useCallback((key: string) => busyKeysRef.current.has(key), []);
    const isAnyBusy = busyKeys.size > 0;
    const [error, setError] = useState<string | null>(null);
    const [domainProviders, setDomainProviders] = useState<DomainProviderCatalogResponse | null>(null);
    const [wizardTemplates, setWizardTemplates] = useState<WizardTemplate[]>([]);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
    const [platformSettings, setPlatformSettings] = useState<PlatformSettingsResponse | null>(null);
    const [pendingPreviewCommand, setPendingPreviewCommand] = useState<string | null>(null);

    const loadWorkspace = useCallback(async (siteId: string) => {
        addBusy('load-workspace');
        setError(null);
        try {
            const next = await loadSiteWorkspace(siteId);
            setWorkspace(next);
            window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Web Yonetim workspace yuklenemedi.');
        } finally { removeBusy('load-workspace'); }
    }, [addBusy, removeBusy]);

    useEffect(() => {
        let cancelled = false;
        const activeSiteId = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
        const pending = window.localStorage.getItem(PENDING_PREVIEW_COMMAND_STORAGE_KEY);
        if (pending) {
            setPendingPreviewCommand(pending);
            setActiveTab('publishing');
            window.localStorage.removeItem(PENDING_PREVIEW_COMMAND_STORAGE_KEY);
        }
        loadWebsiteGeneratorSnapshot().then((d) => { if (!cancelled) setSnapshot(d); }).catch(() => {});
        listDomainProviders().then((d) => { if (!cancelled) setDomainProviders(d); }).catch(() => {});
        listWizardTemplates().then((d) => {
            if (!cancelled) {
                setWizardTemplates(d.templates);
                if (d.templates.length > 0) setSelectedTemplateKey(d.templates[0].key);
            }
        }).catch(() => {});
        getPlatformSettings().then((d) => { if (!cancelled) setPlatformSettings(d); }).catch(() => {});
        if (activeSiteId) {
            loadSiteWorkspace(activeSiteId)
                .then((d) => { if (!cancelled) setWorkspace(d); })
                .catch(() => { if (!cancelled) window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY); });
        }
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!workspace) return;
        const preset = themeOptions.find(
            (t) => t.settings.primary_color === workspace.site.theme_settings.primary_color
                && t.settings.accent_color === workspace.site.theme_settings.accent_color,
        );
        if (preset) setSelectedTheme(preset.key);
    }, [workspace]);

    const sectionRegistry = useMemo(
        () => snapshot?.sectionRegistry as BuilderSectionRegistryResponse | undefined,
        [snapshot?.sectionRegistry],
    );

    return {
        workspace, snapshot, addBusy, removeBusy, isBusy, isAnyBusy, error, setError, loadWorkspace,
        entryMode, setEntryMode, activeTab, setActiveTab, selectedTheme, setSelectedTheme,
        sectionRegistry, domainProviders,
        wizardTemplates, selectedTemplateKey, setSelectedTemplateKey,
        platformSettings, setPlatformSettings, pendingPreviewCommand,
    };
}
