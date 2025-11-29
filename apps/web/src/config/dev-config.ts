// Development configuration for auto-login
export const DEV_CONFIG = {
  // Auto-login için geliştirme ortamında kullanılacak varsayılan credentials
  // Disable automatic auto-login to allow manual login during debugging
  AUTO_LOGIN_ENABLED: false,
  DEFAULT_CREDENTIALS: {
    username: 'seed-admin',
    password: 'AdminPass123!',
  },
  // Token'ları localStorage'da ne kadar süre tutacağımız (ms)
  TOKEN_PERSISTENCE_DURATION: 24 * 60 * 60 * 1000, // 24 saat
};