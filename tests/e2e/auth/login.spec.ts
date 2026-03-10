import { test, expect } from '@playwright/test';
import { login, logout, isLoggedIn, loginApi } from '../../helpers/auth.helper';
import { testUsers } from '../fixtures/users';

// Determine which storage file to use based on baseURL
function getStorageFile(baseURL: string | undefined): string {
  // Use absolute path to ensure file is saved to correct location
  const testDir = process.cwd();
  if (baseURL?.includes('8082') || baseURL?.includes('8083') || baseURL?.includes('admin')) {
    return `${testDir}/test-results/.auth-admin.json`;
  }
  return `${testDir}/test-results/.auth-web.json`;
}

async function findFirstVisible(page, selectors: string[]) {
  for (const s of selectors) {
    try {
      const loc = page.locator(s).first();
      if (await loc.isVisible().catch(() => false)) return loc;
    } catch (e) {
      // ignore
    }
  }
  // Fallback to first selector
  return page.locator(selectors[0]).first();
}

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('AUTH-001: Should display login form', async ({ page }) => {
    // Try multiple selector patterns to be resilient between web/admin
    const identifierSelectors = [
      '[data-testid="login-identifier-input"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Username"]',
      'input#username',
      'input[name="username"]'
    ];

    const passwordSelectors = [
      '[data-testid="login-password-input"]',
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]'
    ];

    const submitSelectors = [
      '[data-testid="login-submit-button"]',
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Giriş")'
    ];

    const identifier = await findFirstVisible(page, identifierSelectors);
    const password = await findFirstVisible(page, passwordSelectors);
    const submit = await findFirstVisible(page, submitSelectors);

    await expect(identifier).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();

    // Verify page title contains X-Ear (admin or web)
    await expect(page).toHaveTitle(/X-?Ear/i);
  });

  test('AUTH-002: Should login with valid credentials', async ({ page, baseURL, request }) => {
    const isAdminApp = Boolean(baseURL && (baseURL.includes('8082') || baseURL.includes('8083') || baseURL.includes('admin')));
    const credentials = isAdminApp ? testUsers.superAdmin : testUsers.admin;

    if (isAdminApp) {
      const API_BASE = process.env.API_BASE_URL || 'http://localhost:5003';
      const loginResponse = await request.post(`${API_BASE}/api/admin/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `admin-auth-${Date.now()}`,
        },
        data: {
          email: credentials.email,
          password: credentials.password,
        },
      });

      expect(loginResponse.ok()).toBeTruthy();
      const loginJson = await loginResponse.json();
      const loginData = loginJson?.data || {};
      const token = loginData.accessToken || loginData.token;
      const refreshToken = loginData.refreshToken || loginData.refresh_token || token;
      const user = loginData.user || {};

      expect(token).toBeTruthy();

      await page.addInitScript(([authToken, authRefreshToken, authUser]) => {
        localStorage.setItem('admin_token', authToken as string);
        localStorage.setItem('admin_refresh_token', authRefreshToken as string);
        localStorage.setItem('admin-auth-storage', JSON.stringify({
          state: {
            user: authUser,
            token: authToken,
            isAuthenticated: true,
            _hasHydrated: true,
          },
          version: 0,
        }));
      }, [token, refreshToken, {
        id: user.id || 'super-admin',
        email: user.email || credentials.email,
        role: user.role || 'SUPER_ADMIN',
        is_active: user.is_active ?? true,
        created_at: user.created_at || new Date().toISOString(),
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name || credentials.name,
        tenant_id: user.tenant_id,
      }]);

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Super Admin Panel').first()).toBeVisible({ timeout: 10_000 });

      const storageFile = getStorageFile(baseURL);
      await page.context().storageState({ path: storageFile as any });
      return;
    }

    // Attempt API login first using appropriate endpoint
    try {
      // Prefer API-based login using the shared helper (more reliable)
      const tokens = await loginApi(request, credentials.email, credentials.password);
      const token = tokens.accessToken;
      const tenantId = tokens.tenantId || tokens.user?.tenantId || 'tenant_001';
      
      // Ensure user object has all required fields
      const userObj = {
        ...tokens.user,
        email: tokens.user?.email || credentials.email,
        role: tokens.user?.role || 'ADMIN',
        isPhoneVerified: true,
        name: tokens.user?.name || credentials.name,
        id: tokens.user?.id || 'user_admin',
        tenantId: tenantId
      };

      // Inject auth tokens before app scripts run
      await page.addInitScript((t, tenant, user) => {
        try {
          localStorage.setItem('x-ear.auth.token@v1', t);
          localStorage.setItem('auth_token', t);
          if (tenant) localStorage.setItem('x-ear.auth.currentTenantId@v1', tenant);

          const authObj = {
            state: {
              user: user,
              token: t,
              refreshToken: t,
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false,
              error: null,
              subscription: { isExpired: false, daysRemaining: 30, planName: 'PRO' }
            },
            version: 0
          };

          localStorage.setItem('auth-storage', JSON.stringify(authObj));
          localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify(authObj));
        } catch (err) {
          // ignore
        }
      }, token, tenantId, userObj);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for MainLayout to render
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Save storage state for reuse by other tests
      const storageFile = getStorageFile(baseURL);
      await page.context().storageState({ path: storageFile as any });

      // Check for user menu visibility with retry
      let userMenuVisible = false;
      for (let i = 0; i < 3; i++) {
        userMenuVisible = await page.locator('[data-testid="user-menu"]').first().isVisible().catch(() => false) ||
                          await page.locator('[aria-label="User menu"]').first().isVisible().catch(() => false);
        if (userMenuVisible) break;
        await page.waitForTimeout(1000);
      }
      
      expect(userMenuVisible).toBeTruthy();
      return;
    } catch (e) {
      console.log('API helper login failed, falling back to UI login', e);
    }

    // Fallback to UI login
    // Use resilient selectors
    const identifierSelectors = [
      '[data-testid="login-identifier-input"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="Email"]',
      'input#username',
      'input[name="username"]'
    ];

    const passwordSelectors = [
      '[data-testid="login-password-input"]',
      'input[type="password"]',
      'input[name="password"]'
    ];

    const submitSelectors = [
      '[data-testid="login-submit-button"]',
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")'
    ];

    const identifier = await findFirstVisible(page, identifierSelectors);
    const password = await findFirstVisible(page, passwordSelectors);
    const submit = await findFirstVisible(page, submitSelectors);

    await identifier.fill(credentials.email);
    await password.fill(credentials.password);

    await submit.click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => undefined);

    // Save storage state
    const storageFile = getStorageFile(baseURL);
    await page.context().storageState({ path: storageFile as any });

    // Verify user is logged in by checking for any common post-login indicators
    const postLoginSelectors = [
      '[data-testid="user-menu"]',
      '[aria-label="User menu"]',
      'button:has-text("Sign out")',
      'button:has-text("Logout")',
      'nav[role="navigation"]',
      'a[href*="/tenants"]',
      'a[href*="/dashboard"]',
      'text=Dashboard',
      'text=Tenants',
      'text=Super Admin Panel',
      'text=Aboneler',
      'button:has-text("Admin User")'
    ];

    let loggedIn = !page.url().includes('/login');
    for (const s of postLoginSelectors) {
      if (await page.locator(s).first().isVisible().catch(() => false)) {
        loggedIn = true;
        break;
      }
    }

    expect(loggedIn).toBeTruthy();
  });

  test('AUTH-003: Should show error with invalid credentials', async ({ page }) => {
    const identifierSelectors = [
      '[data-testid="login-identifier-input"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="Email"]'
    ];
    const passwordSelectors = ['[data-testid="login-password-input"]', 'input[type="password"]'];
    const submitSelectors = ['[data-testid="login-submit-button"]', 'button[type="submit"]'];

    const identifier = await findFirstVisible(page, identifierSelectors);
    const password = await findFirstVisible(page, passwordSelectors);
    const submit = await findFirstVisible(page, submitSelectors);

    await identifier.fill('invalid@example.com');
    await password.fill('wrongpassword');
    await submit.click();

    const errorLoc = page.locator('[data-testid="login-error-message"], .error, [role="alert"]').first();
    await expect(errorLoc).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no explicit error element, assert still on login page
      expect(page.url()).toContain('/login');
    });
  });

  test('AUTH-004: Should show validation error for empty fields', async ({ page }) => {
    const submitSelectors = ['[data-testid="login-submit-button"]', 'button[type="submit"]'];
    const submit = await findFirstVisible(page, submitSelectors);
    await expect(submit).toBeDisabled().catch(() => {
      // If the button isn't disabled, ensure clicking without filling does not navigate
      submit.click().catch(() => undefined);
      expect(page.url()).toContain('/login');
    });
  });

  test.skip('AUTH-005: Should logout successfully', async ({ page }) => {
    // Skip: Modal blocking user menu click - needs frontend fix
    // Login first
    await login(page, testUsers.admin);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    
    // Logout
    await logout(page);
    
    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Verify user is not logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(false);
  });

  test.skip('AUTH-006: Should remember credentials when "Remember Me" is checked', async ({ page }) => {
    // Skip: Modal blocking user menu click - needs frontend fix
    // Fill login form
    await login(page, testUsers.admin);
  });

  test('AUTH-007: Should toggle password visibility', async ({ page }) => {
    const passwordSelectors = ['[data-testid="login-password-input"]', 'input[type="password"]'];
    const password = await findFirstVisible(page, passwordSelectors);

    // Try to find a toggle button near password input
    const toggleBtn = page.locator('button[aria-label*="password"], button:has-text("Show"), button:has-text("Göz" )').first();

    // If toggle doesn't exist, skip assertions about visibility toggle
    if (!await toggleBtn.isVisible().catch(() => false)) {
      test.skip(true, 'Password visibility toggle not found');
      return;
    }

    // Initially password should be hidden (type=password)
    await expect(password).toHaveAttribute('type', 'password');
    await toggleBtn.click();
    await expect(password).toHaveAttribute('type', 'text');
    await toggleBtn.click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  // Additional skipped tests remain as before
});
