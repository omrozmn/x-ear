import { parseISO, format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Create a readable, modern single-sentence activity formatter (Turkish)
export function formatActivitySentence(act: any): string {
  // Accept various timestamp keys
  const ts = act?.createdAt || act?.created_at || act?.timestamp || act?.date || act?.time || null;
  let timeStr = '';
  if (ts) {
    try {
      const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
      timeStr = format(d, "d LLL yyyy, HH:mm", { locale: tr });
    } catch (e) {
      timeStr = String(ts);
    }
  }

  const user = act?.user?.fullName || act?.user?.username || act?.user || act?.userId || act?.performedBy || 'Sistem';
  const rawAction = (act?.action || act?.type || act?.message || act?.title || '').toString();

  // map some common action verbs to Turkish friendly phrases
  const verbMap: Record<string, string> = {
    create: 'oluşturdu',
    created: 'oluşturdu',
    update: 'güncelledi',
    updated: 'güncelledi',
    delete: 'sildi',
    deleted: 'sildi',
    login: 'giriş yaptı',
    logout: 'çıkış yaptı',
    healthcheck: 'sistem kontrolü gerçekleştirdi'
  };

  const verb = verbMap[rawAction.toLowerCase()] || (rawAction ? rawAction : 'işlem gerçekleştirdi');

  const entityType = act?.entityType || act?.entity || act?.resource || '';
  const entityId = act?.entityId || act?.entity_id || act?.resourceId || '';

  let entityPart = '';
  if (entityType && entityId) entityPart = `${entityType} (${entityId})`;
  else if (entityType) entityPart = entityType;
  else if (entityId) entityPart = `#${entityId}`;

  // Compose single sentence
  const pieces: string[] = [];
  if (timeStr) pieces.push(timeStr);
  if (user) pieces.push(`${user}`);
  if (verb) pieces.push(verb);
  if (entityPart) pieces.push(entityPart + '.');
  else pieces.push('.');

  // Join with em dash after timestamp for clarity
  if (timeStr) {
    const rest = pieces.slice(1).join(' ');
    return `${timeStr} — ${rest}`;
  }

  return pieces.join(' ');
}
