/**
 * TokenManager - Centralized Token Management Service
 * 
 * SINGLE SOURCE OF TRUTH for all token operations.
 * All token read/write operations MUST go through this service.
 * 
 * Best Practices Implemented:
 * 1. Single canonical storage keys (no duplicates)
 * 2. Synchronous in-memory cache for immediate access
 * 3. Automatic localStorage sync
 * 4. Type-safe token payload extraction
 * 5. Token expiration checking
 * 6. Event-based token change notifications
 */

import { AUTH_TOKEN, REFRESH_TOKEN, AUTH_TOKEN_TIMESTAMP, CURRENT_TENANT_ID } from '../constants/storage-keys';

// DEBUG: Install localStorage spy to catch who's deleting tokens
if (typeof window !== 'undefined') {
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  localStorage.removeItem = function (key: string) {
    if (key.includes('x-ear.auth')) {
      console.error('[localStorage SPY] removeItem called for:', key);
      console.trace();
    }
    return originalRemoveItem(key);
  };

  localStorage.clear = function () {
    console.error('[localStorage SPY] clear() called');
    console.trace();
    return originalClear();
  };

  console.log('[TokenManager] localStorage spy installed');
}

// Token payload interface (JWT claims)
export interface TokenPayload {
  sub: string;           // Subject (user ID)
  exp: number;           // Expiration timestamp
  iat?: number;          // Issued at
  tenant_id?: string;    // Tenant ID
  role?: string;         // User role
  user_type?: string;    // 'admin' | 'user'
  is_impersonating?: boolean;
  real_user_email?: string;
  effective_tenant_id?: string;
  is_impersonating_tenant?: boolean;
}

// Token change event
export type TokenChangeEvent = {
  type: 'access' | 'refresh' | 'both' | 'clear';
  accessToken: string | null;
  createAuthRefresh: string | null;
};

type TokenChangeListener = (event: TokenChangeEvent) => void;

class TokenManager {
  private static instance: TokenManager;

  // In-memory cache for synchronous access
  private _accessToken: string | null = null;
  private _createAuthRefresh: string | null = null;
  private _accessPayload: TokenPayload | null = null;

  // Event listeners
  private listeners: Set<TokenChangeListener> = new Set();

  // Storage keys (canonical - single source)
  private readonly ACCESS_TOKEN_KEY = AUTH_TOKEN;      // 'x-ear.auth.token@v1'
  private readonly REFRESH_TOKEN_KEY = REFRESH_TOKEN;  // 'x-ear.auth.refresh@v1'
  private readonly TOKEN_TIMESTAMP_KEY = AUTH_TOKEN_TIMESTAMP;

  // Legacy keys for migration/cleanup only
  private readonly LEGACY_ACCESS_KEYS = ['auth_token', 'token', 'jwt'];
  private readonly LEGACY_REFRESH_KEYS = ['refresh_token', 'createAuthRefresh'];

  private constructor() {
    // Initialize from storage on construction
    this.hydrateFromStorage();

    // Listen for storage events (cross-tab sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // ============================================
  // PUBLIC API - Token Getters
  // ============================================

  /**
   * Get access token (synchronous, from memory)
   */
  get accessToken(): string | null {
    return this._accessToken;
  }

  /**
   * Get refresh token (synchronous, from memory)
   */
  get createAuthRefresh(): string | null {
    return this._createAuthRefresh;
  }

  /**
   * Get decoded access token payload
   */
  get payload(): TokenPayload | null {
    return this._accessPayload;
  }

  /**
   * Check if user is authenticated (has valid access token)
   */
  get isAuthenticated(): boolean {
    return this._accessToken !== null && !this.isAccessTokenExpired();
  }

  /**
   * Check if access token is expired
   */
  isAccessTokenExpired(): boolean {
    if (!this._accessPayload?.exp) return true;
    // Add 30 second buffer for network latency
    return (this._accessPayload.exp * 1000) < (Date.now() + 30000);
  }

  /**
   * Get time until access token expires (in seconds)
   */
  getAccessTokenTTL(): number {
    if (!this._accessPayload?.exp) return 0;
    const ttl = Math.floor((this._accessPayload.exp * 1000 - Date.now()) / 1000);
    return Math.max(0, ttl);
  }

  /**
   * Get user ID from token
   */
  getUserId(): string | null {
    return this._accessPayload?.sub || null;
  }

  /**
   * Get tenant ID from token
   */
  getTenantId(): string | null {
    return this._accessPayload?.effective_tenant_id || this._accessPayload?.tenant_id || null;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const sub = this._accessPayload?.sub || '';
    return sub.startsWith('admin_') || this._accessPayload?.user_type === 'admin';
  }

  // ============================================
  // PUBLIC API - Token Setters
  // ============================================

  /**
   * Set both tokens (typically after login)
   */
  setTokens(accessToken: string, createAuthRefresh?: string | null): void {
    console.log('[TokenManager] Setting tokens:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!createAuthRefresh,
      accessPreview: accessToken?.substring(0, 30) + '...',
    });

    // Update memory cache
    this._accessToken = accessToken;
    this._accessPayload = this.decodeToken(accessToken);

    if (createAuthRefresh !== undefined) {
      this._createAuthRefresh = createAuthRefresh;
    }

    // Persist to storage
    this.persistToStorage();

    // Set window global for legacy compatibility
    if (typeof window !== 'undefined') {
      window.__AUTH_TOKEN__ = accessToken;
    }

    // Notify listeners
    this.notifyListeners({
      type: createAuthRefresh !== undefined ? 'both' : 'access',
      accessToken: this._accessToken,
      createAuthRefresh: this._createAuthRefresh,
    });
  }

  /**
   * Update only access token (typically after refresh)
   */
  updateAccessToken(accessToken: string): void {
    console.log('[TokenManager] Updating access token');

    this._accessToken = accessToken;
    this._accessPayload = this.decodeToken(accessToken);

    this.persistToStorage();

    if (typeof window !== 'undefined') {
      window.__AUTH_TOKEN__ = accessToken;
    }

    this.notifyListeners({
      type: 'access',
      accessToken: this._accessToken,
      createAuthRefresh: this._createAuthRefresh,
    });
  }

  /**
   * Clear all tokens (logout)
   */
  clearTokens(): void {
    console.log('[TokenManager] Clearing all tokens');
    console.trace('[TokenManager] clearTokens called from:');

    this._accessToken = null;
    this._createAuthRefresh = null;
    this._accessPayload = null;

    // Clear from storage
    this.clearStorage();

    // Clear window global
    if (typeof window !== 'undefined') {
      delete window.__AUTH_TOKEN__;
    }

    this.notifyListeners({
      type: 'clear',
      accessToken: null,
      createAuthRefresh: null,
    });
  }

  // ============================================
  // PUBLIC API - Event Subscription
  // ============================================

  /**
   * Subscribe to token changes
   */
  subscribe(listener: TokenChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ============================================
  // PRIVATE - Storage Operations
  // ============================================

  /**
   * Hydrate tokens from localStorage on init
   */
  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Try canonical keys first
      let accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      let createAuthRefresh = localStorage.getItem(this.REFRESH_TOKEN_KEY);

      // Fallback to legacy keys if canonical not found
      if (!accessToken) {
        for (const key of this.LEGACY_ACCESS_KEYS) {
          const value = localStorage.getItem(key);
          if (value) {
            accessToken = value;
            console.log(`[TokenManager] Found access token in legacy key: ${key}`);
            break;
          }
        }
      }

      if (!createAuthRefresh) {
        for (const key of this.LEGACY_REFRESH_KEYS) {
          const value = localStorage.getItem(key);
          if (value) {
            createAuthRefresh = value;
            console.log(`[TokenManager] Found refresh token in legacy key: ${key}`);
            break;
          }
        }
      }

      // Also check Zustand persist storage
      if (!accessToken || !createAuthRefresh) {
        const zustandKeys = ['auth-storage', 'persist:auth-storage'];
        for (const key of zustandKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const zustandToken = parsed?.state?.token || parsed?.token;
              const zustandRefresh = parsed?.state?.createAuthRefresh || parsed?.createAuthRefresh;

              if (!accessToken && zustandToken) {
                accessToken = zustandToken;
                console.log(`[TokenManager] Found access token in Zustand storage: ${key}`);
              }
              if (!createAuthRefresh && zustandRefresh) {
                createAuthRefresh = zustandRefresh;
                console.log(`[TokenManager] Found refresh token in Zustand storage: ${key}`);
              }

              if (accessToken && createAuthRefresh) break;
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }

      if (accessToken) {
        this._accessToken = accessToken;
        this._accessPayload = this.decodeToken(accessToken);

        // Set window global
        window.__AUTH_TOKEN__ = accessToken;

        // Always write to canonical key to ensure consistency
        try {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
          console.log('[TokenManager] Wrote access token to canonical key');

          // Verify it was written
          const verify = localStorage.getItem(this.ACCESS_TOKEN_KEY);
          console.log('[TokenManager] Verification - token in localStorage:', !!verify, verify?.substring(0, 30));
        } catch (e) {
          console.error('[TokenManager] Failed to write access token:', e);
        }
      }

      if (createAuthRefresh) {
        this._createAuthRefresh = createAuthRefresh;

        // Always write to canonical key to ensure consistency
        try {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, createAuthRefresh);
          console.log('[TokenManager] Wrote refresh token to canonical key');

          // Verify it was written
          const verify = localStorage.getItem(this.REFRESH_TOKEN_KEY);
          console.log('[TokenManager] Verification - refresh token in localStorage:', !!verify, verify?.substring(0, 30));
        } catch (e) {
          console.error('[TokenManager] Failed to write refresh token:', e);
        }
      }

      // Clean up legacy keys after migration
      // TEMPORARILY DISABLED for debugging
      // this.cleanupLegacyKeys();

      console.log('[TokenManager] Hydrated from storage:', {
        hasAccessToken: !!this._accessToken,
        hasRefreshToken: !!this._createAuthRefresh,
        isExpired: this.isAccessTokenExpired(),
        userId: this.getUserId(),
      });

    } catch (error) {
      console.error('[TokenManager] Failed to hydrate from storage:', error);
    }
  }

  /**
   * Persist tokens to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      if (this._accessToken) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, this._accessToken);
        localStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
      }

      if (this._createAuthRefresh) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, this._createAuthRefresh);
      }

      console.log('[TokenManager] Persisted to storage');
    } catch (error) {
      console.error('[TokenManager] Failed to persist to storage:', error);
    }
  }

  /**
   * Clear all token-related storage
   */
  private clearStorage(): void {
    if (typeof window === 'undefined') return;

    console.log('[TokenManager] clearStorage called');
    console.log('[TokenManager] Before clear - canonical keys:', {
      accessToken: localStorage.getItem(this.ACCESS_TOKEN_KEY)?.substring(0, 30),
      createAuthRefresh: localStorage.getItem(this.REFRESH_TOKEN_KEY)?.substring(0, 30),
    });

    try {
      // Clear canonical keys
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);

      // Clear legacy keys
      this.LEGACY_ACCESS_KEYS.forEach(key => localStorage.removeItem(key));
      this.LEGACY_REFRESH_KEYS.forEach(key => localStorage.removeItem(key));

      // Clear other auth-related keys
      localStorage.removeItem(AUTH_TOKEN_TIMESTAMP);
      localStorage.removeItem(CURRENT_TENANT_ID);

      console.log('[TokenManager] Cleared storage');
    } catch (error) {
      console.error('[TokenManager] Failed to clear storage:', error);
    }
  }

  /**
   * Clean up legacy keys after successful migration
   */
  private cleanupLegacyKeys(): void {
    if (typeof window === 'undefined') return;

    try {
      // Only clean up if we have tokens in canonical keys
      if (localStorage.getItem(this.ACCESS_TOKEN_KEY)) {
        this.LEGACY_ACCESS_KEYS.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[TokenManager] Cleaned up legacy key: ${key}`);
          }
        });
      }

      if (localStorage.getItem(this.REFRESH_TOKEN_KEY)) {
        this.LEGACY_REFRESH_KEYS.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[TokenManager] Cleaned up legacy key: ${key}`);
          }
        });
      }
    } catch (error) {
      console.error('[TokenManager] Failed to cleanup legacy keys:', error);
    }
  }

  /**
   * Handle storage events for cross-tab sync
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === this.ACCESS_TOKEN_KEY) {
      this._accessToken = event.newValue;
      this._accessPayload = event.newValue ? this.decodeToken(event.newValue) : null;

      if (event.newValue && typeof window !== 'undefined') {
        window.__AUTH_TOKEN__ = event.newValue;
      }

      this.notifyListeners({
        type: 'access',
        accessToken: this._accessToken,
        createAuthRefresh: this._createAuthRefresh,
      });
    }

    if (event.key === this.REFRESH_TOKEN_KEY) {
      this._createAuthRefresh = event.newValue;

      this.notifyListeners({
        type: 'refresh',
        accessToken: this._accessToken,
        createAuthRefresh: this._createAuthRefresh,
      });
    }
  }

  // ============================================
  // PRIVATE - Token Decoding
  // ============================================

  /**
   * Decode JWT token payload (without verification)
   */
  private decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload as TokenPayload;
    } catch (error) {
      console.error('[TokenManager] Failed to decode token:', error);
      return null;
    }
  }

  // ============================================
  // PRIVATE - Event Notification
  // ============================================

  private notifyListeners(event: TokenChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[TokenManager] Listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Export class for testing
export { TokenManager };
