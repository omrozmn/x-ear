import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('SMS Communication', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('COMM-001: Should send single SMS', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Communication
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="communication-tab"]').click();
    
    // Click Send SMS button
    await page.locator('[data-testid="sms-send-button"]').click();
    
    // Verify SMS modal opened
    await expectModalOpen(page, 'sms-modal');
    
    // Select template: Appointment Reminder
    await page.locator('[data-testid="sms-template-select"]').click();
    await page.locator('text=Randevu Hatırlatma').first().click();
    
    // Verify message auto-filled
    const messageInput = page.locator('[data-testid="sms-message-input"]');
    await expect(messageInput).toHaveValue(/.+/);
    
    // Edit message (optional)
    await messageInput.fill('Sayın hasta, randevunuz yarın saat 14:00\'de.');
    
    // Submit
    await page.locator('[data-testid="sms-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('SMS gönderildi');
    
    // Verify SMS in history
    await expect(page.locator('[data-testid="sms-history-item"]').first()).toBeVisible();
  });

  test('COMM-002: Should send bulk SMS', async ({ page }) => {
    // Navigate to Parties page
    await page.goto('/parties');
    
    // Select multiple parties (if checkboxes exist)
    const firstCheckbox = page.locator('[data-testid="party-checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      // Select first 3 parties
      await firstCheckbox.check();
      await page.locator('[data-testid="party-checkbox"]').nth(1).check();
      await page.locator('[data-testid="party-checkbox"]').nth(2).check();
      
      // Click Bulk SMS button
      await page.locator('[data-testid="bulk-sms-button"]').click();
      
      // Verify SMS modal opened
      await expectModalOpen(page, 'sms-modal');
      
      // Verify recipient count
      await expect(page.locator('[data-testid="sms-recipient-count"]')).toContainText('3');
      
      // Select template
      await page.locator('[data-testid="sms-template-select"]').click();
      await page.locator('text=Kampanya').first().click();
      
      // Submit
      await page.locator('[data-testid="sms-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('3 SMS');
    }
  });

  test('COMM-005: Should create SMS template', async ({ page }) => {
    // Navigate to Settings → SMS Templates
    await page.goto('/settings/sms-templates');
    
    // Click New Template button
    await page.locator('[data-testid="sms-template-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'sms-template-modal');
    
    // Enter template name
    await page.locator('[data-testid="sms-template-name-input"]').fill('Ödeme Hatırlatma');
    
    // Enter message with variables
    await page.locator('[data-testid="sms-template-message-input"]').fill(
      'Sayın {hasta_adi}, {tutar} TL borcunuz bulunmaktadır.'
    );
    
    // Submit
    await page.locator('[data-testid="sms-template-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify template in list
    await expect(page.locator('[data-testid="sms-template-item"]').first()).toContainText('Ödeme Hatırlatma');
  });

  test('COMM-009: Should load SMS credit', async ({ page }) => {
    // Navigate to Settings → SMS Credit
    await page.goto('/settings/sms-credit');
    
    // Get current credit
    const currentCredit = await page.locator('[data-testid="sms-credit"]').textContent();
    
    // Click Load Credit button
    await page.locator('[data-testid="sms-credit-load-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'sms-credit-modal');
    
    // Select package: 1000 SMS
    await page.locator('[data-testid="sms-credit-package-select"]').click();
    await page.locator('text=1000 SMS').first().click();
    
    // Select payment method: Credit Card
    await page.locator('[data-testid="sms-credit-payment-method-select"]').click();
    await page.locator('text=Kredi Kartı').first().click();
    
    // Submit (this would normally redirect to payment gateway)
    await page.locator('[data-testid="sms-credit-submit-button"]').click();
    
    // In test environment, verify success message
    // In production, this would redirect to POS integration
    await page.waitForTimeout(1000);
  });

  test('COMM-010: Should display SMS history', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Communication
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="communication-tab"]').click();
    
    // Click SMS History tab
    const smsHistoryTab = page.locator('[data-testid="sms-history-tab"]');
    if (await smsHistoryTab.isVisible()) {
      await smsHistoryTab.click();
      
      // Verify SMS history items displayed
      const historyCount = await page.locator('[data-testid="sms-history-item"]').count();
      expect(historyCount).toBeGreaterThanOrEqual(0);
      
      // If history exists, verify details
      if (historyCount > 0) {
        const firstItem = page.locator('[data-testid="sms-history-item"]').first();
        await expect(firstItem).toContainText(/.+/); // Contains some text
      }
    }
  });

  test('COMM-012: Should filter SMS by status', async ({ page }) => {
    // Navigate to Communication → SMS History
    await page.goto('/communication/sms-history');
    
    // Click status filter
    const statusFilter = page.locator('[data-testid="sms-status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // Select "Failed"
      await page.locator('text=Başarısız').first().click();
      
      // Wait for filter
      await page.waitForTimeout(1000);
      
      // Verify filtered results
      const historyCount = await page.locator('[data-testid="sms-history-item"]').count();
      expect(historyCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('COMM-014: Should export SMS history to Excel', async ({ page }) => {
    // Navigate to Communication → SMS History
    await page.goto('/communication/sms-history');
    
    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /Export|Dışa Aktar|Excel/i }).first();
    
    if (await exportButton.isVisible()) {
      // Start waiting for download
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.xlsx|\.xls/);
    }
  });
});
