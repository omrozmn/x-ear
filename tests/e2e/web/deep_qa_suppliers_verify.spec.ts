import { test, expect } from '@playwright/test';

test.describe('Deep QA Audit: Suppliers Verification (Absolute Certainty)', () => {
    test('should Read, Update, and Delete the seeded QA_TEST_SEED SUPPLIER', async ({ page }) => {
        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // 1. Login
        await page.goto('http://localhost:8080/auth/login');
        await page.getByPlaceholder(/telefon|phone|username/i).first().fill('05001112233');
        await page.getByPlaceholder(/şifre|password/i).fill('password123');
        await page.getByRole('button', { name: /giriş|login/i }).click();
        await page.waitForURL('http://localhost:8080/');

        // 2. Navigate to Suppliers
        await page.goto('http://localhost:8080/suppliers');
        await page.waitForLoadState('networkidle');

        // 3. Search and Verify Read
        console.log('Searching for QA_TEST_SEED SUPPLIER...');
        const searchInput = page.getByPlaceholder(/ara/i);
        await searchInput.fill('QA_TEST_SEED SUPPLIER');
        await page.waitForTimeout(2000); // Wait for debounce

        const row = page.locator('tr').filter({ hasText: 'QA_TEST_SEED SUPPLIER' }).first();
        await expect(row).toBeVisible({ timeout: 10000 });
        console.log('✅ UI Verification (Read): Supplier found in list.');

        // 4. Perform Update (Edit)
        console.log('Opening Edit modal...');
        await row.getByRole('button', { name: /düzenle|edit/i }).click();

        const modal = page.locator('div[role="dialog"]');
        await expect(modal).toBeVisible();

        // Audit Shared Components in Modal
        console.log('--- COMPONENT AUDIT IN MODAL ---');
        const labels = await modal.locator('label').all();
        for (const label of labels) {
            const labelText = await label.textContent();
            const input = modal.locator(`id=${await label.getAttribute('for')}`).or(label.locator('xpath=following-sibling::input')).or(label.locator('xpath=following-sibling::div//input')).first();
            if (await input.count() > 0) {
                const value = await input.inputValue();
                const placeholder = await input.getAttribute('placeholder') || '';
                console.log(`Input [${labelText}]: Value="${value}", Placeholder="${placeholder}"`);

                // Audit Issue: Input "0" behavior
                if (value === '0') {
                    console.log(`⚠️ AUDIT ISSUE: Input [${labelText}] contains "0" value. This might be a UX bug.`);
                }
            }
        }

        // Fix: Use more specific locators for update
        const contactPersonInput = modal.locator('div:has-text("Yetkili Kişi") >> input').first();
        await contactPersonInput.clear();
        await contactPersonInput.fill('QA UPDATED OWNER');

        const emailInput = modal.locator('div:has-text("E-posta") >> input').first();
        await emailInput.clear();
        await emailInput.fill('updated_qa@example.com');

        console.log('Saving updates...');
        const saveButton = modal.getByRole('button', { name: /güncelle|update|kaydet|save/i });
        await saveButton.click();

        // Audit: Modal should close
        await expect(modal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Update): Modal closed SUCCESSFULLY (Backend fix verified).');

        // 5. Verify Update in List
        await page.waitForTimeout(1000);
        await expect(page.locator('tr').filter({ hasText: 'QA UPDATED OWNER' })).toBeVisible({ timeout: 10000 });
        console.log('✅ UI Verification (Persistence): Updated name visible in list.');

        // 6. Perform Delete
        console.log('Starting Delete verification...');
        const rowToDelete = page.locator('tr').filter({ hasText: 'QA UPDATED OWNER' }).first();
        await rowToDelete.hover();

        await rowToDelete.getByRole('button', { name: /sil|delete/i }).click();

        // Handle Delete Confirmation Modal
        const deleteModal = page.locator('div[role="dialog"]');
        await expect(deleteModal).toBeVisible();
        console.log('Confirming Delete...');
        await deleteModal.getByRole('button', { name: /sil|delete|confirm/i }).click();

        await expect(deleteModal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Delete): Modal closed successfully.');

        // Verify removal
        await searchInput.clear();
        await searchInput.fill('QA_TEST_SEED SUPPLIER');
        await page.waitForTimeout(2000);
        await expect(page.locator('tr').filter({ hasText: 'QA_TEST_SEED SUPPLIER' })).toHaveCount(0, { timeout: 10000 });
        console.log('✅ UI Verification (Cleanup): Supplier no longer in table.');

        // Final Audit: Input "0" in search field check
        console.log('Audit Search Input for "0" bug...');
        await searchInput.clear();
        const searchVal = await searchInput.inputValue();
        if (searchVal === '0') {
            console.log('⚠️ AUDIT ISSUE: Search input shows "0" after clear.');
        } else {
            console.log('✅ Search input is empty after clear.');
        }

        await page.screenshot({ path: 'tests/e2e/web/screenshots/suppliers_audit_final_success.png' });
    });
});
