export function useIdempotency() {
  function generateKey(prefix = 'idemp') {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${(crypto as Crypto & { randomUUID: () => string }).randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return { generateKey };
}
