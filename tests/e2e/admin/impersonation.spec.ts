/**
 * Admin Panel - Impersonation E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Impersonation', () => {

    test('should impersonate a tenant and redirect to web app', async ({ adminPage }) => {
        await adminPage.goto('/tenants');
        
        // Wait for table to load
        const impersonateBtn = adminPage.getByTestId('admin-tenant-impersonate-button').first();
        await expect(impersonateBtn).toBeVisible();

        // Click impersonate
        console.log('[TEST] Clicking impersonate button...');
        await impersonateBtn.click();

        // It should redirect to the web app (8080)
        await adminPage.waitForURL(/localhost:8080/, { timeout: 15000 });
        
        console.log('[TEST] Redirected to:', adminPage.url());
        
        // Verify we are on the dashboard of the web app
        await expect(adminPage).toHaveURL(/.*dashboard/);
        
        // Check for an element that only exists in the web app
        await expect(adminPage.getByText(/Hastalar|Patients/i).first()).toBeVisible();
    });

    test('should allow returning to admin panel after impersonation', async ({ adminPage }) => {
        // Assume we are already impersonating or we do it again
        await adminPage.goto('/tenants');
        const impersonateBtn = adminPage.getByTestId('admin-tenant-impersonate-button').first();
        if (await impersonateBtn.isVisible()) {
            await impersonateBtn.click();
            await adminPage.waitForURL(/localhost:8080/);
            
            // Look for "Return to Admin" or "Stop Impersonation" button
            const returnBtn = adminPage.getByRole('button', { name: /Geri Dön|Return|Stop/i }).or(adminPage.locator('.impersonation-banner button'));
            if (await returnBtn.isVisible()) {
                await returnBtn.click();
                await adminPage.waitForURL(/localhost:8082/);
                await expect(adminPage).toHaveURL(/.*dashboard/);
            }
        }
    });
});
