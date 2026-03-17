import { useCallback, useEffect, useState } from 'react';
import { Power, QrCode, RefreshCcw, Settings2 } from 'lucide-react';
import { Button, Card, useToastHelpers } from '@x-ear/ui-web';
import {
  getWhatsAppSessionStatus,
  createWhatsAppSessionStart,
  createWhatsAppSessionDisconnect,
  getWhatsAppConfig,
  updateWhatsAppConfig,
} from '@/api/client/whatsapp.client';

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

const DEFAULT_CONFIG: WhatsAppConfig = {
  aiTargetPhone: '',
  defaultCountryCode: '90',
  autoReplyEnabled: false,
  autoReplyPrompt: '',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Hazır Değil',
  starting: 'Başlatılıyor',
  loading: 'Yükleniyor',
  qr: 'QR Hazır',
  awaiting_qr: 'QR Hazırlanıyor',
  connected: 'Bağlı',
  disconnected: 'Bağlantı Kesildi',
  stopped: 'Durduruldu',
  error: 'Hata',
};

export default function WhatsAppIntegrationPanel() {
  const [session, setSession] = useState<WhatsAppStatus>({ status: 'idle', connected: false });
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_CONFIG);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { success, error } = useToastHelpers();

  const fetchStatus = useCallback(async (showError = false) => {
    try {
      const response = await getWhatsAppSessionStatus() as { data?: WhatsAppStatus };
      setSession(response?.data ?? { status: 'idle', connected: false });
    } catch (err) {
      if (showError) {
        error('WhatsApp durumu alınamadı', err instanceof Error ? err.message : 'Durum bilgisi alınamadı');
      }
    }
  }, [error]);

  const fetchConfig = useCallback(async () => {
    const response = await getWhatsAppConfig() as { data?: WhatsAppConfig };
    setConfig(response?.data ?? DEFAULT_CONFIG);
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchConfig();
  }, [fetchConfig, fetchStatus]);

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
    }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchStatus, session.connected, session.status]);

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setLoadingAction(key);
      await action();
    } catch (err) {
      error('WhatsApp hatası', err instanceof Error ? err.message : 'İşlem başarısız oldu');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConnect = () => runAction('connect', async () => {
    const response = await createWhatsAppSessionStart() as { data?: WhatsAppStatus };
    setSession(response?.data ?? session);
    success('WhatsApp başlatıldı', 'QR kod birkaç saniye içinde görünecek. Telefonunuzdan tarayın.');
  });

  const handleDisconnect = () => runAction('disconnect', async () => {
    await createWhatsAppSessionDisconnect();
    await fetchStatus();
    success('WhatsApp kapatıldı', 'Session bağlantısı sonlandırıldı.');
  });

  const handleSaveConfig = () => runAction('config', async () => {
    const response = await updateWhatsAppConfig(config) as { data?: WhatsAppConfig };
    setConfig(response?.data ?? DEFAULT_CONFIG);
    success('Ayarlar kaydedildi', 'WhatsApp ayarları güncellendi.');
  });

  const canDisconnect = session.connected
    || session.status === 'starting'
    || session.status === 'loading'
    || session.status === 'qr'
    || session.status === 'awaiting_qr'
    || session.status === 'error'
    || session.status === 'stopped'
    || session.status === 'idle';

  const statusLabel = session.connected ? 'Bağlı' : (STATUS_LABELS[session.status] ?? session.status);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp QR Bağlantısı</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Kullanıcı burada QR taratır. Session açıldıktan sonra toplu gönderim, tekli mesaj, inbox sync ve AI cevap akışları çalışır.
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
              {session.syncInProgress ? <span className="text-sky-600 dark:text-sky-400">Senkronize ediliyor</span> : null}
              {session.lastSyncAt ? <span className="text-muted-foreground">Son sync: {new Date(session.lastSyncAt * 1000).toLocaleTimeString('tr-TR')}</span> : null}
              {session.lastError ? <span className="text-destructive">{session.lastError}</span> : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { void fetchStatus(); }} disabled={loadingAction !== null}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            {canDisconnect ? (
              <Button variant="outline" onClick={handleDisconnect} disabled={loadingAction !== null}>
                <Power className="mr-2 h-4 w-4" />
                Bağlantıyı Kes
              </Button>
            ) : null}
            <Button onClick={handleConnect} disabled={loadingAction !== null}>
              <QrCode className="mr-2 h-4 w-4" />
              QR Başlat
            </Button>
          </div>
        </div>

        {session.qrCode ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 px-6 py-8 text-center dark:border-emerald-800 dark:bg-emerald-900/10">
            <img src={session.qrCode} alt="WhatsApp QR" className="h-72 w-72 rounded-2xl bg-card p-3 shadow-sm" />
            <p className="max-w-md text-sm text-muted-foreground">
              Telefonunuzdan WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla ile taratın.
            </p>
          </div>
        ) : session.status === 'starting' || session.status === 'loading' || session.status === 'awaiting_qr' ? (
          <div className="mt-6 rounded-3xl border border-dashed border-amber-300 bg-amber-50/60 px-6 py-8 text-center text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-200">
            QR hazırlanıyor. Bu ekran otomatik güncellenecek.
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp Ayarları</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-foreground">
            AI Hedef Telefon
            <input
              data-allow-raw="true"
              value={config.aiTargetPhone}
              onChange={(event) => setConfig((prev) => ({ ...prev, aiTargetPhone: event.target.value }))}
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="90532..."
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-foreground">
            Varsayılan Ülke Kodu
            <input
              data-allow-raw="true"
              value={config.defaultCountryCode}
              onChange={(event) => setConfig((prev) => ({ ...prev, defaultCountryCode: event.target.value }))}
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="90"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium text-foreground">
          <input
            data-allow-raw="true"
            type="checkbox"
            checked={config.autoReplyEnabled}
            onChange={(event) => setConfig((prev) => ({ ...prev, autoReplyEnabled: event.target.checked }))}
            className="h-4 w-4 rounded border-border text-emerald-600"
          />
          AI otomatik cevap aktif
        </label>

        <label className="mt-4 block space-y-2 text-sm font-medium text-foreground">
          AI Otomatik Cevap Promptu
          <textarea
            data-allow-raw="true"
            value={config.autoReplyPrompt}
            onChange={(event) => setConfig((prev) => ({ ...prev, autoReplyPrompt: event.target.value }))}
            className="min-h-[130px] w-full rounded-2xl border px-4 py-3"
            placeholder="Ajanın WhatsApp taleplerine nasıl cevap vereceğini tanımlayın"
          />
        </label>

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveConfig} disabled={loadingAction !== null}>
            Ayarları Kaydet
          </Button>
        </div>
      </Card>
    </div>
  );
}
