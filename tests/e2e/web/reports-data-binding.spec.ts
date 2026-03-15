import { test, expect } from '@playwright/test';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(amount);
}

test('reports tabs render API-backed values', async ({ page, request }) => {
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5003';

  const loginResponse = await request.post(`${apiBaseUrl}/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: {
      identifier: 'admin@xear.com',
      password: 'Admin123!',
    },
  });

  expect(loginResponse.ok()).toBeTruthy();

  const loginJson = await loginResponse.json();
  const auth = loginJson.data;
  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': auth.user.tenantId,
  };

  const [overviewRes, patientsRes, financialRes, remainingRes, cashflowRes, posRes] = await Promise.all([
    request.get(`${apiBaseUrl}/api/reports/overview?days=30`, { headers }),
    request.get(`${apiBaseUrl}/api/reports/patients?days=30`, { headers }),
    request.get(`${apiBaseUrl}/api/reports/financial?days=30`, { headers }),
    request.get(`${apiBaseUrl}/api/reports/remaining-payments?page=1&per_page=20&min_amount=0`, { headers }),
    request.get(`${apiBaseUrl}/api/reports/cashflow-summary?days=30`, { headers }),
    request.get(`${apiBaseUrl}/api/reports/pos-movements?page=1&per_page=20&days=30`, { headers }),
  ]);

  expect(overviewRes.ok()).toBeTruthy();
  expect(patientsRes.ok()).toBeTruthy();
  expect(financialRes.ok()).toBeTruthy();
  expect(remainingRes.ok()).toBeTruthy();
  expect(cashflowRes.ok()).toBeTruthy();
  expect(posRes.ok()).toBeTruthy();

  const overview = (await overviewRes.json()).data;
  const patients = (await patientsRes.json()).data;
  const financial = (await financialRes.json()).data;
  const remainingJson = await remainingRes.json();
  const cashflow = (await cashflowRes.json()).data;
  const posJson = await posRes.json();

  await page.addInitScript((data) => {
    localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
    localStorage.setItem('x-ear.auth.refresh@v1', data.refreshToken || data.accessToken);
    localStorage.setItem('x-ear.auth.currentTenantId@v1', data.user.tenantId);
    localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify({
      state: {
        user: {
          ...data.user,
          isPhoneVerified: true,
        },
        token: data.accessToken,
        refreshToken: data.refreshToken || data.accessToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
        requiresOtp: false,
        requiresPhone: false,
        maskedPhone: null,
        subscription: { isExpired: false, daysRemaining: 30, planName: 'PRO' },
      },
      version: 0,
    }));
  }, auth);

  await page.goto('/reports');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(formatCurrency(overview.totalRevenue)).first()).toBeVisible();
  await expect(page.getByText(String(overview.totalSales), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(overview.totalPatients), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(overview.newPatients), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(overview.totalAppointments), { exact: true }).first()).toBeVisible();

  if (financial.paymentMethods && Object.keys(financial.paymentMethods).length > 0) {
    const [firstMethod] = Object.entries(financial.paymentMethods);
    await expect(page.getByText(firstMethod[0], { exact: true }).first()).toBeVisible();
    await expect(page.getByText(formatCurrency((firstMethod[1] as { amount: number }).amount)).first()).toBeVisible();
  }

  await page.getByRole('button', { name: 'Hasta Raporları' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(String(patients.patientSegments.new), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(patients.patientSegments.active), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(patients.patientSegments.trial), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(patients.patientSegments.inactive), { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Kalan Ödemeler' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(formatCurrency(cashflow.totalRevenue)).first()).toBeVisible();
  await expect(page.getByText(formatCurrency(cashflow.totalExpenses)).first()).toBeVisible();
  await expect(page.getByText(formatCurrency(cashflow.netCash)).first()).toBeVisible();
  await expect(page.getByText(formatCurrency((remainingJson.meta?.summary || {}).totalRemaining || 0)).first()).toBeVisible();

  await page.getByRole('button', { name: 'POS Hareketleri' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(formatCurrency((posJson.meta?.summary || {}).totalVolume || 0)).first()).toBeVisible();
  await expect(page.getByText(String((posJson.meta?.summary || {}).failCount || 0), { exact: true }).first()).toBeVisible();
});
