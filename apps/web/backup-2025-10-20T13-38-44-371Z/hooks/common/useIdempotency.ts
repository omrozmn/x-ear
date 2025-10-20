export function useIdempotency() {
  function generateKey(prefix = 'idemp') {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return `${prefix}_${(crypto as any).randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return { generateKey };
}
