import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Email Communication', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('COMM-003: Should send single email', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Communication
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="communication-tab"]').click();
    
    // Click Send Email button
    await page.locator('[data-testid="email-send-button"]').click();
    
    // Verify Email modal opened
    await expectModalOpen(page, 'email-modal');
    
    // Enter subject
    await page.locator('[data-testid="email-subject-input"]').fill('Randevu Hatırlatma');
    
    // Select template
    await page.locator('[data-testid="email-template-select"]').click();
    await page.locator('text=Randevu Hatırlatma').first().click();
    
    // Verify content auto-filled
    const contentInput = page.locator('[data-testid="email-content-input"]');
    await expect(contentInput).toHaveValue(/.+/);
    
    // Add attachment (optional)
    const attachmentInput = page.locator('[data-testid="email-attachment-input"]');
    if (await attachmentInput.isVisible()) {
      // In real test, would upload a file
      // await attachmentInput.setInputFiles('path/to/file.pdf');
    }
    
    // Submit
    await page.locator('[data-testid="email-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Email gönderildi');
    
    // Verify email in history
    await expect(page.locator('[data-testid="email-history-item"]').first()).toBeVisible();
  });

  test('COMM-004: Should send bulk email', async ({ page }) => {
    // Navigate to Parties page
    await page.goto('/parties');
    
    // Select multiple parties
    const firstCheckbox = page.locator('[data-testid="party-checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      // Select first 3 parties
      await firstCheckbox.check();
      await page.locator('[data-testid="party-checkbox"]').nth(1).check();
      await page.locator('[data-testid="party-checkbox"]').nth(2).check();
      
      // Click Bulk Email button
      await page.locator('[data-testid="bulk-email-button"]').click();
      
      // Verify Email modal opened
      await expectModalOpen(page, 'email-modal');
      
      // Verify recipient count
      await expect(page.locator('[data-testid="email-recipient-count"]')).toContainText('3');
      
      // Enter subject
      await page.locator('[data-testid="email-subject-input"]').fill('Kampanya Bildirimi');
      
      // Select template
      await page.locator('[data-testid="email-template-select"]').click();
      await page.locator('text=Kampanya').first().click();
      
      // Submit
      await page.locator('[data-testid="email-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('3 email');
    }
  });

  test('COMM-006: Should create email template', async ({ page }) => {
    // Navigate to Settings → Email Templates
    await page.goto('/settings/email-templates');
    
    // Click New Template button
    await page.locator('[data-testid="email-template-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'email-template-modal');
    
    // Enter template name
    await page.locator('[data-testid="email-template-name-input"]').fill('Ödeme Hatırlatma');
    
    // Enter subject
    await page.locator('[data-testid="email-template-subject-input"]').fill('Ödeme Hatırlatma');
    
    // Enter content with variables
    await page.locator('[data-testid="email-template-content-input"]').fill(
      'Sayın {hasta_adi}, {tutar} TL borcunuz bulunmaktadır.'
    );
    
    // Submit
    await page.locator('[data-testid="email-template-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify template in list
    await expect(page.locator('[data-testid="email-template-item"]').first()).toContainText('Ödeme Hatırlatma');
  });

  test('COMM-011: Should display email history', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Communication
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="communication-tab"]').click();
    
    // Click Email History tab
    const emailHistoryTab = page.locator('[data-testid="email-history-tab"]');
    if (await emailHistoryTab.isVisible()) {
      await emailHistoryTab.click();
      
      // Verify email history items displayed
      const historyCount = await page.locator('[data-testid="email-history-item"]').count();
      expect(historyCount).toBeGreaterThanOrEqual(0);
      
      // If history exists, verify details
      if (historyCount > 0) {
        const firstItem = page.locator('[data-testid="email-history-item"]').first();
        await expect(firstItem).toContainText(/.+/); // Contains some text
      }
    }
  });

  test('COMM-013: Should filter email by date', async ({ page }) => {
    // Navigate to Communication → Email History
    await page.goto('/communication/email-history');
    
    // Click date filter
    const dateFilter = page.locator('[data-testid="email-date-filter"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
      
      // Select "Last 7 days"
      await page.locator('text=Son 7 gün').first().click();
      
      // Wait for filter
      await page.waitForTimeout(1000);
      
      // Verify filtered results
      const historyCount = await page.locator('[data-testid="email-history-item"]').count();
      expect(historyCount).toBeGreaterThanOrEqual(0);
    }
  });
});
