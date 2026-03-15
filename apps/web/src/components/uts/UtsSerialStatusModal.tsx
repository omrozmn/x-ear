import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Search,
  Send,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Input, Modal } from '@x-ear/ui-web';

import { createCommunicationMessageSendSms } from '@/api/generated/communications/communications';
import { createCommunicationMessageSendEmail } from '@/api/generated/communications/communications';
import { getWhatsAppSessionStatus, createWhatsAppSendMessage } from '@/api/generated/whats-app/whats-app';
import type { ListSuppliersParams } from '@/api/generated/schemas';
import { useListSubscriptionCurrent } from '@/api/client/subscriptions.client';
import { useSuppliers } from '@/hooks/useSuppliers';
import {
  useExecuteUtsAlma,
  useExecuteUtsVerme,
  useUpsertUtsSerialState,
  useUtsConfig,
} from '@/hooks/uts/useUts';
import type { UtsMessageTemplate, UtsSerialState, UtsSerialStatus } from '@/services/uts/uts.service';

import { UtsSerialStatusBadge } from './UtsSerialStatusBadge';

interface UtsSerialStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  serialState?: UtsSerialState | null;
  serialStates?: UtsSerialState[] | null;
  forcedMovementType?: 'verme' | 'alma';
  onCompleted?: () => void;
}

type NotificationChannel = 'sms' | 'whatsapp' | 'email';

const CHANNEL_LABELS = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'E-posta',
} as const;

const STATUS_ACTIONS: Array<{ status: UtsSerialStatus; label: string }> = [
  { status: 'owned', label: 'UTS Bizde' },
  { status: 'pending_receipt', label: 'UTS Alma Bekliyor' },
  { status: 'not_owned', label: 'UTS Bizde Degil' },
];

const RECENT_STORAGE_KEYS = {
  institution: 'uts_recent_institutions',
  product: 'uts_recent_products',
  serial: 'uts_recent_serials',
  document: 'uts_recent_documents',
};

const readRecent = (key: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];
  } catch {
    return [];
  }
};

const writeRecent = (key: string, value: string) => {
  if (typeof window === 'undefined' || !value.trim()) return;
  const next = [value.trim(), ...readRecent(key).filter((item) => item !== value.trim())].slice(0, 8);
  window.localStorage.setItem(key, JSON.stringify(next));
};

const renderTemplate = (
  template: UtsMessageTemplate | undefined,
  serialState: UtsSerialState | null,
  recipientName: string,
) => {
  const base = template?.bodyText || '';
  const replacements: Record<string, string> = {
    '{{productName}}': serialState?.productName || serialState?.inventoryName || '-',
    '{{serialNumber}}': serialState?.serialNumber || '-',
    '{{movementDate}}': new Date().toLocaleDateString('tr-TR'),
    '{{supplierName}}': serialState?.supplierName || '-',
    '{{recipientName}}': recipientName || serialState?.supplierName || '-',
  };

  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.split(key).join(value),
    base,
  );
};

export function UtsSerialStatusModal({
  isOpen,
  onClose,
  serialState,
  serialStates,
  forcedMovementType,
  onCompleted,
}: UtsSerialStatusModalProps) {
  const { data: utsConfig } = useUtsConfig();
  const { data: subscriptionData } = useListSubscriptionCurrent();
  const { data: suppliersResponse } = useSuppliers({ page: 1, per_page: 100 } as ListSuppliersParams);
  const upsertState = useUpsertUtsSerialState();
  const executeVerme = useExecuteUtsVerme();
  const executeAlma = useExecuteUtsAlma();

  const items = useMemo(() => {
    if (serialStates?.length) return serialStates.filter(Boolean);
    return serialState ? [serialState] : [];
  }, [serialState, serialStates]);
  const primaryItem = items[0] || null;
  const isBulk = items.length > 1;

  const [institutionNumber, setInstitutionNumber] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [productNumber, setProductNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>([]);
  const [statusOverride, setStatusOverride] = useState<UtsSerialStatus>('owned');
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);

  const [recentInstitutions, setRecentInstitutions] = useState<string[]>([]);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [recentSerials, setRecentSerials] = useState<string[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<string[]>([]);

  const suppliers = useMemo(() => {
    const raw = suppliersResponse as unknown;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      const outer = raw as { data?: unknown };
      if (Array.isArray(outer.data)) return outer.data;
      if (outer.data && typeof outer.data === 'object') {
        const inner = outer.data as { data?: unknown };
        if (Array.isArray(inner.data)) return inner.data;
      }
    }
    return [];
  }, [suppliersResponse]);

  const movementType = forcedMovementType || (primaryItem?.status === 'pending_receipt' ? 'alma' : 'verme');
  const activeTemplate = utsConfig?.notificationTemplates?.[movementType];
  const subscriptionInfo = (subscriptionData as unknown as { data?: { tenant?: { featureUsage?: Record<string, unknown> } } })?.data;
  const featureUsage = subscriptionInfo?.tenant?.featureUsage || {};
  const hasSmsCapability = 'sms_credits' in featureUsage || Object.keys(featureUsage).some((key) => key.includes('sms'));
  const hasWhatsAppCapability = whatsAppConnected || Object.keys(featureUsage).some((key) => key.includes('whatsapp'));
  const hasEmailCapability = true;

  useEffect(() => {
    if (!isOpen) return;
    setRecentInstitutions(readRecent(RECENT_STORAGE_KEYS.institution));
    setRecentProducts(readRecent(RECENT_STORAGE_KEYS.product));
    setRecentSerials(readRecent(RECENT_STORAGE_KEYS.serial));
    setRecentDocuments(readRecent(RECENT_STORAGE_KEYS.document));
  }, [isOpen]);

  useEffect(() => {
    const loadWhatsAppStatus = async () => {
      try {
        const response = await getWhatsAppSessionStatus();
        setWhatsAppConnected(Boolean((response as { data?: { connected?: boolean } })?.data?.connected));
      } catch {
        setWhatsAppConnected(false);
      }
    };
    void loadWhatsAppStatus();
  }, []);

  const enabledChannels = useMemo(() => {
    if (!activeTemplate?.enabled) return [];
    const list: NotificationChannel[] = [];
    if (activeTemplate.channels.sms && hasSmsCapability) list.push('sms');
    if (activeTemplate.channels.whatsapp && hasWhatsAppCapability) list.push('whatsapp');
    if (activeTemplate.channels.email && hasEmailCapability) list.push('email');
    return list;
  }, [activeTemplate, hasEmailCapability, hasSmsCapability, hasWhatsAppCapability]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 8);
    return suppliers.filter((supplier) => {
      const name = String(supplier.companyName || supplier.name || '').toLowerCase();
      const institution = String(supplier.institutionNumber || '').toLowerCase();
      return name.includes(q) || institution.includes(q);
    }).slice(0, 8);
  }, [supplierSearch, suppliers]);

  useEffect(() => {
    if (!primaryItem || !isOpen) return;
    setInstitutionNumber(primaryItem.institutionNumber || '');
    setDocumentNumber(primaryItem.documentNumber || '');
    setProductNumber(primaryItem.productNumber || '');
    setSerialNumber(primaryItem.serialNumber || '');
    setStatusOverride(primaryItem.status);
    const defaultSupplier = suppliers.find((supplier) =>
      String(supplier.id) === String(primaryItem.supplierId || '')
      || supplier.companyName === primaryItem.supplierName
      || supplier.name === primaryItem.supplierName,
    );
    if (defaultSupplier) {
      setSupplierSearch(defaultSupplier.companyName || defaultSupplier.name || '');
      setContactName(defaultSupplier.contactPerson || '');
      setPhoneNumber(defaultSupplier.mobile || defaultSupplier.phone || '');
      setEmailAddress(defaultSupplier.email || '');
      setInstitutionNumber(primaryItem.institutionNumber || defaultSupplier.institutionNumber || '');
    } else {
      setSupplierSearch(primaryItem.supplierName || '');
      setContactName('');
      setPhoneNumber('');
      setEmailAddress('');
    }
    setSelectedChannels(enabledChannels);
  }, [enabledChannels, isOpen, primaryItem, suppliers]);

  const messagePreview = useMemo(
    () => renderTemplate(activeTemplate, primaryItem, contactName),
    [activeTemplate, contactName, primaryItem],
  );

  const handleSupplierPick = (supplier: Record<string, unknown>) => {
    setSupplierSearch(String(supplier.companyName || supplier.name || ''));
    setContactName(String(supplier.contactPerson || ''));
    setPhoneNumber(String(supplier.mobile || supplier.phone || ''));
    setEmailAddress(String(supplier.email || ''));
    setInstitutionNumber(String(primaryItem?.institutionNumber || supplier.institutionNumber || institutionNumber || ''));
  };

  const toggleChannel = (channel: NotificationChannel) => {
    setSelectedChannels((previous) =>
      previous.includes(channel)
        ? previous.filter((item) => item !== channel)
        : [...previous, channel],
    );
  };

  const handleManualStatus = async () => {
    if (!primaryItem) return;
    try {
      await upsertState.mutateAsync({
        status: statusOverride,
        inventoryId: primaryItem.inventoryId || undefined,
        inventoryName: primaryItem.inventoryName || undefined,
        productName: primaryItem.productName || undefined,
        productNumber: productNumber || primaryItem.productNumber || undefined,
        serialNumber: serialNumber || primaryItem.serialNumber || undefined,
        lotBatchNumber: primaryItem.lotBatchNumber || undefined,
        supplierName: primaryItem.supplierName || undefined,
        supplierId: primaryItem.supplierId || undefined,
        institutionNumber: institutionNumber || undefined,
        documentNumber: documentNumber || undefined,
        lastMovementType: 'manual_update',
      });
      toast.success('UTS durumu guncellendi');
      onCompleted?.();
    } catch (error) {
      console.error(error);
      toast.error('UTS durumu guncellenemedi');
    }
  };

  const handleSendNotification = async () => {
    if (!activeTemplate?.enabled) {
      toast.error('Bu hareket icin aktif mesaj sablonu yok');
      return;
    }
    if (!selectedChannels.length) {
      toast.error('En az bir gonderim kanali sec');
      return;
    }

    const tasks: Promise<unknown>[] = [];
    if (selectedChannels.includes('sms')) {
      if (!phoneNumber.trim()) {
        toast.error('SMS icin telefon numarasi gerekli');
        return;
      }
      tasks.push(createCommunicationMessageSendSms({
        phoneNumber: phoneNumber.trim(),
        message: messagePreview,
      }));
    }
    if (selectedChannels.includes('whatsapp')) {
      if (!phoneNumber.trim()) {
        toast.error('WhatsApp icin telefon numarasi gerekli');
        return;
      }
      tasks.push(createWhatsAppSendMessage({
        phoneNumber: phoneNumber.trim(),
        message: messagePreview,
      }));
    }
    if (selectedChannels.includes('email')) {
      if (!emailAddress.trim()) {
        toast.error('E-posta icin adres gerekli');
        return;
      }
      tasks.push(createCommunicationMessageSendEmail({
        toEmail: emailAddress.trim(),
        subject: activeTemplate.subject || 'UTS Bildirimi',
        bodyText: messagePreview,
      }));
    }

    try {
      await Promise.all(tasks);
      toast.success('Mesaj gonderildi');
    } catch (error) {
      console.error(error);
      toast.error('Mesaj gonderilemedi');
    }
  };

  const handleExecuteMovement = async () => {
    if (!items.length) return;
    if (movementType === 'verme' && !institutionNumber.trim()) {
      toast.error('Verme icin kurum no gerekli');
      return;
    }
    if (movementType === 'verme' && !documentNumber.trim()) {
      toast.error('Verme icin belge no gerekli');
      return;
    }

    const results = [];
    for (const item of items) {
      const resolvedProductNumber = item.productNumber || productNumber;
      const resolvedSerialNumber = item.serialNumber || serialNumber;
      if (!resolvedProductNumber) {
        toast.error(`UTS urun numarasi eksik: ${item.inventoryName || item.productName || '-'}`);
        return;
      }
      try {
        const payload = {
          inventoryId: item.inventoryId || undefined,
          inventoryName: item.inventoryName || undefined,
          productName: item.productName || undefined,
          supplierName: item.supplierName || undefined,
          supplierId: item.supplierId || undefined,
          productNumber: resolvedProductNumber,
          serialNumber: resolvedSerialNumber || undefined,
          lotBatchNumber: item.lotBatchNumber || undefined,
          quantity: 1,
          recipientInstitutionNumber: movementType === 'verme' ? institutionNumber.trim() : undefined,
          sourceInstitutionNumber: movementType === 'alma' ? institutionNumber.trim() || undefined : undefined,
          documentNumber: documentNumber.trim() || undefined,
        };
        const response = movementType === 'verme'
          ? await executeVerme.mutateAsync(payload)
          : await executeAlma.mutateAsync(payload);
        results.push(response);
      } catch (error) {
        console.error(error);
        results.push(null);
      }
    }

    writeRecent(RECENT_STORAGE_KEYS.institution, institutionNumber);
    writeRecent(RECENT_STORAGE_KEYS.product, productNumber || primaryItem?.productNumber || '');
    writeRecent(RECENT_STORAGE_KEYS.serial, serialNumber || primaryItem?.serialNumber || '');
    writeRecent(RECENT_STORAGE_KEYS.document, documentNumber);

    const successCount = results.filter((result) => result?.utsSuccess).length;
    const failedCount = results.length - successCount;
    if (failedCount === 0) {
      toast.success(isBulk ? `${successCount} cihaz icin ${movementType} tamamlandi` : `${movementType} bildirimi basarili`);
    } else {
      toast.error(`${successCount} basarili, ${failedCount} basarisiz`);
    }
    onCompleted?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={movementType === 'verme' ? 'UTS Verme Islem Merkezi' : 'UTS Alma Islem Merkezi'} size="xl">
      {!primaryItem ? null : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {isBulk ? `${items.length} seri secili` : (primaryItem.productName || primaryItem.inventoryName || 'Seri kaydi')}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {isBulk
                    ? 'Toplu islem seri bazli ayri UTS cagri olarak gonderilir.'
                    : `Seri: ${primaryItem.serialNumber || '-'} • Barkod: ${primaryItem.productNumber || '-'}`}
                </p>
              </div>
              {!isBulk ? <UtsSerialStatusBadge status={primaryItem.status} /> : null}
            </div>
            {primaryItem.lastMessage ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <AlertCircle className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>{primaryItem.lastMessage}</span>
              </div>
            ) : null}
          </div>

          {!isBulk ? (
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-semibold">Durum Yonetimi</h4>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((item) => (
                  <Button
                    key={item.status}
                    onClick={() => setStatusOverride(item.status)}
                    variant="ghost"
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      statusOverride === item.status
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={handleManualStatus} disabled={upsertState.isPending}>
                  {upsertState.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Durumu Kaydet
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Send className="h-4 w-4 text-sky-600" />
              <h4 className="text-sm font-semibold">{movementType === 'verme' ? 'Verme Bildirimi' : 'Alma Bildirimi'}</h4>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Tedarikci veya kurum ara</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} placeholder="Tedarikci adi veya kurum no" className="pl-10" />
                </div>
                {supplierSearch.trim() ? (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                    {filteredSuppliers.length ? filteredSuppliers.map((supplier) => (
                      <Button
                        key={String(supplier.id)}
                        variant="ghost"
                        className="flex h-auto w-full flex-col items-start rounded-none px-3 py-2 text-left hover:bg-slate-50"
                        onClick={() => handleSupplierPick(supplier)}
                      >
                        <span className="text-sm font-medium text-slate-800">{supplier.companyName || supplier.name}</span>
                        <span className="text-xs text-slate-500">{supplier.institutionNumber || 'Kurum no kayitli degil'}</span>
                      </Button>
                    )) : (
                      <div className="px-3 py-2 text-sm text-slate-500">Eslesen tedarikci bulunamadi</div>
                    )}
                  </div>
                ) : null}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">{movementType === 'verme' ? 'Hedef kurum no' : 'Kaynak kurum no'}</span>
                <Input value={institutionNumber} onChange={(event) => setInstitutionNumber(event.target.value)} placeholder="Kurum no" list="uts-recent-institutions" />
                <datalist id="uts-recent-institutions">
                  {recentInstitutions.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Belge no</span>
                <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder="Belge no" list="uts-recent-documents" />
                <datalist id="uts-recent-documents">
                  {recentDocuments.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Barkod / Urun no</span>
                <Input value={productNumber} onChange={(event) => setProductNumber(event.target.value)} placeholder="Barkod" list="uts-recent-products" />
                <datalist id="uts-recent-products">
                  {recentProducts.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Seri no</span>
                <Input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Seri no" list="uts-recent-serials" disabled={isBulk} />
                <datalist id="uts-recent-serials">
                  {recentSerials.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleExecuteMovement} disabled={executeVerme.isPending || executeAlma.isPending}>
                {(executeVerme.isPending || executeAlma.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isBulk
                  ? (movementType === 'verme' ? `Secilenleri Ver (${items.length})` : `Secilenleri Al (${items.length})`)
                  : (movementType === 'verme' ? 'Verme Bildirimi Yap' : 'Alma Bildirimi Yap')}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <MessageSquareText className="h-4 w-4 text-violet-600" />
              <h4 className="text-sm font-semibold">Verme Istegi / Bilgilendirme Mesaji</h4>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Sorumlu kisi</span>
                <Input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Ad soyad" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Telefon</span>
                <Input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="05xx xxx xx xx" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">E-posta</span>
                <Input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="ornek@firma.com" />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Mail className="h-4 w-4" />
                Mesaj Onizleme
              </div>
              <p className="text-sm leading-6 text-slate-700">{messagePreview || 'Aktif sablon yok'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {enabledChannels.map((channel) => (
                <Button
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  variant="ghost"
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    selectedChannels.includes(channel)
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {channel === 'sms' ? <Smartphone className="h-4 w-4" /> : channel === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  {CHANNEL_LABELS[channel]}
                </Button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleSendNotification}>
                <Send className="mr-2 h-4 w-4" />
                Verme Istegi Gonder
              </Button>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

export default UtsSerialStatusModal;
