import { parseISO, format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Create a readable, modern single-sentence activity formatter (Turkish)
// Create a readable, modern single-sentence activity formatter (Turkish)
export function formatActivitySentence(act: any): string {
  // Accept various timestamp keys
  const ts = act?.createdAt || act?.created_at || act?.timestamp || act?.date || act?.time || null;
  let timeStr = '';
  if (ts) {
    try {
      const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
      timeStr = format(d, "d MMM, HH:mm", { locale: tr });
    } catch (e) {
      timeStr = String(ts);
    }
  }

  // Use userName or fullName from backend if available (populated by to_dict_with_user)
  const user = act?.userName || act?.fullName || act?.user?.fullName || act?.user?.username || act?.user || act?.userId || 'Sistem';

  // Clean up raw action
  const rawAction = (act?.action || act?.type || act?.message || '').toString();

  // Try to parse dot notation (e.g. auth.login -> entity=auth, verb=login)
  let derivedVerb = rawAction;
  let derivedEntity = '';

  if (rawAction.includes('.')) {
    const parts = rawAction.split('.');
    if (parts.length >= 2) {
      derivedVerb = parts[parts.length - 1]; // last part is usually verb
      derivedEntity = parts[parts.length - 2]; // second to last is entity
    }
  }

  // Map verbs to Turkish
  const verbMap: Record<string, string> = {
    create: 'oluşturdu',
    created: 'oluşturdu',
    update: 'güncelledi',
    updated: 'güncelledi',
    delete: 'sildi',
    deleted: 'sildi',
    login: 'giriş yaptı',
    logout: 'çıkış yaptı',
    view: 'görüntüledi',
    list: 'listeledi',
    export: 'dışa aktardı',
    import: 'içe aktardı',
    assign: 'atadı',
    assigned: 'atandı',
    complete: 'tamamladı',
    completed: 'tamamlandı',
    cancel: 'iptal etti',
    cancelled: 'iptal edildi',
    sent: 'gönderdi',
    pay: 'ödeme aldı',
    paid: 'ödendi',
    success: 'başarılı oldu',
    failed: 'başarısız oldu'
  };

  // Map entities to Turkish (optional)
  const entityMap: Record<string, string> = {
    party: 'Hasta',
    device: 'Cihaz',
    sale: 'Satış',
    appointment: 'Randevu',
    invoice: 'Fatura',
    auth: 'Sistem',
    user: 'Kullanıcı',
    inventory: 'Stok',
    report: 'Rapor'
  };

  const cleanVerb = derivedVerb.toLowerCase();
  const verb = verbMap[cleanVerb] || cleanVerb;

  // Use provided entity type or derived one
  const entityType = act?.entityType || act?.entity || derivedEntity || '';
  // Translate entity type if possible
  const displayEntityType = entityMap[entityType.toLowerCase()] || entityType;

  const entityId = act?.entityId || '';
  const partyName = act?.partyName || act?.data?.partyName;
  const message = act?.message;

  // Construct sentence
  // Format: [Time] — [User] [Entity] [Verb] ([ID])
  // Or if message exists and is human readable, use it.

  let content = '';

  // logic to avoid redundancy: if action is 'auth.login', entity is 'auth', user is 'User'.
  // We want "User sisteme giriş yaptı."

  if (rawAction === 'auth.login') {
    content = `${user} sisteme giriş yaptı.`;
  } else if (rawAction === 'auth.logout') {
    content = `${user} sistemden çıkış yaptı.`;
  } else {
    // Generic construction
    // "Omer (User) randevu (Appointment) oluşturdu."

    const parts: string[] = [];
    parts.push(user); // Subject

    if (displayEntityType && displayEntityType.toLowerCase() !== 'sistem') {
      parts.push(displayEntityType); // Object
    }

    parts.push(verb); // Verb

    if (partyName) {
      parts.push(`- ${partyName}`);
    } else if (entityId) {
      parts.push(`(#${entityId})`);
    } else if (message && message !== rawAction) {
      parts.push(`- ${message}`);
    }

    content = parts.join(' ') + '.';
  }

  return `${timeStr} — ${content}`;
}
