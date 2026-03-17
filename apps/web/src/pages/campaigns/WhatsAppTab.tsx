import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  History,
  MessageCircle,
  RefreshCcw,
  Send,
  Users,
} from 'lucide-react';
import { Button, Card, useToastHelpers } from '@x-ear/ui-web';
import { apiClient } from '@/api/orval-mutator';
import { useListParties } from '@/api/client/branches.client';
import type { PartyRead } from '@/api/generated/schemas';
import { unwrapArray } from '@/utils/response-unwrap';
import SmsAutomationTab from './SmsAutomationTab';

type WhatsAppStatus = {
  status: string;
  connected: boolean;
  qrCode?: string | null;
  lastError?: string | null;
  bridgePid?: number | null;
  lastSyncAt?: number | null;
  syncInProgress?: boolean;
};

type WhatsAppConfig = {
  aiTargetPhone: string;
  defaultCountryCode: string;
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
};

type WhatsAppInboxMessage = {
  id: string;
  partyId?: string | null;
  direction: string;
  status: string;
  chatId: string;
  chatTitle?: string | null;
  phoneNumber?: string | null;
  messageText: string;
  createdAt?: string | null;
};

type WhatsAppSubTab = 'single' | 'bulk' | 'automation' | 'inbox';

const DEFAULT_CONFIG: WhatsAppConfig = {
  aiTargetPhone: '',
  defaultCountryCode: '90',
  autoReplyEnabled: false,
  autoReplyPrompt: '',
};

function parsePhoneList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function WhatsAppTab() {
  const { t } = useTranslation('campaigns');
  const [activeTab, setActiveTab] = useState<WhatsAppSubTab>('single');
  const [session, setSession] = useState<WhatsAppStatus>({ status: 'idle', connected: false });
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_CONFIG);
  const [singlePhone, setSinglePhone] = useState('');
  const [singleMessage, setSingleMessage] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSegment, setBulkSegment] = useState('');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [inboxItems, setInboxItems] = useState<WhatsAppInboxMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { success, error, warning } = useToastHelpers();

  const { data: partiesData } = useListParties({ page: 1, per_page: 25, search: partySearch || undefined });
  const parties = useMemo(() => unwrapArray<PartyRead>(partiesData), [partiesData]);
  const numbersCount = useMemo(() => parsePhoneList(bulkNumbers).length, [bulkNumbers]);
  const statusLabel = session.connected ? t('whatsapp.status.connected') : (t(`whatsapp.status.${session.status}`, { defaultValue: session.status }));
  const chatThreads = useMemo(() => {
    const grouped = new Map<string, {
      chatId: string;
      chatTitle: string;
      phoneNumber?: string | null;
      lastMessageAt?: string | null;
      unreadCount: number;
      messages: WhatsAppInboxMessage[];
    }>();

    for (const item of inboxItems) {
      const key = item.chatId || item.phoneNumber || item.id;
      const existing = grouped.get(key);
      if (existing) {
        existing.messages.push(item);
        existing.lastMessageAt = item.createdAt || existing.lastMessageAt;
        existing.unreadCount += item.direction === 'inbound' ? 1 : 0;
      } else {
        grouped.set(key, {
          chatId: key,
          chatTitle: item.chatTitle || item.phoneNumber || key,
          phoneNumber: item.phoneNumber,
          lastMessageAt: item.createdAt,
          unreadCount: item.direction === 'inbound' ? 1 : 0,
          messages: [item],
        });
      }
    }

    return Array.from(grouped.values())
      .map((thread) => ({
        ...thread,
        messages: [...thread.messages].sort((a, b) => {
          const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTs - bTs;
        }),
      }))
      .sort((a, b) => {
        const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTs - aTs;
      });
  }, [inboxItems]);
  const selectedThread = useMemo(() => {
    if (chatThreads.length === 0) {
      return null;
    }
    return chatThreads.find((thread) => thread.chatId === selectedChatId) ?? chatThreads[0];
  }, [chatThreads, selectedChatId]);

  const fetchStatus = useCallback(async (showError = false) => {
    try {
      const response = await apiClient.get('/api/whatsapp/session/status');
      setSession(response.data?.data ?? { status: 'idle', connected: false });
    } catch (err) {
      if (showError) {
        error(t('whatsapp.toast.statusError'), err instanceof Error ? err.message : t('whatsapp.toast.statusErrorDesc'));
      }
    }
  }, [error, t]);

  const fetchConfig = useCallback(async () => {
    const response = await apiClient.get('/api/whatsapp/config');
    setConfig(response.data?.data ?? DEFAULT_CONFIG);
  }, []);

  const fetchInbox = useCallback(async () => {
    const response = await apiClient.get('/api/whatsapp/inbox');
    setInboxItems(response.data?.data ?? []);
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchConfig();
    void fetchInbox();
  }, [fetchConfig, fetchInbox, fetchStatus]);

  useEffect(() => {
    if (chatThreads.length === 0) {
      setSelectedChatId(null);
      return;
    }
    setSelectedChatId((prev) => (
      prev && chatThreads.some((thread) => thread.chatId === prev)
        ? prev
        : chatThreads[0].chatId
    ));
  }, [chatThreads]);

  useEffect(() => {
    const needsPolling = session.status === 'qr'
      || session.status === 'starting'
      || session.status === 'loading'
      || session.status === 'awaiting_qr'
      || session.connected;
    if (!needsPolling) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetchStatus();
      void fetchInbox();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchInbox, fetchStatus, session.status, session.connected]);

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setLoadingAction(key);
      await action();
    } catch (err) {
      error(t('whatsapp.toast.error'), err instanceof Error ? err.message : t('whatsapp.toast.actionFailed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleParty = (partyId: string) => {
    setSelectedPartyIds((prev) => (
      prev.includes(partyId) ? prev.filter((item) => item !== partyId) : [...prev, partyId]
    ));
  };

  const handleSendSingle = () => runAction('single', async () => {
    if (!singlePhone.trim() || !singleMessage.trim()) {
      warning(t('whatsapp.toast.missingField'), t('whatsapp.toast.phoneAndMessageRequired'));
      return;
    }
    await apiClient.post('/api/whatsapp/messages/send', {
      phoneNumber: singlePhone,
      message: singleMessage,
    });
    await fetchInbox();
    success(t('whatsapp.toast.messageSent'), t('whatsapp.toast.messageSentDesc'));
    setSingleMessage('');
  });

  const handleSendBulk = () => runAction('bulk', async () => {
    if (!bulkMessage.trim()) {
      warning(t('whatsapp.toast.missingField'), t('whatsapp.toast.bulkMessageRequired'));
      return;
    }
    const phoneNumbers = parsePhoneList(bulkNumbers);
    if (phoneNumbers.length === 0 && selectedPartyIds.length === 0 && !bulkStatus && !bulkSegment) {
      warning(t('whatsapp.toast.noTargetSelected'), t('whatsapp.toast.noTargetSelectedDesc'));
      return;
    }
    await apiClient.post('/api/whatsapp/messages/send-bulk', {
      message: bulkMessage,
      phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
      partyIds: selectedPartyIds.length > 0 ? selectedPartyIds : undefined,
      filters: bulkStatus || bulkSegment
        ? { status: bulkStatus || undefined, segment: bulkSegment || undefined }
        : undefined,
    });
    await fetchInbox();
    success(t('whatsapp.toast.bulkSent'), t('whatsapp.toast.bulkSentDesc'));
  });

  const handleSendAi = () => runAction('ai', async () => {
    if (!aiPrompt.trim()) {
      warning(t('whatsapp.toast.missingField'), t('whatsapp.toast.aiRequired'));
      return;
    }
    await apiClient.post('/api/whatsapp/messages/send-ai', {
      prompt: aiPrompt,
      phoneNumber: config.aiTargetPhone || undefined,
    });
    await fetchInbox();
    success(t('whatsapp.toast.aiSent'), t('whatsapp.toast.aiSentDesc'));
    setAiPrompt('');
  });

  return (
    <div className="space-y-6">
      <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
        <nav className="flex flex-wrap gap-1">
          {([
            { id: 'single', label: t('whatsapp.tabs.single'), icon: <Send className="h-4 w-4" /> },
            { id: 'bulk', label: t('whatsapp.tabs.bulk'), icon: <Users className="h-4 w-4" /> },
            { id: 'automation', label: t('whatsapp.tabs.automation'), icon: <Bot className="h-4 w-4" /> },
            { id: 'inbox', label: t('whatsapp.tabs.inbox'), icon: <History className="h-4 w-4" /> },
          ] as const).map((tab) => (
            <button
              data-allow-raw="true"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-gray-700'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsapp.channel.title')}</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('whatsapp.channel.settingsNote')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className={`rounded-full px-3 py-1 font-medium ${
                session.connected
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
              }`}>
                {statusLabel}
              </span>
              {session.bridgePid ? <span className="text-muted-foreground">PID: {session.bridgePid}</span> : null}
              {session.syncInProgress ? <span className="text-sky-600 dark:text-sky-400">{t('whatsapp.channel.syncing')}</span> : null}
              {session.lastSyncAt ? <span className="text-muted-foreground">{t('whatsapp.channel.lastSync')} {new Date(session.lastSyncAt * 1000).toLocaleTimeString('tr-TR')}</span> : null}
              {session.lastError ? <span className="text-destructive">{session.lastError}</span> : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { void fetchStatus(); void fetchInbox(); }} disabled={loadingAction !== null}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('whatsapp.channel.refresh')}
            </Button>
          </div>
        </div>
      </Card>

      {activeTab === 'single' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsapp.singleMessage.title')}</h3>
            </div>
            {!session.connected ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                {t('whatsapp.channel.notConnected')}
                {' '}{t('whatsapp.channel.currentStatus')} <span className="font-semibold">{statusLabel}</span>
              </div>
            ) : null}
            <div className="space-y-4">
              <input data-allow-raw="true" value={singlePhone} onChange={(event) => setSinglePhone(event.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.singleMessage.phonePlaceholder')} />
              <textarea data-allow-raw="true" value={singleMessage} onChange={(event) => setSingleMessage(event.target.value)} className="min-h-[140px] w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.singleMessage.messagePlaceholder')} />
              <Button onClick={handleSendSingle} disabled={!session.connected || loadingAction !== null}>
                <Send className="mr-2 h-4 w-4" />
                {t('whatsapp.singleMessage.sendBtn')}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-fuchsia-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsapp.ai.title')}</h3>
            </div>
            {!session.connected ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                {t('whatsapp.ai.notConnected')} {t('whatsapp.channel.currentStatus')} <span className="font-semibold">{statusLabel}</span>
              </div>
            ) : null}
            <div className="space-y-4">
              <textarea data-allow-raw="true" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} className="min-h-[180px] w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.ai.placeholder')} />
              <Button onClick={handleSendAi} disabled={!session.connected || loadingAction !== null}>
                <Bot className="mr-2 h-4 w-4" />
                {t('whatsapp.ai.sendBtn')}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'bulk' ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsapp.bulkMessage.title')}</h3>
          </div>
          {!session.connected ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              {t('whatsapp.bulkMessage.notConnected')} {t('whatsapp.channel.currentStatus')} <span className="font-semibold">{statusLabel}</span>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              <textarea data-allow-raw="true" value={bulkNumbers} onChange={(event) => setBulkNumbers(event.target.value)} className="min-h-[120px] w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.bulkMessage.numbersPlaceholder')} />
              <input data-allow-raw="true" value={partySearch} onChange={(event) => setPartySearch(event.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.bulkMessage.searchPatient')} />
              <div className="max-h-56 space-y-2 overflow-auto rounded-2xl border p-3">
                {parties.map((party) => (
                  <label key={party.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <span className="text-sm">{party.firstName} {party.lastName} • {party.phone}</span>
                    <input data-allow-raw="true" type="checkbox" checked={selectedPartyIds.includes(party.id || '')} onChange={() => party.id && toggleParty(party.id)} />
                  </label>
                ))}
              </div>
              <textarea data-allow-raw="true" value={bulkMessage} onChange={(event) => setBulkMessage(event.target.value)} className="min-h-[140px] w-full rounded-2xl border px-4 py-3" placeholder={t('whatsapp.bulkMessage.bulkMessagePlaceholder')} />
            </div>
            <div className="space-y-4 rounded-3xl border border-border bg-gray-50/70 p-4 dark:bg-gray-900/40">
              <div>
                <label className="mb-2 block text-sm font-medium">{t('whatsapp.bulkMessage.patientStatus')}</label>
                <select data-allow-raw="true" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="w-full rounded-2xl border px-4 py-3">
                  <option value="">{t('whatsapp.bulkMessage.allStatuses')}</option>
                  <option value="active">{t('whatsapp.bulkMessage.active')}</option>
                  <option value="inactive">{t('whatsapp.bulkMessage.inactive')}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t('whatsapp.bulkMessage.segment')}</label>
                <select data-allow-raw="true" value={bulkSegment} onChange={(event) => setBulkSegment(event.target.value)} className="w-full rounded-2xl border px-4 py-3">
                  <option value="">{t('whatsapp.bulkMessage.allSegments')}</option>
                  <option value="lead">Lead</option>
                  <option value="new">{t('sms.segments.NEW')}</option>
                  <option value="trial">{t('sms.segments.TRIAL')}</option>
                  <option value="existing">{t('sms.segments.EXISTING')}</option>
                  <option value="vip">{t('sms.segments.VIP')}</option>
                </select>
              </div>
              <div className="text-sm text-muted-foreground">{t('whatsapp.bulkMessage.manualNumbers', { count: numbersCount })}</div>
              <div className="text-sm text-muted-foreground">{t('whatsapp.bulkMessage.selectedPatients', { count: selectedPartyIds.length })}</div>
              <Button onClick={handleSendBulk} disabled={!session.connected || loadingAction !== null} className="w-full">
                <Users className="mr-2 h-4 w-4" />
                {t('whatsapp.bulkMessage.sendBtn')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === 'automation' ? (
        <SmsAutomationTab creditBalance={0} creditLoading={false} channel="whatsapp" />
      ) : null}

      {activeTab === 'inbox' ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsapp.inbox.title')}</h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('whatsapp.inbox.autoSync')}
            </div>
          </div>
          {chatThreads.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('whatsapp.inbox.empty')}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px,minmax(0,1fr)]">
              <div className="space-y-2 rounded-3xl border border-border bg-gray-50/70 p-3 dark:bg-gray-900/40">
                {chatThreads.map((thread) => {
                  const lastMessage = thread.messages[thread.messages.length - 1];
                  const isActive = selectedThread?.chatId === thread.chatId;
                  return (
                    <button
                      data-allow-raw="true"
                      key={thread.chatId}
                      type="button"
                      onClick={() => setSelectedChatId(thread.chatId)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-emerald-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-gray-950'
                          : 'border-transparent bg-transparent hover:border-border hover:bg-card dark:hover:border-gray-700 dark:hover:bg-gray-950/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900 dark:text-white">
                            {thread.chatTitle}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {thread.phoneNumber || thread.chatId}
                          </div>
                        </div>
                        {thread.unreadCount > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 truncate text-sm text-muted-foreground">
                        {lastMessage?.messageText || t('whatsapp.inbox.noMessage')}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString('tr-TR') : '-'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-3xl border border-border bg-white dark:bg-gray-900">
                {selectedThread ? (
                  <>
                    <div className="border-b border-border px-5 py-4">
                      <div className="text-base font-semibold text-gray-900 dark:text-white">
                        {selectedThread.chatTitle}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedThread.phoneNumber || selectedThread.chatId}
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      {selectedThread.messages.map((item) => (
                        <div
                          key={item.id}
                          className={`flex ${item.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              item.direction === 'inbound'
                                ? 'bg-muted text-gray-900 dark:text-gray-100'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm">{item.messageText}</div>
                            <div className={`mt-2 text-[11px] ${
                              item.direction === 'inbound' ? 'text-muted-foreground' : 'text-emerald-100'
                            }`}>
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : '-'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
