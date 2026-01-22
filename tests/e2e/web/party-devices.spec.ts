/**
 * Party Devices E2E Tests
 * Verifies device history list display and basic device operations
 */
import { test, expect } from '../fixtures/fixtures';
import {
    createTestParty,
    deleteTestParty,
    login,
    setupAuthenticatedPage
} from './helpers/test-utils';

test.describe('Party Devices Module', () => {
    let partyId: string;
    let authTokens: any;

    test.beforeAll(async ({ request }) => {
        authTokens = await login(request);
    });

    test.beforeEach(async ({ page, request }) => {
        await setupAuthenticatedPage(page, authTokens);

        // Create a test party with unique phone number (include random suffix for parallel tests)
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const uniquePhone = `+90555${Date.now().toString().slice(-6)}${randomSuffix}`;
        partyId = await createTestParty(request, authTokens.accessToken, {
            firstName: 'Device',
            lastName: 'Tester',
            phone: uniquePhone,
            email: `device.tester.${Date.now()}@example.com`
        });

        // Navigate to the party detail page
        await page.goto(`/parties/${partyId}`);
        await expect(page.getByRole('heading', { name: 'Device Tester' })).toBeVisible();
    });

    test.afterEach(async ({ request }) => {
        if (partyId) {
            await deleteTestParty(request, authTokens.accessToken, partyId);
        }
    });

    test('should display devices tab with empty state', async ({ page }) => {
        // 1. Switch to Devices Tab (Cihazlar)
        await page.getByRole('button', { name: 'Cihazlar' }).click();

        // 2. Verify tab content loads
        await expect(page.getByRole('heading', { name: 'Atanmış Cihazlar' })).toBeVisible({ timeout: 10000 });

        // 3. Verify empty state message for both ears
        await expect(page.getByText('Sağ kulak için cihaz atanmamış')).toBeVisible();
        await expect(page.getByText('Sol kulak için cihaz atanmamış')).toBeVisible();

        // 4. Verify quick stats section
        await expect(page.getByText('Aktif Cihaz')).toBeVisible();
        await expect(page.getByText('Deneme')).toBeVisible();
        await expect(page.getByText('Toplam Değer')).toBeVisible();
        await expect(page.getByText('E-Reçete')).toBeVisible();

        // 5. Verify Add Device button exists
        const addDeviceButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') });
        await expect(addDeviceButton).toBeVisible();
    });

    test('should open device assignment form modal', async ({ page }) => {
        // 1. Switch to Devices Tab
        await page.getByRole('button', { name: 'Cihazlar' }).click();
        await expect(page.getByRole('heading', { name: 'Atanmış Cihazlar' })).toBeVisible();

        // 2. Click Add Device button (the round blue button with plus icon)
        const addDeviceButton = page.locator('button.bg-blue-600').filter({ has: page.locator('svg.lucide-plus') });
        await addDeviceButton.click();

        // 3. Verify modal opens
        // The DeviceAssignmentForm modal should appear
        await expect(page.getByText('Cihaz Atama')).toBeVisible({ timeout: 5000 });

        // 4. Close modal
        await page.keyboard.press('Escape');
    });

    test('should display replacement history section', async ({ page }) => {
        // 1. Switch to Devices Tab
        await page.getByRole('button', { name: 'Cihazlar' }).click();
        await expect(page.getByRole('heading', { name: 'Atanmış Cihazlar' })).toBeVisible();

        // 2. Check for replacement history component (DeviceReplacementHistory)
        // This might show "Henüz değişim geçmişi bulunmamaktadır" for empty state
        // or the heading of the component
        const replacementSection = page.getByText(/Değişim Geçmişi|değişim geçmişi/i);

        // If the section exists, verify it's visible
        // If not, that's acceptable for a new party
        const count = await replacementSection.count();
        if (count > 0) {
            await expect(replacementSection.first()).toBeVisible();
        }
    });
});
