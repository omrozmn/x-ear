import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, Mail, MessageCircle, MessageSquareText, Save, ShieldCheck, Smartphone, TestTube2 } from 'lucide-react';

import { Button, useToastHelpers } from '@x-ear/ui-web';

import { getWhatsAppSessionStatus } from '@/api/generated/whats-app/whats-app';
import { useListSubscriptionCurrent } from '@/api/client/subscriptions.client';
import { useAuthStore } from '@/stores/authStore';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  useRunUtsSync,
  useTestUtsConfig,
  useUtsConfig,
  useUpdateUtsConfig,
} from '@/hooks/uts/useUts';
import type { UtsAuthScheme, UtsEnvironment, UtsMessageTemplate } from '@/services/uts/uts.service';

const authSchemeOptions: Array<{ value: UtsAuthScheme; label: string; help: string }> = [
  { value: 'auto', label: 'Otomatik dene', help: 'Bearer ve bilinen UTS header varyasyonlarini dener.' },
  { value: 'bearer', label: 'Authorization: Bearer', help: 'Token bearer seklinde gonderilir.' },
  { value: 'plain_authorization', label: 'Authorization: raw token', help: 'Authorization header icine token dogrudan yazilir.' },
  { value: 'uts_token', label: 'utsToken header', help: 'utsToken isimli custom header kullanir.' },
  { value: 'x_uts_token', label: 'X-UTS-Token header', help: 'X-UTS-Token isimli custom header kullanir.' },
  { value: 'token', label: 'token header', help: 'token isimli custom header kullanir.' },
];

export function UtsSettingsPanel() {
  const { user } = useAuthStore();
  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
  const { data: config, isLoading, refetch } = useUtsConfig();
  const { data: subscriptionData } = useListSubscriptionCurrent();
  const updateMutation = useUpdateUtsConfig();
  const testMutation = useTestUtsConfig();
  const syncMutation = useRunUtsSync();
  const isTenantAdmin = user?.role === 'tenant_admin' || user?.isImpersonatingTenant === true;
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] = useState<UtsEnvironment>('test');
  const [authScheme, setAuthScheme] = useState<UtsAuthScheme>('auto');
  const [token, setToken] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [notificationMode, setNotificationMode] = useState<'manual' | 'outbox'>('outbox');
  const [autoSendNotifications, setAutoSendNotifications] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState('');
  const [showIdentityOverrides, setShowIdentityOverrides] = useState(false);
  const [notificationTemplates, setNotificationTemplates] = useState<Record<string, UtsMessageTemplate>>({
    alma: {
      enabled: false,
      templateName: 'UTS Alma Bildirimi',
      subject: 'UTS alma bildirimi tamamlandi',
      bodyText: '{{productName}} icin UTS alma bildirimi {{movementDate}} tarihinde tamamlandi. Seri: {{serialNumber}}.',
      variables: ['{{productName}}', '{{serialNumber}}', '{{movementDate}}', '{{supplierName}}'],
      channels: { sms: false, whatsapp: false, email: true },
    },
    verme: {
      enabled: false,
      templateName: 'UTS Verme Bildirimi',
      subject: 'UTS verme bildirimi tamamlandi',
      bodyText: '{{productName}} icin UTS verme bildirimi {{movementDate}} tarihinde tamamlandi. Seri: {{serialNumber}}.',
      variables: ['{{productName}}', '{{serialNumber}}', '{{movementDate}}', '{{recipientName}}'],
      channels: { sms: false, whatsapp: false, email: true },
    },
  });

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setEnvironment(config.environment);
    setAuthScheme(config.authScheme);
    setToken(config.tokenMasked || '');
    setCompanyCode(config.companyCode || '');
    setMemberNumber(config.memberNumber || '');
    setNotificationMode(config.notificationMode);
    setAutoSendNotifications(config.autoSendNotifications);
    setBaseUrlOverride(config.baseUrl === (config.environment === 'prod'
      ? 'https://utsuygulama.saglik.gov.tr/UTS'
      : 'https://utstest.saglik.gov.tr/UTS')
      ? ''
      : config.baseUrl);
    setNotificationTemplates((previous) => ({
      ...previous,
      ...(config.notificationTemplates || {}),
    }));
  }, [config]);

  useEffect(() => {
    const fetchWhatsAppStatus = async () => {
      try {
        const response = await getWhatsAppSessionStatus();
        setWhatsAppConnected(Boolean((response as { data?: { connected?: boolean } })?.data?.connected));
      } catch {
        setWhatsAppConnected(false);
      }
    };
    void fetchWhatsAppStatus();
  }, []);

  const selectedScheme = useMemo(
    () => authSchemeOptions.find((option) => option.value === authScheme),
    [authScheme],
  );
  const companyAutofilled = config?.companyCodeSource === 'tenant_company_info';
  const memberAutofilled = config?.memberNumberSource === 'tenant_company_info';
  const hasAutofilledIdentity = companyAutofilled || memberAutofilled;
  const subscriptionInfo = (subscriptionData as unknown as { data?: { tenant?: { featureUsage?: Record<string, { limit?: number; used?: number }> }; plan?: { features?: Record<string, unknown> } } })?.data;
  const featureUsage = subscriptionInfo?.tenant?.featureUsage || {};
  const hasSmsCapability = 'sms_credits' in featureUsage || Object.keys(featureUsage).some((key) => key.includes('sms'));
  const hasWhatsAppCapability = whatsAppConnected || Object.keys(featureUsage).some((key) => key.includes('whatsapp'));

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showSuccessToast(`${label} kopyalandi`);
    } catch (error) {
      showErrorToast(extractErrorMessage(error, `${label} kopyalanamadi`));
    }
  };

  const updateTemplate = (movementType: 'alma' | 'verme', updater: (current: UtsMessageTemplate) => UtsMessageTemplate) => {
    setNotificationTemplates((previous) => ({
      ...previous,
      [movementType]: updater(previous[movementType]),
    }));
  };

  const handleSave = async () => {
    if (!isTenantAdmin) {
      showErrorToast('UTS ayarlarini sadece tenant admin kaydedebilir');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        enabled,
        environment,
        authScheme,
        token,
        companyCode,
        memberNumber,
        notificationMode,
        autoSendNotifications,
        baseUrlOverride: baseUrlOverride.trim() || undefined,
        notificationTemplates,
      });
      showSuccessToast('UTS ayarlari kaydedildi');
      await refetch();
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'UTS ayarlari kaydedilemedi'));
    }
  };

  const handleTest = async () => {
    if (!isTenantAdmin) {
      showErrorToast('UTS testi icin tenant admin yetkisi gerekiyor');
      return;
    }

    try {
      const result = await testMutation.mutateAsync();
      if (result.ok) {
        showSuccessToast('UTS baglanti testi basarili');
      } else {
        showErrorToast(result.message || 'UTS baglanti testi basarisiz');
      }
      await refetch();
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'UTS baglanti testi calistirilamadi'));
    }
  };

  const handleRunSync = async () => {
    if (!isTenantAdmin) {
      showErrorToast('UTS sync icin tenant admin yetkisi gerekiyor');
      return;
    }
    try {
      const result = await syncMutation.mutateAsync();
      showSuccessToast(result.lastSyncMessage || 'UTS sync tamamlandi');
      await refetch();
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'UTS sync calistirilamadi'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-semibold">UTS Entegrasyonu</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Bu panel tenant bazli UTS tokenini, auth header semasini ve ilk baglanti testini yonetir.
              Alma-verme bildirimleri sonraki adimda ayni ayarlardan beslenecek.
            </p>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Firma no ve kurum no alanlari varsa tenant sirket bilgilerinizden otomatik doldurulur. Resmi UTS tarafinda
              sistem token ile guvenle dogrulanmis bir "kurum/firma bilgisi getir" servisi cikaramadigimiz icin bu alanlar
              su an duzenlenebilir birer varsayilan olarak birakildi.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-slate-500">
              Durum: {config?.identityDiscoverySupported ? 'resmi token discovery aktif' : 'resmi token discovery dogrulanamadi, tenant company info fallback kullaniliyor'}.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{config?.tokenConfigured ? 'Token kayitli' : 'Token kayitli degil'}</div>
            <div className="mt-1">{config?.baseUrl}</div>
            <div className="mt-2 text-xs text-slate-500">
              Sync: her {config?.sync?.intervalMinutes || 30} dk
              {config?.sync?.lastSyncAt ? ` • son: ${new Date(config.sync.lastSyncAt).toLocaleString('tr-TR')}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Ortam</span>
                <select
                  data-allow-raw="true"
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value as UtsEnvironment)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                >
                  <option value="test">Test</option>
                  <option value="prod">Canli</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Auth semasi</span>
                <select
                  data-allow-raw="true"
                  value={authScheme}
                  onChange={(event) => setAuthScheme(event.target.value as UtsAuthScheme)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                >
                  {authSchemeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{selectedScheme?.help}</p>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">UTS token</span>
                <input
                  data-allow-raw="true"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="UTS tarafindan uretilen token"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                />
                <p className="text-xs text-slate-500">
                  Kayitli token maskeli gelir. Degistirmeyeceksen oldugu gibi birakabilirsin.
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Firma kodu</span>
                {companyAutofilled && !showIdentityOverrides ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {companyCode}
                  </div>
                ) : (
                  <input
                    data-allow-raw="true"
                    value={companyCode}
                    onChange={(event) => setCompanyCode(event.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  />
                )}
                {config?.companyCodeSource === 'tenant_company_info' ? (
                  <p className="text-xs text-emerald-600">Tenant firma bilgilerinden otomatik dolduruldu.</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Uye / kurum no</span>
                {memberAutofilled && !showIdentityOverrides ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {memberNumber}
                  </div>
                ) : (
                  <input
                    data-allow-raw="true"
                    value={memberNumber}
                    onChange={(event) => setMemberNumber(event.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  />
                )}
                {config?.memberNumberSource === 'tenant_company_info' ? (
                  <p className="text-xs text-emerald-600">Tenant firma bilgilerinden otomatik dolduruldu.</p>
                ) : (
                  <p className="text-xs text-slate-500">UTS bildirim payloadindaki KUN alani icin gerekir.</p>
                )}
              </label>

              {hasAutofilledIdentity ? (
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowIdentityOverrides((current) => !current)}
                    className="inline-flex h-auto items-center gap-2 px-0 py-0 text-sm font-medium text-sky-700 hover:bg-transparent hover:text-sky-800"
                  >
                    {showIdentityOverrides ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showIdentityOverrides ? 'Manuel override alanlarini gizle' : 'Firma / kurum kodunu manuel duzenle'}
                  </Button>
                </div>
              ) : null}

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Base URL override</span>
                <input
                  data-allow-raw="true"
                  value={baseUrlOverride}
                  onChange={(event) => setBaseUrlOverride(event.target.value)}
                  placeholder="Bos birakirsan resmi test/canli URL kullanilir"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">UTS entegrasyonu aktif</span>
                  <span className="block text-xs text-slate-500">Kapali iken bildirim isleri queue’ya dusmez.</span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={autoSendNotifications}
                  onChange={(event) => setAutoSendNotifications(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Bildirimleri otomatik yolla</span>
                  <span className="block text-xs text-slate-500">Su an yalnizca ayar olarak saklanir; alma-verme worker baglanacak.</span>
                </span>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Bildirim modu</span>
                <select
                  data-allow-raw="true"
                  value={notificationMode}
                  onChange={(event) => setNotificationMode(event.target.value as 'manual' | 'outbox')}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                >
                  <option value="outbox">Outbox / queue</option>
                  <option value="manual">Manuel tetikle</option>
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">UTS Seri Sync</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Kayitli seri durumlari resmi tekil urun sorgusu ile periyodik senkronize edilir.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {config?.sync?.lastSyncMessage || 'Henüz sync çalışmadı'}
                  </p>
                </div>
                <Button variant="outline" onClick={handleRunSync} disabled={syncMutation.isPending}>
                  {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                  Şimdi Senkronize Et
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Kaydet
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || (!token && !config?.tokenConfigured)}
              >
                {testMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                Baglantiyi Test Et
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <MessageSquareText className="h-5 w-5 text-sky-600" />
              <h3 className="text-base font-semibold">Alma / Verme Mesaj Sabitleri</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Tedarikci secildiginde sistem mevcut tedarikci telefon ve e-posta bilgisini varsayilan hedef olarak ceker.
              Kullanici gonderim aninda bu alanlari degistirebilir.
            </p>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {(['alma', 'verme'] as const).map((movementType) => {
                const template = notificationTemplates[movementType];
                return (
                  <div key={movementType} className="rounded-2xl border border-slate-200 p-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                      <input
                        data-allow-raw="true"
                        type="checkbox"
                        checked={template.enabled}
                        onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, enabled: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                      />
                      {movementType === 'alma' ? 'Alma bildirimi sabloni' : 'Verme bildirimi sabloni'}
                    </label>
                    <div className="mt-4 space-y-3">
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">Sablon adi</span>
                        <input
                          data-allow-raw="true"
                          value={template.templateName}
                          onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, templateName: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">E-posta konusu</span>
                        <input
                          data-allow-raw="true"
                          value={template.subject || ''}
                          onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, subject: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">Mesaj metni</span>
                        <textarea
                          data-allow-raw="true"
                          rows={5}
                          value={template.bodyText}
                          onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, bodyText: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <Button
                            key={variable}
                            type="button"
                            variant="outline"
                            onClick={() => updateTemplate(movementType, (current) => ({ ...current, bodyText: `${current.bodyText}${current.bodyText.endsWith(' ') ? '' : ' '}${variable}` }))}
                            className="rounded-full px-3 py-1 text-xs"
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${hasSmsCapability ? 'border-slate-200' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                          <input
                            data-allow-raw="true"
                            type="checkbox"
                            checked={template.channels.sms}
                            disabled={!hasSmsCapability}
                            onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, channels: { ...current.channels, sms: event.target.checked } }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600"
                          />
                          <Smartphone className="h-4 w-4" />
                          SMS
                        </label>
                        <label className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${hasWhatsAppCapability ? 'border-slate-200' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                          <input
                            data-allow-raw="true"
                            type="checkbox"
                            checked={template.channels.whatsapp}
                            disabled={!hasWhatsAppCapability}
                            onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, channels: { ...current.channels, whatsapp: event.target.checked } }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600"
                          />
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </label>
                        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                          <input
                            data-allow-raw="true"
                            type="checkbox"
                            checked={template.channels.email}
                            onChange={(event) => updateTemplate(movementType, (current) => ({ ...current, channels: { ...current.channels, email: event.target.checked } }))}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600"
                          />
                          <Mail className="h-4 w-4" />
                          E-posta
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Token ve IP Kurulumu</h3>
                <p className="mt-1 text-sm text-slate-600">Public IP'yi UTS sistem token izinli IP listesine ekleyip ayni ekrandan tokeni kaydet.</p>
              </div>
              {config?.publicIp ? (
                <Button variant="outline" onClick={() => void handleCopy(config.publicIp || '', 'Public IP')}>
                  <Copy className="mr-2 h-4 w-4" />
                  IP'yi Kopyala
                </Button>
              ) : null}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Public IP</div>
              <div className="mt-1 break-all">{config?.publicIp || 'Tespit edilemedi'}</div>
              {config?.publicIpDetectedAt ? (
                <div className="mt-2 text-xs text-slate-500">Son tespit: {new Date(config.publicIpDetectedAt).toLocaleString('tr-TR')}</div>
              ) : null}
            </div>
            <ol className="mt-4 space-y-2 text-sm text-slate-700">
              {config?.tokenSetupSteps?.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              {config?.lastTest?.ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <h3 className="text-base font-semibold">Son baglanti testi</h3>
            </div>

            {config?.lastTest ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className={`rounded-2xl border px-4 py-3 ${config.lastTest.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {config.lastTest.message}
                </div>
                <div><span className="font-medium">Tarih:</span> {new Date(config.lastTest.testedAt).toLocaleString('tr-TR')}</div>
                <div><span className="font-medium">HTTP:</span> {config.lastTest.httpStatus ?? '-'}</div>
                <div><span className="font-medium">Header:</span> {config.lastTest.authSchemeUsed ?? '-'}</div>
                <div className="break-all"><span className="font-medium">Endpoint:</span> {config.lastTest.testedUrl}</div>
                {config.lastTest.rawErrorCode ? (
                  <div><span className="font-medium">UTS Hata:</span> {config.lastTest.rawErrorCode}</div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Henuz bir test calistirilmadi.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Hazir kalan altyapi</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Tenant bazli test/canli ortam secimi</li>
              <li>Maskeli token saklama ve yeniden yazmadan guncelleme</li>
              <li>Header semasi secimi ve otomatik fallback testi</li>
              <li>Alma / verme bildirimleri icin outbox modu ayari</li>
              <li>UTS mesaj sablonlari ve kanal bazli varsayilanlar</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Referans</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <a
                href={config?.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sky-700 hover:text-sky-800"
              >
                Resmi web servis dokumani
                <ExternalLink className="h-4 w-4" />
              </a>
              <div className="break-all">
                <span className="font-medium">Test endpoint:</span> {config?.testEndpointUrl}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default UtsSettingsPanel;
