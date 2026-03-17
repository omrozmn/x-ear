import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:8082';
const CREDENTIALS = {
    email: 'admin@x-ear.com',
    password: 'admin123'
};

test.describe('Deep QA Audit: AI Management Module', () => {

    test('Verify AI Dashboard Loading & Tabs', async ({ page }) => {
        // 1. Login
        console.log('Step 1: Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button:has-text("Sign in")');

        await expect(page).toHaveURL(/.*(dashboard|tenants|ai)/);
        console.log('✅ Login Successful');

        // 2. Navigate to AI Management
        console.log('Step 2: Navigating to AI Management...');
        const aiLink = page.locator('nav').locator('a[href="/ai"]');
        await aiLink.click();

        await expect(page).toHaveURL(/.*ai/);

        // Check Header
        await expect(page.getByRole('heading', { name: 'AI Yönetimi', exact: true })).toBeVisible();
        console.log('✅ AI Management Page Loaded');

        // 3. Verify Tabs & Data
        console.log('Step 3: Verifying AI Tabs...');

        // Wait for potential loading state
        await expect(page.locator('text=Yükleniyor...')).not.toBeVisible({ timeout: 10000 });

        // Overview should be default
        await expect(page.locator('text=AI Kill Switch')).toBeVisible();
        console.log('✅ Overview Content Visible');

        // Switch to "Metrikler"
        await page.getByRole('tab', { name: 'Metrikler' }).click();
        await page.waitForTimeout(2000); // Wait for charts/metrics to load
        await expect(page.locator('text=SLA Performans Metrikleri').first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Metrics Tab Content Visible');

        // Switch to "Onay Kuyruğu" (Approvals)
        await page.getByRole('tab', { name: 'Onay Kuyruğu' }).click();
        await expect(page.locator('text=Bekleyen Onaylar')).toBeVisible();
        console.log('✅ Approvals Tab Content Visible');

        // Switch to "Kill Switch"
        await page.getByRole('tab', { name: 'Kill Switch' }).click();
        await expect(page.locator('text=Global Kill Switch')).toBeVisible();
        console.log('✅ Kill Switch Tab Content Visible');

        // Switch to "Audit Logları"
        await page.getByRole('tab', { name: 'Audit Logları' }).click();
        await expect(page.locator('text=AI İşlem Günlüğü')).toBeVisible();
        console.log('✅ Audit Log Tab Content Visible');

        // Take a screenshot
        await page.screenshot({ path: 'ai_management_verification.png', fullPage: true });
    });
});
