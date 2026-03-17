import { test, expect } from '@playwright/test';

test.describe('Deep QA Audit: Suppliers Verification (Absolute Certainty)', () => {
    test('should Read, Update, and Delete a unique QA supplier', async ({ page }) => {
        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        const uniqueId = Math.floor(Math.random() * 1000000);
        const supplierName = `QA_SUP_${uniqueId}`;
        const updatedOwner = `QA_OWN_${uniqueId}`;

        // 1. Login
        await page.goto('http://localhost:8080/auth/login');
        await page.getByPlaceholder(/telefon|phone|username/i).first().fill('05001112233');
        await page.getByPlaceholder(/şifre|password/i).fill('password123');
        await page.getByRole('button', { name: /giriş|login/i }).click();
        await page.waitForURL('http://localhost:8080/');

        // 2. Navigate to Suppliers
        await page.goto('http://localhost:8080/suppliers');
        await page.waitForLoadState('networkidle');

        // 3. Create Supplier
        console.log(`Creating supplier: ${supplierName}`);
        await page.getByRole('button', { name: 'Yeni Tedarikçi', exact: true }).click();
        const createModal = page.locator('div[role="dialog"]');
        await expect(createModal).toBeVisible();

        // Fill the form - using nth() to reliably target inputs
        // Order: Şirket Adı(0), Website(1), Vergi No(2), Kod(3), Vergi Dairesi(4), Yetkili Kişi(5), Email(6), Telefon(7), Mobil(8)
        const allInputs = createModal.locator('input[type="text"], input:not([type])');
        await allInputs.nth(0).fill(supplierName); // Şirket Adı
        await allInputs.nth(5).fill('QA SEED OWNER'); // Yetk ili Kişi
        await allInputs.nth(7).fill('05001112233'); // Telefon

        await createModal.getByRole('button', { name: /kaydet|save|ekle|create/i }).click();
        await expect(createModal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Verification (Create): Supplier created.');

        // Explicitly click Refresh to ensure list is updated
        await page.getByRole('button', { name: /yenile/i }).click();
        await page.waitForLoadState('networkidle');

        // 4. Search and Verify Read
        console.log(`Searching for ${supplierName}...`);
        const searchInput = page.getByPlaceholder(/ara/i);
        await searchInput.clear();
        await searchInput.fill(supplierName);
        await page.waitForTimeout(3000);

        const row = page.locator('tr').filter({ hasText: supplierName }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
        console.log('✅ UI Verification (Read): Supplier found in list.');

        // 4. Perform Update (Edit)
        console.log('Opening Edit modal...');
        await row.getByRole('button', { name: /düzenle|edit/i }).click();

        const editModal = page.locator('div[role="dialog"]');
        await expect(editModal).toBeVisible();

        // Use nth() to target update fields
        const editInputs = editModal.locator('input[type="text"], input:not([type])');
        await editInputs.nth(5).fill(updatedOwner); // Yetkili Kişi
        await editInputs.nth(6).fill(`qa_${uniqueId}@example.com`); // E-posta

        console.log('Saving updates...');
        const saveButton = editModal.getByRole('button', { name: /güncelle|update|kaydet|save/i });
        await saveButton.click();

        // Audit: Modal should close
        await expect(editModal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Update): Modal closed SUCCESSFULLY.');
        await page.waitForTimeout(2000);

        // 5. Verify Update in List
        await searchInput.clear();
        await searchInput.fill(updatedOwner);
        await page.waitForTimeout(3000);
        await expect(page.locator('tr').filter({ hasText: updatedOwner })).toBeVisible({ timeout: 15000 });
        console.log('✅ UI Verification (Persistence): Updated name visible in list.');

        // 6. Perform Delete
        console.log('Starting Delete verification...');
        const rowToDelete = page.locator('tr').filter({ hasText: updatedOwner }).first();
        await rowToDelete.hover();

        await rowToDelete.getByRole('button', { name: /sil|delete/i }).click();

        // Handle Delete Confirmation Modal
        const deleteConfirmModal = page.locator('div[role="dialog"]');
        await expect(deleteConfirmModal).toBeVisible();
        console.log('Confirming Delete...');
        await deleteConfirmModal.getByRole('button', { name: /sil|delete|confirm/i }).click();

        await expect(deleteConfirmModal).not.toBeVisible({ timeout: 15000 });
        console.log('✅ UI Modification (Delete): Modal closed successfully.');

        // Verify removal
        await searchInput.clear();
        await searchInput.fill(supplierName);
        await page.waitForTimeout(3000);
        await expect(page.locator('tr').filter({ hasText: supplierName })).toHaveCount(0, { timeout: 10000 });
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
