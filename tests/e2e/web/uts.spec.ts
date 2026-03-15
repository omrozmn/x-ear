import { expect, test } from '@playwright/test';

import {
  authHeaders,
  createAuthenticatedWebPage,
  loginRealTenantApi,
} from '../../helpers/real-web-auth.helper';

const API_BASE_URL = 'http://127.0.0.1:5003';
const TEST_IDENTIFIER = 'denemehelixadmin';
const TEST_PASSWORD = 'Deneme123!';

async function ensureUtsEnabled(tokenHeaders: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}/api/uts/config`, {
    method: 'PUT',
    headers: {
      ...tokenHeaders,
      'Idempotency-Key': `uts-config-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      enabled: true,
      environment: 'test',
      authScheme: 'uts_token',
      autoSendNotifications: false,
      notificationMode: 'outbox',
      notificationTemplates: {},
    }),
  });

  expect(response.ok).toBeTruthy();
}

async function seedSerialState(
  tokenHeaders: Record<string, string>,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${API_BASE_URL}/api/uts/serial-states`, {
    method: 'PUT',
    headers: {
      ...tokenHeaders,
      'Idempotency-Key': `uts-state-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify(payload),
  });
  expect(response.ok).toBeTruthy();
}

async function createInventory(
  tokenHeaders: Record<string, string>,
  suffix: string,
) {
  const response = await fetch(`${API_BASE_URL}/api/inventory`, {
    method: 'POST',
    headers: {
      ...tokenHeaders,
      'Idempotency-Key': `uts-inventory-${suffix}`,
    },
    body: JSON.stringify({
      name: `UTS Device ${suffix}`,
      brand: 'Helix',
      model: 'Force 100 HP',
      price: 1000,
      barcode: `869${suffix.slice(-10)}`,
      availableInventory: 1,
      category: 'hearing_aid',
      supplier: `UTS Supplier ${suffix}`,
    }),
  });

  expect(response.ok).toBeTruthy();
  const payload = await response.json();
  return payload.data as { id: string; barcode: string; name: string };
}

test.describe('UTS workbench and serial flows', () => {
  test('lists only seeded UTS states, supports bulk actions and supplier autocomplete', async ({ browser, request }) => {
    const tokens = await loginRealTenantApi(request, TEST_IDENTIFIER, TEST_PASSWORD);
    const tokenHeaders = authHeaders(tokens);
    await ensureUtsEnabled(tokenHeaders);

    const suffix = Date.now().toString();
    const ownedSerial = `OWN-${suffix}`;
    const pendingSerial = `PND-${suffix}`;
    const supplierName = `UTS Search Supplier ${suffix}`;
    const institutionNumber = `2667${suffix.slice(-9)}`;

    const supplierResponse = await fetch(`${API_BASE_URL}/api/suppliers`, {
      method: 'POST',
      headers: {
        ...tokenHeaders,
        'Idempotency-Key': `uts-search-supplier-${suffix}`,
      },
      body: JSON.stringify({
        companyName: supplierName,
        name: supplierName,
        phone: '05551112233',
        email: `uts-search-${suffix}@example.com`,
        institutionNumber,
      }),
    });
    expect(supplierResponse.ok).toBeTruthy();
    const supplierPayload = await supplierResponse.json();
    const supplierId = String(supplierPayload.data.id);

    await seedSerialState(tokenHeaders, {
      status: 'owned',
      inventoryName: `Owned Device ${suffix}`,
      productName: `Owned Device ${suffix}`,
      productNumber: `0868${suffix.slice(-10)}`,
      serialNumber: ownedSerial,
      supplierName,
      supplierId,
      institutionNumber,
      documentNumber: `DOC-${suffix}`,
      lastMessage: 'owned seeded state',
    });

    await seedSerialState(tokenHeaders, {
      status: 'pending_receipt',
      inventoryName: `Pending Device ${suffix}`,
      productName: `Pending Device ${suffix}`,
      productNumber: `0977${suffix.slice(-10)}`,
      serialNumber: pendingSerial,
      supplierName,
      supplierId,
      institutionNumber,
      documentNumber: `DOC-P-${suffix}`,
      lastMessage: 'pending seeded state',
    });

    const { context, page } = await createAuthenticatedWebPage(browser, tokens);

    try {
      await page.goto('/uts');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'UTS' })).toBeVisible();

      const searchInput = page.getByPlaceholder(/Seri, urun veya barkod ara/i);
      await searchInput.fill(ownedSerial);
      await expect(page.getByText(ownedSerial)).toBeVisible();
      await expect(page.getByText('UTS Bizde')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Verme Bildir' })).toBeVisible();

      await page.locator('table tbody tr').first().locator('button').first().click();
      await expect(page.getByText('1 seri secildi')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Toplu Verme Bildir' })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.getByRole('button', { name: 'Verme Bildir' }).first().click();
      const modal = page.getByRole('dialog');
      await expect(modal.getByRole('heading', { name: 'Verme Bildirimi' })).toBeVisible();
      await expect(modal.getByText('Hedef kurum no')).toBeVisible();
      await expect(modal.getByText('Belge no')).toBeVisible();
      await expect(modal.getByText('Barkod / Urun no')).toBeVisible();
      await expect(modal.getByText('Seri no')).toBeVisible();
      await modal.getByPlaceholder(/Tedarikci adi veya kurum no/i).fill(supplierName);
      await expect(modal.getByText(supplierName)).toBeVisible();
      await expect(modal.getByText(institutionNumber)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.getByRole('button', { name: 'Alma Bekleyenler' }).click();
      await searchInput.fill(pendingSerial);
      await expect(page.getByText(pendingSerial)).toBeVisible();
      await expect(page.getByText('UTS Alma Bekliyor')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Alma Bildir' })).toBeVisible();

      await page.locator('table tbody tr').first().locator('button').first().click();
      await expect(page.getByText('1 seri secildi')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Toplu Alma Bildir' })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('shows UTS badge and query button per serial in inventory detail serial modal', async ({ browser, request }) => {
    const tokens = await loginRealTenantApi(request, TEST_IDENTIFIER, TEST_PASSWORD);
    const tokenHeaders = authHeaders(tokens);
    await ensureUtsEnabled(tokenHeaders);

    const suffix = Date.now().toString();
    const serial = `SER-${suffix}`;
    const inventory = await createInventory(tokenHeaders, suffix);

    const serialResponse = await fetch(`${API_BASE_URL}/api/inventory/${inventory.id}/serials`, {
      method: 'POST',
      headers: {
        ...tokenHeaders,
        'Idempotency-Key': `uts-serials-${suffix}`,
      },
      body: JSON.stringify({
        serials: [serial],
      }),
    });
    expect(serialResponse.ok).toBeTruthy();

    await seedSerialState(tokenHeaders, {
      status: 'owned',
      inventoryId: inventory.id,
      inventoryName: inventory.name,
      productName: inventory.name,
      productNumber: inventory.barcode,
      serialNumber: serial,
      lastMessage: 'serial modal seeded state',
    });

    const { context, page } = await createAuthenticatedWebPage(browser, tokens);

    try {
      await page.goto(`/inventory/${inventory.id}`);
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Seri No Listesi/i }).click();
      const modal = page.getByRole('dialog');
      await expect(modal.locator(`input[value="${serial}"]`)).toBeVisible();
      await expect(modal.getByText('UTS Bizde')).toBeVisible();
      await expect(modal.getByRole('button', { name: 'UTS Sorgula' })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
