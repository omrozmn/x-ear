// Development configuration for auto-login
// Wrapped in import.meta.env.DEV check so credentials are tree-shaken out of production bundles
export const DEV_CONFIG = import.meta.env.DEV ? {
  // Auto-login için geliştirme ortamında kullanılacak varsayılan credentials
  // Disable automatic auto-login to allow manual login during debugging
  AUTO_LOGIN_ENABLED: false,
  DEFAULT_CREDENTIALS: {
    username: 'seed-admin',
    password: 'AdminPass123!',
  },
  // Token'ları localStorage'da ne kadar süre tutacağımız (ms)
  TOKEN_PERSISTENCE_DURATION: 24 * 60 * 60 * 1000, // 24 saat
} : {
  AUTO_LOGIN_ENABLED: false,
  DEFAULT_CREDENTIALS: {
    username: '',
    password: '',
  },
  TOKEN_PERSISTENCE_DURATION: 24 * 60 * 60 * 1000,
};