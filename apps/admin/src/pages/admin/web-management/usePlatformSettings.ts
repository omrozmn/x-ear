import { useState } from 'react';
import {
    createSiteFromWizard,
    deletePlatformSetting,
    updatePlatformSettings,
    updateSiteFeatureFlags,
} from '@/lib/website-generator-client';
import type { CoreState } from './useWebManagementCore';

export function usePlatformSettings(
    core: CoreState,
    appendChatMessage: (msg: string) => void,
) {
    const {
        addBusy, removeBusy, setError, loadWorkspace, workspace,
        platformSettings, setPlatformSettings,
        wizardTemplates, selectedTemplateKey, setSelectedTemplateKey,
    } = core;

    const [platformSettingsDraft, setPlatformSettingsDraft] = useState<Record<string, string>>({});
    const [wizardSiteName, setWizardSiteName] = useState('');
    const [wizardPhone, setWizardPhone] = useState('');
    const [wizardEmail, setWizardEmail] = useState('');

    const handleSavePlatformSettings = async () => {
        addBusy('save-settings');
        setError(null);
        try {
            const cleanPayload: Record<string, string> = {};
            for (const [key, value] of Object.entries(platformSettingsDraft)) {
                if (value && !value.includes('****')) cleanPayload[key] = value;
            }
            const updated = await updatePlatformSettings(cleanPayload);
            setPlatformSettings(updated);
            setPlatformSettingsDraft({});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Platform ayarlari guncellenemedi.');
        } finally { removeBusy('save-settings'); }
    };

    const handleDeletePlatformSetting = async (key: string) => {
        if (!window.confirm('Bu ayari silmek istediginize emin misiniz?')) return;
        addBusy('delete-setting');
        setError(null);
        try {
            const updated = await deletePlatformSetting(key);
            setPlatformSettings(updated);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ayar silinemedi.');
        } finally { removeBusy('delete-setting'); }
    };

    const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
        if (!workspace) return;
        addBusy('toggle-feature');
        setError(null);
        try {
            await updateSiteFeatureFlags(workspace.site.id, { [featureKey]: enabled });
            await loadWorkspace(workspace.site.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ozellik guncellenemedi.');
        } finally { removeBusy('toggle-feature'); }
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
            appendChatMessage(`Sablon ile olusturuldu: ${result.message}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Sablondan site olusturulamadi.');
        } finally { removeBusy('create-wizard'); }
    };

    return {
        platformSettings, platformSettingsDraft, setPlatformSettingsDraft,
        wizardTemplates, selectedTemplateKey, setSelectedTemplateKey,
        wizardSiteName, setWizardSiteName,
        wizardPhone, setWizardPhone,
        wizardEmail, setWizardEmail,
        handleSavePlatformSettings, handleDeletePlatformSetting,
        handleToggleFeature, handleCreateFromWizard,
    };
}
