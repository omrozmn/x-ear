
import { test, expect } from '../fixtures/fixtures';
import {
    createTestParty,
    deleteTestParty,
    login,
    setupAuthenticatedPage,
    waitForApiCall
} from './helpers/test-utils';

test.describe('Party Notes Module', () => {
    let partyId: string;
    let authTokens: any;

    test.beforeAll(async ({ request }) => {
        // Authenticate
        authTokens = await login(request);
    });

    test.beforeEach(async ({ page, request }) => {
        await setupAuthenticatedPage(page, authTokens);

        // Create a test party
        partyId = await createTestParty(request, authTokens.accessToken, {
            firstName: 'Note',
            lastName: 'Tester',
            phone: '+905559998877',
            email: 'note.tester@example.com'
        });

        // Navigate to the party detail page
        await page.goto(`/parties/${partyId}`);
        await expect(page.getByRole('heading', { name: 'Note Tester' })).toBeVisible();
    });

    test.afterEach(async ({ request }) => {
        if (partyId) {
            await deleteTestParty(request, authTokens.accessToken, partyId);
        }
    });

    test('should create and delete a party note', async ({ page }) => {
        const noteContent = `Test Note ${Date.now()}`;

        // 1. Switch to Notes Tab
        await page.getByRole('button', { name: 'Notlar' }).click();

        // Wait for the tab content to load
        await expect(page.getByRole('heading', { name: 'Hasta Notları' })).toBeVisible();

        // 2. Open Add Note Form
        // Get the specific button next to the heading
        const headerDiv = page.getByRole('heading', { name: 'Hasta Notları' }).locator('xpath=..');
        await headerDiv.getByRole('button', { name: 'Not Ekle' }).click();
        await expect(page.getByRole('heading', { name: 'Yeni Not' })).toBeVisible();

        // 3. Fill and Save Note
        await page.getByPlaceholder('Not içeriğini yazınız...').fill(noteContent);
        await page.getByRole('button', { name: 'Kaydet' }).click();

        // 4. Verify Creation - wait for success toast first
        await expect(page.getByText('Not başarıyla eklendi')).toBeVisible({ timeout: 10000 });
        // Then verify note content appears in the list
        await expect(page.getByText(noteContent).first()).toBeVisible({ timeout: 10000 });

        // 5. Delete Note
        // Note card structure: div.bg-white contains <p>{note.text}</p> and buttons with Edit/Trash2 icons
        // The delete button has class text-red-600
        const noteCard = page.locator('div.bg-white').filter({ hasText: noteContent }).first();
        const deleteButton = noteCard.locator('button.text-red-600').first();
        await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
        await deleteButton.click();

        // 6. Verify deletion
        await expect(page.getByText('Not başarıyla silindi')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(noteContent)).not.toBeVisible();
    });
});
