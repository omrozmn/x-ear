import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Users Module', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await page.goto(`${BASE_URL}/users`);
    });

    test('Tabs & List View Verification', async ({ page }) => {
        console.log('Step 1: Check Page Header');
        await expect(page.getByRole('heading', { name: 'Kullanıcı Yönetimi' })).toBeVisible();

        console.log('Step 2: Verify Tabs');
        const adminTab = page.getByRole('tab', { name: 'Sistem Yöneticileri (Admin)' });
        const tenantTab = page.getByRole('tab', { name: 'Abone Kullanıcıları (Tenant)' });

        await expect(adminTab).toBeVisible();
        await expect(tenantTab).toBeVisible();

        // Check active tab styling or state
        await expect(adminTab).toHaveAttribute('data-state', 'active');

        console.log('Step 3: Switch Tabs');
        await tenantTab.click();
        await expect(tenantTab).toHaveAttribute('data-state', 'active');
        // Wait for list to potentially load (even if empty)
        await page.waitForTimeout(1000);
        await expect(page.getByRole('table')).toBeVisible();
    });

    test('System Admin Creation Flow', async ({ page }) => {
        const timestamp = Date.now();
        const testUserEmail = `e2e_admin_${timestamp}@example.com`;
        const testUserFirst = `TestAdmin`;
        const testUserLast = `${timestamp}`;

        console.log('Step 1: Open Add User Modal');
        await page.getByRole('button', { name: 'Kullanıcı Ekle' }).click();
        await expect(page.getByRole('heading', { name: 'Yeni Kullanıcı Ekle' })).toBeVisible();

        console.log('Step 2: Fill Form (System Admin)');
        await page.locator('input[value="admin"]').check();

        await page.locator('label:has-text("İsim") + input').fill(testUserFirst);
        await page.locator('label:has-text("Soyisim") + input').fill(testUserLast);
        await page.locator('label:has-text("E-posta") + input').fill(testUserEmail);
        await page.locator('label:has-text("Şifre") + div > input').fill('Password123!');

        // Generate Username
        await page.getByRole('button', { name: 'Oluştur' }).click();
        const usernameInput = page.locator('label:has-text("Kullanıcı Adı") + div > input');
        await expect(usernameInput).not.toHaveValue('');

        console.log('Step 3: Submit Form');
        await page.getByRole('button', { name: 'Kaydet' }).click();

        // Verify Success Toast
        await expect(page.getByText('Kullanıcı başarıyla oluşturuldu')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Yeni Kullanıcı Ekle' })).not.toBeVisible();

        console.log('Step 4: Verify Creation via Login');
        // Clear storage/cookies to ensure logout
        await page.context().clearCookies();
        await page.goto(`${BASE_URL}/login`);

        console.log(`Attempting login with ${testUserEmail} / Password123!`);
        await page.fill('input[type="email"]', testUserEmail);
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        console.log('✅ Login successful with new user. Creation verified.');

        // Note: Search functionality might be broken as it failed to find the user in previous run.
    });

});
