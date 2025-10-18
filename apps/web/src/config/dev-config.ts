// Development configuration for auto-login
export const DEV_CONFIG = {
  // Auto-login için geliştirme ortamında kullanılacak varsayılan credentials
  AUTO_LOGIN_ENABLED: process.env.NODE_ENV === 'development',
  DEFAULT_CREDENTIALS: {
    username: 'seed-admin',
    password: 'admin123',
  },
  // Token'ları localStorage'da ne kadar süre tutacağımız (ms)
  TOKEN_PERSISTENCE_DURATION: 24 * 60 * 60 * 1000, // 24 saat
};