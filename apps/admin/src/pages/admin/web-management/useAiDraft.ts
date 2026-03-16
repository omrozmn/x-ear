import { useEffect, useState } from 'react';
import {
    applyAiEdit,
    createSiteFromAi,
    proposeAiEdit,
    revertAiEdit,
    type AIDraftAnswers,
    type AIDiscoveryResponse,
    type AIEditProposalResponse,
} from '@/lib/website-generator-client';
import type { CoreState } from './useWebManagementCore';

export function useAiDraft(core: CoreState) {
    const { addBusy, removeBusy, setError, loadWorkspace, workspace, pendingPreviewCommand } = core;

    const [siteName, setSiteName] = useState('X-Ear Hearing Center');
    const [siteSlug, setSiteSlug] = useState('x-ear-hearing-center');
    const [aiPrompt, setAiPrompt] = useState(
        'Isitme merkezim icin modern bir site olustur. Randevu formu olsun, cihaz markalarini gosterelim ve WhatsApp aktif olsun.',
    );
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

    useEffect(() => {
        if (pendingPreviewCommand) setChatCommand(pendingPreviewCommand);
    }, [pendingPreviewCommand]);

    const appendChatMessage = (msg: string) => {
        setChatMessages((current) => [...current, msg]);
    };

    const handleCreateDraft = async () => {
        if (!siteName.trim() || !siteSlug.trim()) { setError('Site adi ve slug bos birakilamaz.'); return; }
        addBusy('create-draft');
        setError(null);
        try {
            const result = await createSiteFromAi({ prompt: aiPrompt, siteName, siteSlug, answers });
            setDiscovery(result.discovery);
            setChatMessages((current) => [
                ...current,
                `AI draft olustu: ${result.site.name}`,
                `Oncelikli tema: ${result.draft.theme_key}`,
            ]);
            await loadWorkspace(result.site.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI draft olusturulamadi.');
        } finally { removeBusy('create-draft'); }
    };

    const handleProposeEdit = async (command: string) => {
        if (!workspace) {
            setError('Chat ile duzenleme icin once aktif bir site olusturulmasi gerekiyor.');
            return;
        }
        addBusy('propose-edit');
        setError(null);
        try {
            const next = await proposeAiEdit(workspace.site.id, command);
            setProposal(next);
            setChatMessages((current) => [...current, command, next.summary]);
            setChatCommand('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI edit onerisi olusturulamadi.');
        } finally { removeBusy('propose-edit'); }
    };

    const handleApplyProposal = async () => {
        if (!proposal || !workspace) return;
        addBusy('apply-proposal');
        setError(null);
        try {
            await applyAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((c) => (c ? { ...c, status: 'applied' } : c));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI edit uygulanamadi.');
        } finally { removeBusy('apply-proposal'); }
    };

    const handleRevertProposal = async () => {
        if (!proposal || !workspace) return;
        addBusy('revert-proposal');
        setError(null);
        try {
            await revertAiEdit(proposal.proposal_id);
            await loadWorkspace(workspace.site.id);
            setProposal((c) => (c ? { ...c, status: 'reverted' } : c));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI edit geri alinamadi.');
        } finally { removeBusy('revert-proposal'); }
    };

    return {
        siteName, setSiteName, siteSlug, setSiteSlug,
        aiPrompt, setAiPrompt, chatCommand, setChatCommand,
        answers, setAnswers, chatMessages, discovery, proposal,
        appendChatMessage,
        handleCreateDraft, handleProposeEdit, handleApplyProposal, handleRevertProposal,
    };
}
