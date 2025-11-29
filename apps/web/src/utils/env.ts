export function getEnvVar(key: string, fallback?: string): string | undefined {
  try {
    // Vite / import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = (import.meta as any).env[key];
      if (v !== undefined) return v;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && (process as any).env) {
      const v = (process as any).env[key];
      if (v !== undefined) return v;
    }
  } catch (e) {
    // ignore
  }

  try {
    // Allow window-level overrides for runtime environments
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const v = (window as any).__ENV__[key];
      if (v !== undefined) return v;
    }
  } catch (e) {
    // ignore
  }

  return fallback;
}

export function isDev(): boolean {
  const node = getEnvVar('NODE_ENV') || getEnvVar('MODE') || getEnvVar('VITE_ENV');
  return node === 'development';
}
