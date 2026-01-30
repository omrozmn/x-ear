import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('Dashboard Elements Verification', async ({ page }) => {
        // Diagnostic: Check which dashboard is loaded
        const welcomeOld = page.locator('text=Welcome back');
        const welcomeNew = page.locator('text=Hoşgeldiniz');

        if (await welcomeOld.isVisible()) {
            console.log('⚠️ WARNING: Legacy Dashboard.tsx is active!');
        } else if (await welcomeNew.isVisible()) {
            console.log('✅ AdminDashboardPage.tsx is active');
        } else {
            console.log('❌ Neither dashboard header found (Loading state or Error?)');
            // Check for error
            if (await page.locator('text=Veri Yükleme Hatası').isVisible()) {
                console.log('❌ Dashboard Data Load Error detected');
            }
        }

        console.log('Step 1: Verifying KPI Cards...');

        // Check for the 4 main KPI cards
        const kpiCards = [
            'Aktif Aboneler',
            'Aktif Kullanıcılar',
            'Aylık Gelir (MRR)',
            'Churn Oranı'
        ];

        for (const title of kpiCards) {
            await expect(page.locator(`text=${title}`)).toBeVisible();
            console.log(`✅ KPI Card visible: ${title}`);
        }

        // Verify values are not just empty dashes forever (allow time for fetch)
        // We expect either a number or specific fallback, but mostly the structure
        await expect(page.locator('.text-3xl.font-bold').first()).toBeVisible();

        console.log('Step 2: Verifying Charts & Sections...');
        await expect(page.getByText('Büyüme & Durum')).toBeVisible();

        // Debug: Print all text to understand what is visible
        const pageText = await page.innerText('body');
        console.log('--- PAGE CONTENT START ---');
        console.log(pageText);
        console.log('--- PAGE CONTENT END ---');

        // Both sections should be visible if data is loaded
        await expect(page.getByText('Hızlı İşlemler')).toBeVisible();
        await expect(page.getByText('Günlük Operasyon')).toBeVisible();

        console.log('Step 3: Verifying Quick Actions...');
        const actions = ['Yeni Abone Ekle', 'Plan Yönetimi', 'Destek Talepleri', 'Sistem Ayarları'];
        for (const action of actions) {
            await expect(page.getByRole('button', { name: action })).toBeVisible();
        }

        console.log('Step 4: Testing Refresh Functionality...');
        const refreshBtn = page.locator('button[title="Yenile"]');
        await expect(refreshBtn).toBeVisible();
        await refreshBtn.click();

        // Wait for spinner or simple wait to ensure no crash
        await page.waitForTimeout(1000);
        await expect(page.getByText('Veri Yükleme Hatası')).not.toBeVisible();

        console.log('✅ Dashboard Refresh Successful');
    });

});
