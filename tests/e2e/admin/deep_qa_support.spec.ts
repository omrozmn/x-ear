import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:8082';
const CREDENTIALS = {
    email: 'admin@x-ear.com',
    password: 'admin123'
};

test.describe('Deep QA Audit: Support Module', () => {

    test('Verify Support Tickets Loading & Verification', async ({ page }) => {
        // 1. Login
        console.log('Step 1: Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button:has-text("Sign in")');

        // 2. Navigate to Support via Sidebar
        console.log('Step 2: Navigating to Support...');
        // Find sidebar link
        const supportLink = page.locator('nav').locator('a[href="/support"]');
        await supportLink.click();

        // Check if we are on the correct URL
        await expect(page).toHaveURL(/.*support/);

        // Check Header
        await expect(page.getByRole('heading', { name: 'Destek Ticketları', exact: true })).toBeVisible();
        console.log('✅ Support Page Loaded');

        // 3. Verify Data Presence
        console.log('Step 3: Verifying Tickets...');

        // Wait for potential loading state
        await expect(page.locator('text=Yükleniyor...')).not.toBeVisible({ timeout: 10000 });

        // Check for empty state OR list items
        const emptyState = page.locator('text=Destek talebi bulunamadı');
        const ticketList = page.locator('.space-y-4'); // Adjust based on actual UI structure (often a list of cards)

        const isEmpty = await emptyState.isVisible();
        if (isEmpty) {
            console.log('ℹ️ No support tickets found (Empty State Verified)');
        } else {
            // If not empty, we expect some content. Let's look for common ticket elements.
            const ticketItems = page.locator('div[class*="border"]').filter({ hasText: /TALEP-/ });
            const count = await ticketItems.count();
            console.log(`✅ Found ${count} ticket items`);
        }

        // 4. Verify Filters
        const searchInput = page.locator('input[placeholder*="Ticket ara"]');
        await expect(searchInput).toBeVisible();
        console.log('✅ Search input visible');

        // Take a screenshot
        await page.screenshot({ path: 'support_verification.png', fullPage: true });
    });
});
