
import { test, expect } from '../fixtures/fixtures';
import { createTestParty, deleteTestParty } from './helpers/test-utils';

test.describe('Patient Reports Module', () => {
    let partyId: string;
    let authToken: string;

    test.beforeEach(async ({ tenantPage, request, authTokens }) => {
        // Create a temporary party for testing
        authToken = authTokens.accessToken;
        partyId = await createTestParty(request, authToken, {
            firstName: 'Report',
            lastName: 'Tester',
            phone: `+90555${Math.floor(1000000 + Math.random() * 9000000)}`
        });

        // Navigate to the party detail page
        await tenantPage.goto(`/parties/${partyId}`);
        await expect(tenantPage.getByRole('heading', { name: 'Report Tester' })).toBeVisible();
    });

    test.afterEach(async ({ request }) => {
        // Clean up
        if (partyId && authToken) {
            await deleteTestParty(request, authToken, partyId);
        }
    });

    test('should create a new Audiogram report', async ({ tenantPage }) => {
        // 1. Open "Create Report" modal
        // Usually accessed via "İşlemler" or a "+" button near Reports section.
        // Assuming a "Rapor Oluştur" or similar button exists, or we check the "Dosyalar/Raporlar" tab.

        // Let's assume there is a specific tab or button. Based on previous context, 
        // ReportModal exists. We need to find how to trigger it.
        // If not immediately visible, we might need to click a "Reports" tab.

        // Wait for page to stabilize
        await tenantPage.waitForLoadState('networkidle');

        // Look for "Raporlar" tab or button.
        // If it's inside the Party Detail view:
        const createReportBtn = tenantPage.getByRole('button', { name: /Rapor Oluştur/i });

        if (await createReportBtn.isVisible()) {
            await createReportBtn.click();
        } else {
            // Check for "İşlemler" dropdown
            const actionsBtn = tenantPage.getByRole('button', { name: /İşlemler/i });
            if (await actionsBtn.isVisible()) {
                await actionsBtn.click();
                await tenantPage.getByRole('menuitem', { name: /Rapor Oluştur/i }).click();
            } else {
                // If neither, maybe it's in a tab
                // This part might need adjustment based on actual UI
                console.log('Searching for Report button...');
            }
        }

        // 2. Select "Odyogram" type
        await expect(tenantPage.getByRole('dialog')).toBeVisible();
        await expect(tenantPage.getByText('Rapor Oluştur')).toBeVisible();

        // Select type 'Odyogram' (value='audiogram')
        // Using getByLabel or clicking the visual card if it's a card selection
        await tenantPage.getByText('Odyogram').click();

        // 3. Fill details
        const reportTitle = 'E2E Test Odyogram';
        await tenantPage.fill('input[name="title"]', reportTitle);
        // Notes might be optional
        await tenantPage.fill('textarea[name="notes"]', 'Otomatik test raporu');

        // 4. Save
        await tenantPage.getByRole('button', { name: /Oluştur/i }).click();

        // 5. Verify Toast
        await expect(tenantPage.getByText(/Rapor başarıyla oluşturuldu/i)).toBeVisible();

        // 6. Verify in list
        // Assuming there is a list of reports below
        await expect(tenantPage.getByText(reportTitle)).toBeVisible();
        await expect(tenantPage.getByText('Odyogram', { exact: true })).toBeVisible();
    });

    // TODO: Add tests for Battery/Device reports if UI differs
});
