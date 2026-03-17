import { useMemo, useState } from 'react';
import { Button, Card, useToastHelpers } from '@x-ear/ui-web';
import { Mail, Send, Users } from 'lucide-react';
import { apiClient } from '@/api/orval-mutator';
import { useListParties } from '@/api/client/branches.client';
import type { PartyRead } from '@/api/generated/schemas';
import { unwrapArray } from '@/utils/response-unwrap';
import SmsAutomationTab from './SmsAutomationTab';

type EmailSubTab = 'single' | 'bulk' | 'automation';

export default function EmailTab() {
  const [activeTab, setActiveTab] = useState<EmailSubTab>('single');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkBody, setBulkBody] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { success, error, warning } = useToastHelpers();

  const { data: partiesData } = useListParties({ page: 1, per_page: 25, search: partySearch || undefined });
  const parties = useMemo(() => unwrapArray<PartyRead>(partiesData), [partiesData]);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    try {
      setLoading(key);
      await fn();
    } catch (err) {
      error('E-posta hatası', err instanceof Error ? err.message : 'İşlem başarısız oldu');
    } finally {
      setLoading(null);
    }
  };

  const toggleParty = (partyId: string) => {
    setSelectedPartyIds((prev) => (
      prev.includes(partyId) ? prev.filter((item) => item !== partyId) : [...prev, partyId]
    ));
  };

  const sendSingle = () => runAction('single', async () => {
    if (!toEmail.trim() || !subject.trim() || !body.trim()) {
      warning('Eksik alan', 'Alıcı, konu ve içerik zorunlu.');
      return;
    }
    await apiClient.post('/api/communications/messages/send-email', {
      toEmail,
      subject,
      bodyText: body,
      fromEmail: 'noreply@x-ear.com',
    });
    success('E-posta gönderildi', 'Tekli e-posta başarıyla gönderildi.');
    setBody('');
  });

  const sendBulk = () => runAction('bulk', async () => {
    if (!bulkSubject.trim() || !bulkBody.trim() || selectedPartyIds.length === 0) {
      warning('Eksik alan', 'Toplu gönderim için hasta, konu ve içerik seçin.');
      return;
    }
    await apiClient.post('/api/parties/bulk-email', {
      partyIds: selectedPartyIds,
      subject: bulkSubject,
      bodyText: bulkBody,
    });
    success('Toplu e-posta işlendi', `${selectedPartyIds.length} hasta için e-posta işlemi başlatıldı.`);
  });

  return (
    <div className="space-y-6">
      <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
        <nav className="flex space-x-1">
          {([
            { id: 'single', label: 'Tekil', icon: <Send className="h-4 w-4" /> },
            { id: 'bulk', label: 'Toplu', icon: <Users className="h-4 w-4" /> },
            { id: 'automation', label: 'Otomasyon', icon: <Mail className="h-4 w-4" /> },
          ] as const).map((tab) => (
            <button
              data-allow-raw="true"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white dark:bg-sky-500'
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

      {activeTab === 'single' ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-600" />
            <h3 className="text-lg font-semibold">Tekil E-posta</h3>
          </div>
          <input data-allow-raw="true" value={toEmail} onChange={(e) => setToEmail(e.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder="Alıcı e-posta" />
          <input data-allow-raw="true" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder="Konu" />
          <textarea data-allow-raw="true" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[180px] w-full rounded-2xl border px-4 py-3" placeholder="İçerik" />
          <Button onClick={sendSingle} disabled={loading !== null}>E-posta Gönder</Button>
        </Card>
      ) : null}

      {activeTab === 'bulk' ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            <h3 className="text-lg font-semibold">Toplu E-posta</h3>
          </div>
          <input data-allow-raw="true" value={partySearch} onChange={(e) => setPartySearch(e.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder="Hasta ara" />
          <div className="max-h-64 space-y-2 overflow-auto rounded-2xl border p-3">
            {parties.map((party) => (
              <label key={party.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="text-sm">{party.firstName} {party.lastName} {party.email ? `• ${party.email}` : ''}</span>
                <input data-allow-raw="true" type="checkbox" checked={selectedPartyIds.includes(party.id || '')} onChange={() => party.id && toggleParty(party.id)} />
              </label>
            ))}
          </div>
          <input data-allow-raw="true" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} className="w-full rounded-2xl border px-4 py-3" placeholder="Toplu konu" />
          <textarea data-allow-raw="true" value={bulkBody} onChange={(e) => setBulkBody(e.target.value)} className="min-h-[180px] w-full rounded-2xl border px-4 py-3" placeholder="Toplu içerik" />
          <Button onClick={sendBulk} disabled={loading !== null}>Toplu E-posta Gönder</Button>
        </Card>
      ) : null}

      {activeTab === 'automation' ? (
        <SmsAutomationTab creditBalance={0} creditLoading={false} channel="email" />
      ) : null}
    </div>
  );
}
