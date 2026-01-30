import { test, expect } from '@playwright/test';

test.describe('Suppliers Module: Structural Walkthrough & Component Audit', () => {
    test('should map all elements and check shared component consistency', async ({ page }) => {
        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // 1. Login
        await page.goto('http://localhost:8080/auth/login');
        await page.getByPlaceholder(/telefon|phone/i).fill('05001112233');
        await page.getByPlaceholder(/şifre|password/i).fill('password123');
        await page.getByRole('button', { name: /giriş|login/i }).click();
        await page.waitForURL('http://localhost:8080/');

        // 2. Navigate to Suppliers
        await page.goto('http://localhost:8080/suppliers');
        await page.waitForLoadState('networkidle');

        // 3. Map Main Page Elements
        console.log('--- MAIN PAGE ELEMENT MAP ---');
        const header = await page.getByRole('heading', { name: /tedarikçiler/i }).isVisible();
        console.log('Header Visible:', header);

        const stats = page.locator('.grid >> .bg-white');
        console.log('Stats Cards Count:', await stats.count());

        const newSupplierBtn = page.getByRole('button', { name: /yeni tedarikçi/i });
        console.log('New Supplier Button Visible:', await newSupplierBtn.isVisible());

        const searchInput = page.getByPlaceholder(/ara/i);
        console.log('Search Input Placeholder:', await searchInput.getAttribute('placeholder'));

        // 4. Open New Supplier Modal & Audit Shared Components
        console.log('--- MODAL & SHARED COMPONENT AUDIT ---');
        await newSupplierBtn.click();
        const modal = page.locator('div[role="dialog"]');
        await expect(modal).toBeVisible();

        // Audit Input "0" behavior
        // Find an input that might have a numeric context or default 0 (if any)
        const allInputs = await modal.locator('input').all();
        for (const input of allInputs) {
            const label = await input.evaluate(el => el.closest('div')?.previousElementSibling?.textContent || 'unknown');
            const value = await input.inputValue();
            console.log(`Input [${label}]: Value="${value}"`);

            // Focus and check if 0 persists
            if (value === '0') {
                await input.focus();
                const valueOnFocus = await input.inputValue();
                console.log(`Input [${label}] Focus Test: Value remains "${valueOnFocus}"`);
            }
        }

        // Audit Dropdown arrow alignment
        const selects = await modal.locator('select').all();
        for (const select of selects) {
            const box = await select.boundingBox();
            console.log(`Select Box: x=${box?.x}, y=${box?.y}, w=${box?.width}, h=${box?.height}`);
            // Note: Visual alignment is best checked via screenshot, but we log the existence.
        }

        // Audit Autocomplete (Country/City)
        const autocompletes = await modal.locator('.relative >> input').all();
        console.log('Autocompletes found:', autocompletes.length);

        // Take detailed screenshots
        await page.screenshot({ path: 'tests/e2e/web/screenshots/suppliers_walkthrough_base.png', fullPage: true });
        await modal.screenshot({ path: 'tests/e2e/web/screenshots/suppliers_modal_audit.png' });

        console.log('✅ Structural Walkthrough Complete.');
    });
});
