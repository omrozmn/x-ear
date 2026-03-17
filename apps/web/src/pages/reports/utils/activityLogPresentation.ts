import type { ActivityLogRead } from '@/api/generated/schemas';

const ACTION_TRANSLATIONS: Record<string, string> = {
  toplu_yukleme: 'Toplu yükleme',
  patient_created: 'Hasta oluşturuldu',
  patient_updated: 'Hasta güncellendi',
  sale_created: 'Satış oluşturuldu',
  sale_updated: 'Satış güncellendi',
  invoice_sent: 'Fatura gönderildi',
  login: 'Sisteme giriş yapıldı',
  logout: 'Sistemden çıkış yapıldı',
  auth_login: 'Sisteme giriş yapıldı',
  auth_logout: 'Sistemden çıkış yapıldı',
  payment_record_created: 'Ödeme kaydı oluşturuldu',
  payment_record_updated: 'Ödeme kaydı güncellendi',
  appointment_created: 'Randevu oluşturuldu',
  appointment_updated: 'Randevu güncellendi',
  appointment_cancelled: 'Randevu iptal edildi',
};

const ENTITY_TRANSLATIONS: Record<string, string> = {
  party: 'Hasta',
  patient: 'Hasta',
  appointment: 'Randevu',
  sale: 'Satış',
  payment_record: 'Ödeme Kaydı',
  payment: 'Ödeme',
  invoice: 'Fatura',
  auth: 'Kimlik Doğrulama',
};

const DETAIL_LABELS: Record<string, string> = {
  title: 'Başlık',
  amount: 'Tutar',
  payment_type: 'Ödeme Türü',
  paymenttype: 'Ödeme Türü',
  entity_id: 'Kayıt ID',
  entityid: 'Kayıt ID',
  status: 'Durum',
  note: 'Not',
};

const DETAIL_VALUE_TRANSLATIONS: Record<string, string> = {
  payment: 'Ödeme',
  refund: 'İade',
  collection: 'Tahsilat',
};

function normalizeToken(value?: string | null) {
  return (value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[./\-\s]+/g, '_');
}

function titleize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toLocaleUpperCase('tr-TR'));
}

export function translateActivityAction(action?: string | null) {
  if (!action) return '-';
  const normalized = normalizeToken(action);
  return ACTION_TRANSLATIONS[normalized] || titleize(action);
}

export function translateActivityMessage(log: ActivityLogRead) {
  const details = typeof log.details === 'object' && log.details ? log.details as Record<string, unknown> : null;
  const detailsTitle = typeof details?.title === 'string' ? details.title : undefined;
  const rawMessage = log.message || detailsTitle || log.action || '';
  const normalized = normalizeToken(rawMessage);

  return ACTION_TRANSLATIONS[normalized] || translateActivityAction(rawMessage);
}

export function translateActivityEntity(entityType?: string | null) {
  if (!entityType) return '-';
  const normalized = normalizeToken(entityType);
  return ENTITY_TRANSLATIONS[normalized] || titleize(entityType);
}

function translateDetailLabel(key: string) {
  const normalized = normalizeToken(key);
  return DETAIL_LABELS[normalized] || titleize(key);
}

function translateDetailValue(value: unknown) {
  if (typeof value === 'string') {
    const normalized = normalizeToken(value);
    return DETAIL_VALUE_TRANSLATIONS[normalized] || ACTION_TRANSLATIONS[normalized] || value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

export function getActivityDetailEntries(log: ActivityLogRead) {
  const source = typeof log.details === 'object' && log.details ? log.details as Record<string, unknown> : null;
  if (!source) return [];

  return Object.entries(source)
    .filter(([key]) => key !== 'title')
    .map(([key, value]) => ({
      label: translateDetailLabel(key),
      value: translateDetailValue(value),
    }));
}
