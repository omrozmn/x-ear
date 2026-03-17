import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ActivityLogRead } from '@/api/generated/schemas';

type ActivityLike = ActivityLogRead | Record<string, unknown>;

function readValue(activity: ActivityLike, key: string): unknown {
  return (activity as Record<string, unknown>)[key];
}

function getNestedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function getActivityDate(activity: ActivityLike): Date | null {
  const rawValue =
    readValue(activity, 'createdAt')
    ?? readValue(activity, 'created_at')
    ?? readValue(activity, 'timestamp')
    ?? readValue(activity, 'date')
    ?? readValue(activity, 'time');

  if (!rawValue) return null;

  try {
    if (typeof rawValue === 'string') return parseISO(rawValue);
    return new Date(rawValue as string | number | Date);
  } catch {
    return null;
  }
}

function resolveUser(activity: ActivityLike): string {
  const userRecord = getNestedRecord(readValue(activity, 'user'));
  return String(
    readValue(activity, 'userName')
    ?? readValue(activity, 'fullName')
    ?? userRecord?.fullName
    ?? userRecord?.username
    ?? readValue(activity, 'userId')
    ?? 'Sistem',
  );
}

function resolveAction(activity: ActivityLike): string {
  return String(
    readValue(activity, 'action')
    ?? readValue(activity, 'type')
    ?? readValue(activity, 'message')
    ?? '',
  );
}

function resolvePartyName(activity: ActivityLike): string {
  const dataRecord = getNestedRecord(readValue(activity, 'data'));
  const partyName = readValue(activity, 'partyName') ?? dataRecord?.partyName;
  return typeof partyName === 'string' ? partyName.trim() : '';
}

export function formatActivityTimeAgo(activity: ActivityLike): string {
  const date = getActivityDate(activity);
  if (!date || Number.isNaN(date.getTime())) return 'Az once';
  return formatDistanceToNow(date, { addSuffix: true, locale: tr });
}

export function formatActivityTimestamp(activity: ActivityLike): string {
  const date = getActivityDate(activity);
  if (!date || Number.isNaN(date.getTime())) return 'Zaman bilgisi yok';
  return format(date, 'd MMMM, HH:mm', { locale: tr });
}

export function formatActivitySentence(activity: ActivityLike): string {
  const user = resolveUser(activity);
  const action = resolveAction(activity);
  const explicitMessage = readValue(activity, 'message');
  const entityType = String(readValue(activity, 'entityType') ?? readValue(activity, 'entity') ?? '');
  const entityId = String(readValue(activity, 'entityId') ?? '');
  const partyName = resolvePartyName(activity);

  const parts = action.includes('.') ? action.split('.') : [];
  const derivedEntity = parts.length >= 2 ? parts[parts.length - 2] : entityType;
  const derivedVerb = parts.length >= 2 ? parts[parts.length - 1] : action;

  const entityMap: Record<string, string> = {
    party: 'hasta',
    device: 'cihaz',
    sale: 'satis',
    appointment: 'randevu',
    invoice: 'fatura',
    inventory: 'envanter kaydi',
    report: 'rapor',
    payment: 'odeme',
    cash: 'kasa kaydi',
  };

  const verbMap: Record<string, string> = {
    create: 'olusturdu',
    created: 'olusturdu',
    update: 'guncelledi',
    updated: 'guncelledi',
    delete: 'sildi',
    deleted: 'sildi',
    login: 'sisteme giris yapti',
    logout: 'sistemden cikis yapti',
    view: 'goruntuledi',
    list: 'listeledi',
    export: 'disa aktardi',
    import: 'ice aktardi',
    assign: 'atadi',
    assigned: 'atama yapti',
    complete: 'tamamladi',
    completed: 'tamamladi',
    cancel: 'iptal etti',
    cancelled: 'iptal etti',
    sent: 'gonderdi',
    pay: 'odeme aldi',
    paid: 'odeme tamamladi',
    alma: 'alma bildirimi olusturdu',
    verme: 'verme bildirimi olusturdu',
  };

  if (action === 'auth.login') return `${user} sisteme giris yapti.`;
  if (action === 'auth.logout') return `${user} sistemden cikis yapti.`;

  const entityLabel = entityMap[(entityType || derivedEntity).toLowerCase()] || (entityType || derivedEntity || 'kayit');
  const verbLabel =
    verbMap[derivedVerb.toLowerCase()]
    || (typeof explicitMessage === 'string' && explicitMessage.trim())
    || 'islem gerceklestirdi';

  const sentence = [user, entityLabel, verbLabel]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (partyName) return `${sentence} (${partyName}).`;
  if (entityId) return `${sentence} (#${entityId}).`;
  return `${sentence}.`;
}
