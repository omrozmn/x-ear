import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:8082';
const CREDENTIALS = {
    email: 'admin@x-ear.com',
    password: 'admin123'
};

test.describe('Deep QA Audit: Activity Log Module', () => {

    test('Verify Activity Log Loading & Verification', async ({ page }) => {
        // 1. Login
        console.log('Step 1: Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button:has-text("Sign in")');

        // 2. Navigate to Activity Logs via Sidebar
        console.log('Step 2: Navigating to Activity Logs...');
        // Find sidebar link
        const activityLogLink = page.locator('nav').locator('a[href="/activity-logs"]');
        await activityLogLink.click();

        // Check if we are on the correct URL
        await expect(page).toHaveURL(/.*activity-logs/);

        // Check Header
        await expect(page.getByRole('heading', { name: 'Aktivite Logları', exact: true })).toBeVisible();
        console.log('✅ Activity Logs Page Loaded');

        // 3. Verify Data Presence (Wait for loading to finish)
        console.log('Step 3: Verifying Log Entries...');

        // Wait for potential loading state
        await expect(page.locator('text=Yükleniyor...')).not.toBeVisible({ timeout: 10000 });

        // Check for empty state OR list items
        const emptyState = page.locator('text=Aktivite logu bulunamadı');
        const logTable = page.locator('table');
        const tableRows = page.locator('table tbody tr');

        const isEmpty = await emptyState.isVisible();
        if (isEmpty) {
            console.log('ℹ️ No activity logs found (Empty State Verified)');
        } else {
            await expect(logTable).toBeVisible();
            const rowCount = await tableRows.count();
            console.log(`✅ Table visible with ${rowCount} rows`);
            expect(rowCount).toBeGreaterThan(0);
        }

        // 4. Verify Filters (Visual check)
        const searchInput = page.locator('input[placeholder*="Mesaj veya aksiyon ara"]');
        await expect(searchInput).toBeVisible();
        console.log('✅ Search input visible');

        // Take a screenshot for evidence
        await page.screenshot({ path: 'activity_log_verification.png', fullPage: true });
    });
});
