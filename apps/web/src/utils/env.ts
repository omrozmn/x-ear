declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>;
  }
}

export function getEnvVar(key: string, fallback?: string): string | undefined {
  try {
    // Vite / import.meta.env
    if (typeof import.meta.env !== 'undefined') {
      const v = import.meta.env[key];
      if (v !== undefined) return v;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      const v = process.env[key];
      if (v !== undefined) return v;
    }
  } catch (e) {
    // ignore
  }

  try {
    // Allow window-level overrides for runtime environments
    if (typeof window !== 'undefined' && window.__ENV__) {
      const v = window.__ENV__[key];
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
