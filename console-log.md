
Running 8 tests using 1 worker

  ✓  1 [web-auth-setup] › tests/e2e/auth/login.spec.ts:34:3 › Login Flow › AUTH-001: Should display login form (1.7s)
  ✓  2 [web-auth-setup] › tests/e2e/auth/login.spec.ts:76:3 › Login Flow › AUTH-002: Should login with valid credentials (9.2s)
  ✓  3 [web-auth-setup] › tests/e2e/auth/login.spec.ts:217:3 › Login Flow › AUTH-003: Should show error with invalid credentials (1.6s)
  ✓  4 [web-auth-setup] › tests/e2e/auth/login.spec.ts:242:3 › Login Flow › AUTH-004: Should show validation error for empty fields (1.4s)
  -  5 [web-auth-setup] › tests/e2e/auth/login.spec.ts:252:8 › Login Flow › AUTH-005: Should logout successfully
  -  6 [web-auth-setup] › tests/e2e/auth/login.spec.ts:269:8 › Login Flow › AUTH-006: Should remember credentials when "Remember Me" is checked
  ✓  7 [web-auth-setup] › tests/e2e/auth/login.spec.ts:275:3 › Login Flow › AUTH-007: Should toggle password visibility (1.6s)
[Fixture] Logging in as tenant test user (e2etest)...
[Fixture] Login successful: {
  userId: [32m'usr_e2etest'[39m,
  tenantId: [32m'95625589-a4ad-41ff-a99e-4955943bb421'[39m,
  role: [32m'ADMIN'[39m
}
[Fixture] Running against REAL BACKEND (No Mocks)
[Fixture] Injecting auth script...
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[Fixture] Successfully navigated to: http://127.0.0.1:8080/
[API Context] Logging in as tenant admin...
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28798}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28798}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[API Context] Creating authenticated context with tenant: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
🔢 Test run using unique invoice prefix: E28
✅ Tenant settings updated with unique prefix: E28
✅ Seeded party once: GIB TEST RECEIVER (1234567801)
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28797}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28797}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [aiSessionStore] Context changed, resetting store: {previousTenant: null, newTenant: 95625589-a4ad-41ff-a99e-4955943bb421, previousParty: null, newParty: null}
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [orval-mutator] Request interceptor: {url: /api/ai/status, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/suppliers, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/parties, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft/238/issue, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[SATIS Temel] ⚠️ PDF text checks skipped (content may be encoded)
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28771}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28771}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/ai/status, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/238/document?format=pdf, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28765}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28765}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [orval-mutator] Request interceptor: {url: /api/ai/status, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/suppliers, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/parties, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft/239/issue, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[SATIS Ticari] ⚠️ PDF text checks skipped (content may be encoded)
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28752}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28752}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/ai/status, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/outgoing, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/239/document?format=pdf, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [Init] Setting storage keys...
[BROWSER] [Init] Set current tenant to: 95625589-a4ad-41ff-a99e-4955943bb421
[BROWSER] [vite] connecting...
[BROWSER] [vite] connected.
[BROWSER] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER] 🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
[BROWSER] i18next: languageChanged en-US
[BROWSER] i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: common, fallbackLng: Array(1)}
[BROWSER] [TokenManager] localStorage spy installed
[BROWSER] [TokenManager] Wrote access token to canonical key
[BROWSER] [TokenManager] Verification - token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Wrote refresh token to canonical key
[BROWSER] [TokenManager] Verification - refresh token in localStorage: true eyJhbGciOiJIUzI1NiIsInR5cCI6Ik
[BROWSER] [TokenManager] Hydrated from storage: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, userId: usr_e2etest}
[BROWSER] [aiSessionStore] Rehydrating, running cleanup...
[BROWSER] XXX DEBUG: Imports loaded, attempting to render App XXX
[BROWSER] XXX DEBUG: Render called XXX
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28746}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [initializeAuth] TokenManager state: {hasAccessToken: true, hasRefreshToken: true, isExpired: false, ttl: 28746}
[BROWSER] <GoogleReCaptchaProvider /> recaptcha key not provided
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/users/me, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [initializeAuth] API response: {success: true, data: Object, message: null, error: null, meta: null}
[BROWSER] [initializeAuth] Transformed user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com} {isAdmin: false}
[BROWSER] Auth state restored successfully with user: {createdAt: null, updatedAt: 2026-03-10T09:12:48.924605, id: usr_e2etest, tenantId: 95625589-a4ad-41ff-a99e-4955943bb421, email: admin@xear.com}
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [ProductSearchModal] Modal closed → clear state
[BROWSER] [ProductSearchModal] Query changed {value: , length: 0}
[BROWSER] [ProductSearchModal] Query < 2 chars → clear results
[BROWSER] 🔄 Starting to load products (API)...
[BROWSER] [orval-mutator] Request interceptor: {url: /api/ai/status, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/inventory, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenant/company, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/tenants/current, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/permissions/my, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] 🔍 Raw settings from API: {sgk: Object, pricing: Object, invoiceIntegration: Object}
[BROWSER] 🔍 Invoice settings: {apiKey: d500f61b-2104-4a59-b306-71cf72dd52d1, secretKey: b72389be-6285-4ec6-9128-c162e43f19c2, provider: birfatura, useManualNumbering: true, invoicePrefix: E28}
[BROWSER] 📋 Loaded invoice prefix settings: {prefix: E28, prefixes: Array(24), prefixCount: 24}
[BROWSER] ✅ API inventory response {itemsCount: 7}
[BROWSER] 🧭 Mapped products to local shape {count: 7}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] İade faturası seçildi - KDV oranları 0 yapılmalı
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/suppliers, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/parties, method: get, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] [orval-mutator] Request interceptor: {url: /api/invoices/draft/240/issue, method: post, tokenSource: TokenManager, tokenPreview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c..., tokenIdentity: usr_e2etest}
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[BROWSER] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
[BROWSER] Error issuing invoice: AxiosError: Request failed with status code 500
    at settle (http://127.0.0.1:8080/node_modules/.vite/deps/axios.js?v=0d093eb9:1334:7)
    at XMLHttpRequest.onloadend (http://127.0.0.1:8080/node_modules/.vite/deps/axios.js?v=0d093eb9:1700:7)
    at Axios.request (http://127.0.0.1:8080/node_modules/.vite/deps/axios.js?v=0d093eb9:2346:41)
    at async handleSubmit (http://127.0.0.1:8080/src/pages/NewInvoicePage.tsx?t=1773066743575:245:24)
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E07
[BROWSER] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. E43
[IADE] Issue response missing invoice_id: {
  "success": false,
  "data": null,
  "message": null,
  "error": {
    "success": false,
    "message": "Failed to issue draft: 400 Client Error: Bad Request for url: https://uygulama.edonustur.com/api/outEBelgeV2/SendDocument",
    "code": "HTTP_ERROR",
    "details": null
  },
  "meta": null,
  "requestId": "req-1773134028946-kvtu626v2",
  "timestamp": "2026-03-10T09:13:50.565332+00:00"
}
  ✘  8 [web] › tests/e2e/web/invoice-birfatura-16-types.spec.ts:381:3 › BirFatura 16 Invoice Types › creates, issues, validates XML/PDF and opens PDF for all 16 invoice types (1.1m)


  1) [web] › tests/e2e/web/invoice-birfatura-16-types.spec.ts:381:3 › BirFatura 16 Invoice Types › creates, issues, validates XML/PDF and opens PDF for all 16 invoice types › IADE 

    Error: IADE issue response should include invoice id

    [2mexpect([22m[31mreceived[39m[2m).[22mtoBeTruthy[2m()[22m

    Received: [31mundefined[39m

      517 |   
      518 |   const invoiceId = issueJson.data?.invoice_id ?? issueJson.data?.invoiceId;
    > 519 |   expect(invoiceId, `${invoiceCase.title} issue response should include invoice id`).toBeTruthy();
          |                                                                                      ^
      520 |
      521 |   await page.waitForURL('**/invoices', { timeout: 180_000 });
      522 |   const invoiceRow = page.getByTestId(`outgoing-invoice-row-${Number(invoiceId)}`);
        at createInvoiceFromUi (/Users/ozmen/Desktop/x-ear web app/x-ear/tests/e2e/web/invoice-birfatura-16-types.spec.ts:519:86)
        at /Users/ozmen/Desktop/x-ear web app/x-ear/tests/e2e/web/invoice-birfatura-16-types.spec.ts:430:58
        at /Users/ozmen/Desktop/x-ear web app/x-ear/tests/e2e/web/invoice-birfatura-16-types.spec.ts:429:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/invoice-birfatura-16-types-21268-DF-for-all-16-invoice-types-web/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/invoice-birfatura-16-types-21268-DF-for-all-16-invoice-types-web/error-context.md

  1 failed
    [web] › tests/e2e/web/invoice-birfatura-16-types.spec.ts:381:3 › BirFatura 16 Invoice Types › creates, issues, validates XML/PDF and opens PDF for all 16 invoice types 
  2 skipped
  5 passed (1.3m)
npm notice
npm notice New major version of npm available! 10.9.2 -> 11.11.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.11.0
npm notice To update run: npm install -g npm@11.11.0
npm notice
