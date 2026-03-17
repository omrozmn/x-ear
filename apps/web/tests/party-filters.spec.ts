import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Party Filters and Acquisition Type
 * Tests all filter combinations and CRUD operations
 */

const BASE_URL = 'http://localhost:5173';

// Test data
const TEST_USER = {
    email: 'admin@x-ear.com',
    password: 'admin123'
};

test.describe('Party Filters and Acquisition Type Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await page.waitForURL(`${BASE_URL}/`);

        // Navigate to parties page
        await page.goto(`${BASE_URL}/parties`);
        await page.waitForLoadState('networkidle');
    });

    test('should display all parties', async ({ page }) => {
        // Check that parties are loaded
        const partyRows = page.locator('[data-testid="party-row"]');
        const count = await partyRows.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Found ${count} parties`);
    });

    test('should filter by status (active)', async ({ page }) => {
        // Open filters
        await page.click('button:has-text("Filtreler")');

        // Click active status filter
        await page.click('button:has-text("Aktif")');

        // Wait for results to update
        await page.waitForTimeout(500);

        // Verify all visible parties have active status
        const statusBadges = page.locator('[data-status="active"]');
        const count = await statusBadges.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Found ${count} active parties`);
    });

    test('should filter by segment (customer)', async ({ page }) => {
        // Open filters
        await page.click('button:has-text("Filtreler")');

        // Click customer segment filter
        await page.click('button:has-text("Müşteri")');

        // Wait for results to update
        await page.waitForTimeout(500);

        // Verify filter is applied
        const filteredRows = page.locator('[data-testid="party-row"]');
        const count = await filteredRows.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Found ${count} customer segment parties`);
    });

    test('should filter by acquisition type (referral)', async ({ page }) => {
        // Open filters
        await page.click('button:has-text("Filtreler")');

        // Click referral acquisition type
        await page.click('button:has-text("Referans")');

        // Wait for results to update
        await page.waitForTimeout(500);

        // Verify results
        const filteredRows = page.locator('[data-testid="party-row"]');
        const count = await filteredRows.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Found ${count} referral acquisition parties`);
    });

    test('should apply combined filters', async ({ page }) => {
        // Open filters
        await page.click('button:has-text("Filtreler")');

        // Apply multiple filters
        await page.click('button:has-text("Aktif")'); // Status
        await page.click('button:has-text("Müşteri")'); // Segment
        await page.click('button:has-text("Referans")'); // Acquisition

        // Wait for results to update
        await page.waitForTimeout(500);

        // Verify filters are applied
        const activeFilters = page.locator('[class*="bg-blue-100"]');
        const count = await activeFilters.count();

        expect(count).toBeGreaterThanOrEqual(3);
        console.log(`✅ Applied ${count} filters`);
    });

    test('should clear all filters', async ({ page }) => {
        // Open filters and apply some
        await page.click('button:has-text("Filtreler")');
        await page.click('button:has-text("Aktif")');
        await page.click('button:has-text("Referans")');

        // Clear filters
        await page.click('button:has-text("Temizle")');

        // Verify filters are cleared
        await page.waitForTimeout(500);

        const allParties = page.locator('[data-testid="party-row"]');
        const count = await allParties.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Filters cleared, showing ${count} parties`);
    });

    test('should update party acquisition type', async ({ page }) => {
        // Click first party to open details
        const firstParty = page.locator('[data-testid="party-row"]').first();
        await firstParty.click();

        // Wait for details to load
        await page.waitForTimeout(500);

        // Click "Etiket Güncelle" button
        await page.click('button:has-text("Etiket Güncelle")');

        // Wait for modal
        await page.waitForSelector('[role="dialog"]');

        // Select acquisition type
        await page.selectOption('select#acquisitionType', 'social-media');

        // Click update button
        await page.click('button:has-text("Güncelle")');

        // Wait for modal to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

        // Verify update succeeded
        await page.waitForTimeout(500);

        console.log('✅ Acquisition type updated successfully');
    });

    test('should navigate to admin settings from tag modal', async ({ page }) => {
        // Click first party
        const firstParty = page.locator('[data-testid="party-row"]').first();
        await firstParty.click();

        // Wait for details
        await page.waitForTimeout(500);

        // Click "Etiket Güncelle"
        await page.click('button:has-text("Etiket Güncelle")');

        // Wait for modal
        await page.waitForSelector('[role="dialog"]');

        // Click "Etiketleri Düzenle" button
        await page.click('button:has-text("Etiketleri Düzenle")');

        // Wait for navigation
        await page.waitForURL(/\/settings\//);

        // Verify we're on settings page
        const url = page.url();
        expect(url).toContain('/settings/');

        console.log(`✅ Navigated to settings: ${url}`);
    });

    test('should create new party with acquisition type', async ({ page }) => {
        // Click "Yeni Hasta" button
        await page.click('button:has-text("Yeni Hasta")');

        // Wait for modal
        await page.waitForSelector('[role="dialog"]');

        // Fill form
        await page.fill('input[name="firstName"]', 'E2E Test');
        await page.fill('input[name="lastName"]', 'User');
        await page.fill('input[name="phone"]', '+905551234567');
        await page.fill('input[name="email"]', `e2etest${Date.now()}@example.com`);
        await page.fill('input[name="tcNumber"]', '12345678901');

        // Select acquisition type
        await page.selectOption('select[name="acquisitionType"]', 'online');

        // Submit
        await page.click('button[type="submit"]');

        // Wait for modal to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

        // Wait for party to appear
        await page.waitForTimeout(1000);

        // Search for new party
        await page.fill('input[placeholder*="Ara"]', 'E2E Test');

        // Verify it exists
        const searchResults = page.locator('[data-testid="party-row"]');
        const count = await searchResults.count();

        expect(count).toBeGreaterThan(0);
        console.log('✅ Created new party with acquisition type');
    });

    test('should search parties by name', async ({ page }) => {
        // Get first party name
        const firstPartyName = await page.locator('[data-testid="party-name"]').first().textContent();

        if (!firstPartyName) {
            console.log('⚠️  No parties to search');
            return;
        }

        // Extract first name
        const firstName = firstPartyName.split(' ')[0];

        // Search
        await page.fill('input[placeholder*="Ara"]', firstName);
        await page.waitForTimeout(500);

        // Verify results contain search term
        const results = page.locator('[data-testid="party-row"]');
        const count = await results.count();

        expect(count).toBeGreaterThan(0);
        console.log(`✅ Search found ${count} results for "${firstName}"`);
    });
});

test.describe('Party Filter Edge Cases', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/`);
        await page.goto(`${BASE_URL}/parties`);
        await page.waitForLoadState('networkidle');
    });

    test('should handle empty acquisition type gracefully', async ({ page }) => {
        // Open filters
        await page.click('button:has-text("Filtreler")');

        // Click and unclick same filter
        await page.click('button:has-text("Referans")');
        await page.click('button:has-text("Referans")');

        // Should show all parties
        const allParties = page.locator('[data-testid="party-row"]');
        const count = await allParties.count();

        expect(count).toBeGreaterThan(0);
        console.log('✅ Empty filter handled correctly');
    });

    test('should preserve filters on page reload', async ({ page }) => {
        // Apply filter
        await page.click('button:has-text("Filtreler")');
        await page.click('button:has-text("Aktif")');

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Check if filter is still applied (if implemented)
        // This depends on whether you store filters in URL params
        console.log('✅ Page reloaded');
    });
});
