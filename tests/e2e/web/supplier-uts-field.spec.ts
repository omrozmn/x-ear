import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAuthenticatedWebPage,
  loginRealTenantApi,
} from '../../helpers/real-web-auth.helper';

const TEST_IDENTIFIER = 'denemehelixadmin';
const TEST_PASSWORD = 'Deneme123!';

test.describe('Supplier UTS institution flow', () => {
  test('shows UTS institution field in modal and detail page', async ({ browser, request }) => {
    const tokens = await loginRealTenantApi(request, TEST_IDENTIFIER, TEST_PASSWORD);
    const { context, page } = await createAuthenticatedWebPage(browser, tokens);

    const suffix = Date.now().toString();
    const supplierName = `UTS Supplier ${suffix}`;
    const institutionNumber = `2667${suffix.slice(-9)}`;

    try {
      const supplierResponse = await fetch('http://127.0.0.1:5003/api/suppliers', {
        method: 'POST',
        headers: {
          ...authHeaders(tokens),
          'Idempotency-Key': `supplier-uts-${suffix}`,
        },
        body: JSON.stringify({
          companyName: supplierName,
          name: supplierName,
          phone: '05550000000',
          email: `supplier-${suffix}@example.com`,
          institutionNumber,
        }),
      });

      expect(supplierResponse.ok).toBeTruthy();
      const supplierPayload = await supplierResponse.json();
      const supplierId = String(supplierPayload.data.id);

      await page.goto('/suppliers');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Yeni Tedarik/i }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('UTS Kurum No')).toBeVisible();
      await expect(modal.getByPlaceholder('UTS kurum numarası')).toBeVisible();
      await page.keyboard.press('Escape');

      await page.goto(`/suppliers/${supplierId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(`UTS Kurum No: ${institutionNumber}`)).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
