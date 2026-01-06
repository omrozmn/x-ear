/**
 * API Client - Central export point for all Orval-generated API hooks
 * 
 * Bu dosya api-aliases.ts'den re-export yapar.
 * api-aliases.ts otomatik üretilir ve stabil isimler sağlar.
 * 
 * Yeni alias eklemek için: api-aliases.json dosyasını düzenleyin
 * Yeniden üretmek için: npm run gen:api
 */

// Re-export everything from auto-generated aliases
export * from './api-aliases';
