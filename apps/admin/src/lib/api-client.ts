/**
 * API Client - Central export point for all Orval-generated API hooks
 * 
 * Bu dosya api/generated'dan re-export yapar.
 * 
 * Yeni alias eklemek için: api-aliases.json dosyasını düzenleyin
 * Yeniden üretmek için: npm run gen:api
 */

// Re-export everything from auto-generated API
export * from '../api/generated';
export { AxiosError } from 'axios';
