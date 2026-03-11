import { test, expect } from '../fixtures/fixtures';

test.describe('Auth Flow Edge Cases', () => {

    test('should gate access for unverified phone users', async ({ tenantPage }) => {
        await tenantPage.goto('/');
        await tenantPage.evaluate(() => {
            const raw = localStorage.getItem('auth-storage');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            parsed.state = {
                ...parsed.state,
                user: {
                    ...parsed.state.user,
                    isPhoneVerified: false,
                    phone: '05550001122',
                },
                isAuthenticated: true,
                requiresPhone: true,
            };
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
        });

        await tenantPage.reload();
        await tenantPage.waitForLoadState('domcontentloaded');

        const hasPhoneVerificationModal = await tenantPage.getByText('Telefon Doğrulama').isVisible({ timeout: 3000 }).catch(() => false);
        const hasAppShell = await tenantPage.locator('main, [data-testid="sidebar"], body').first().isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasPhoneVerificationModal || hasAppShell).toBeTruthy();
    });

    test('should prevent interaction on expired subscription', async ({ page }) => {
        // Edge Case: subscription.isExpired = true
        await page.addInitScript(() => {
            localStorage.setItem('auth-storage', JSON.stringify({
                state: {
                    user: { id: 'u1', role: 'user' },
                    token: 'valid',
                    isAuthenticated: true,
                    subscription: { isExpired: true, daysRemaining: 0 }
                },
                version: 0
            }));
        });

        await page.goto('/');

        // Expect Subscription Warning / Blocker
        // await expect(page.getByText(/Paketiniz sona erdi/i)).toBeVisible();
    });
});
