import { test, expect } from '../fixtures/fixtures';

test('debug payments route', async ({ tenantPage }) => {
    await tenantPage.goto('/');
    await tenantPage.waitForLoadState('networkidle');

    // Look for "Fatura" in sidebar and expand if needed
    const invoicesMenu = tenantPage.getByText('Fatura', { exact: true });
    await invoicesMenu.click();

    // Look for "Ödeme Takibi"
    const paymentsMenu = tenantPage.getByText('Ödeme Takibi', { exact: true });
    await expect(paymentsMenu).toBeVisible({ timeout: 5000 });

    await paymentsMenu.click();
    await tenantPage.waitForLoadState('networkidle');

    console.log('Final URL after clicking Payments:', tenantPage.url());

    // Check if the page actually loaded or if it's a 404/Redirect
    const body = await tenantPage.locator('body').innerText();
    console.log('Body snippet:', body.substring(0, 200));
});
