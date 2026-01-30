import { test, expect } from '@playwright/test';

test.describe('Deep QA Audit: Parties Verification (Absolute Certainty)', () => {
    test('should Read and Update the seeded QA_TEST_SEED party', async ({ page }) => {
        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // 1. Navigate to login
        await page.goto('http://localhost:8080/auth/login');

        // 2. Perform Login as QA ADMIN
        await page.locator('input[type="text"], input[name="email"], input[name="identifier"]').first().fill('qa_admin@x-ear.com');
        await page.locator('input[type="password"]').fill('password123');

        console.log('Clicking login...');
        await page.click('button:has-text("Login"), button[type="submit"]');

        // Wait for redirection
        await page.waitForURL(url => url.pathname !== '/auth/login', { timeout: 15000 });
        console.log('✅ Login successful. URL:', page.url());

        // 4. Navigate to Parties
        await page.goto('http://localhost:8080/parties');
        await page.waitForLoadState('networkidle');

        // 5. Search for the seed
        const searchInput = page.getByPlaceholder('Ad, soyad, telefon veya TC ile ara...');
        await expect(searchInput).toBeVisible({ timeout: 15000 });
        await searchInput.fill('QA_TEST_SEED');
        await page.waitForTimeout(2000); // Wait for debounced search

        // 6. Verify Read Access
        const seedRecord = page.locator('tr').filter({ hasText: 'QA_TEST_SEED' }).first();
        await expect(seedRecord).toBeVisible({ timeout: 15000 });
        console.log('✅ UI Verification (Read): Party found in table.');

        // 7. Perform Update
        // Hover the row to ensure buttons are visible/clickable if needed
        await seedRecord.hover();

        // Click the Edit button (handle both English and Turkish labels)
        const editButton = seedRecord.getByRole('button', { name: /Edit|Düzenle/i }).first();
        if (!await editButton.isVisible()) {
            console.log('Falling back to first button in row for edit...');
            await seedRecord.locator('button').first().click();
        } else {
            await editButton.click();
        }

        // Wait for the Edit Modal
        const modal = page.locator('div[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Locate inputs by placeholders for maximum robustness
        const tcInput = modal.getByPlaceholder('12345678901');
        const phoneInput = modal.getByPlaceholder('0555 123 45 67');

        console.log('Clearing and filling TC number...');
        await tcInput.fill('12345678950'); // Use valid checksum TC

        console.log('Filling phone number...');
        await phoneInput.clear();
        await phoneInput.fill('05559998877');

        const saveButton = modal.getByRole('button', { name: /Güncelle|Update|Kaydet|Save/i });
        console.log('Clicking Save button...');
        await saveButton.click();

        // Wait for modal to disappear as a sign of success
        console.log('Waiting for modal to close...');
        await expect(modal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Update): Modal closed successfully.');

        // Take a screenshot for proof of update
        await page.screenshot({ path: 'tests/e2e/web/screenshots/parties_audit_update_success.png' });

        // 8. Perform Delete (Absolute Certainty)
        console.log('Starting Delete verification...');
        await page.goto('http://localhost:8080/parties'); // Re-navigate to be sure
        await page.waitForLoadState('networkidle');

        console.log('Searching for party to delete...');
        await searchInput.fill('QA_TEST_SEED');
        await page.waitForTimeout(2000);

        const rowToDelete = page.locator('tr').filter({ hasText: 'QA_TEST_SEED' }).first();
        console.log('Hovering row to delete...');
        await rowToDelete.hover();

        const deleteButton = rowToDelete.getByRole('button', { name: /Sil|Delete/i });
        console.log('Clicking Delete button...');
        await deleteButton.click();

        // Wait for Delete Confirmation Modal
        console.log('Waiting for Delete Confirmation Modal...');
        const deleteModal = page.locator('div[role="dialog"]');
        await expect(deleteModal).toBeVisible();

        console.log('Confirming Delete...');
        await deleteModal.getByRole('button', { name: /Sil|Delete|Confirm/i }).click();

        // Wait for modal to disappear
        console.log('Waiting for delete modal to close...');
        await expect(deleteModal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Delete): Modal closed successfully.');

        // Verify it's gone from the table
        console.log('Verifying party is gone from table...');
        await searchInput.clear();
        await searchInput.fill('QA_TEST_SEED');
        await page.waitForTimeout(2000);
        await expect(page.locator('tr').filter({ hasText: 'QA_TEST_SEED' })).toHaveCount(0, { timeout: 10000 });
        console.log('✅ UI Verification (Cleanup): Party no longer in table.');
    });
});
