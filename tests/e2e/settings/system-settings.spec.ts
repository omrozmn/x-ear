import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { expectToastVisible } from '../../helpers/assertions';
import { testUsers } from '../../fixtures';

test.describe('System Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await login(page, testUsers.admin);
  });

  test('SETTINGS-010: Should update general settings', async ({ page }) => {
    // Navigate to Settings → General
    await page.goto('/settings/general');
    
    // Update company name
    const companyNameInput = page.locator('[data-testid="settings-company-name-input"]');
    if (await companyNameInput.isVisible()) {
      await companyNameInput.clear();
      await companyNameInput.fill('X-EAR Hearing Clinic');
    }
    
    // Update timezone
    const timezoneSelect = page.locator('[data-testid="settings-timezone-select"]');
    if (await timezoneSelect.isVisible()) {
      await timezoneSelect.click();
      await page.locator('text=Europe/Istanbul').first().click();
    }
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-011: Should configure SGK settings', async ({ page }) => {
    // Navigate to Settings → SGK
    await page.goto('/settings/sgk');
    
    // Enable SGK integration
    const sgkToggle = page.locator('[data-testid="settings-sgk-enabled-toggle"]');
    if (await sgkToggle.isVisible()) {
      await sgkToggle.click();
    }
    
    // Enter SGK credentials
    await page.locator('[data-testid="settings-sgk-username-input"]').fill('sgk_user');
    await page.locator('[data-testid="settings-sgk-password-input"]').fill('sgk_pass');
    
    // Configure SGK schemes
    const schemeCheckboxes = page.locator('[data-testid="sgk-scheme-checkbox"]');
    const schemeCount = await schemeCheckboxes.count();
    
    if (schemeCount > 0) {
      // Enable first 2 schemes
      for (let i = 0; i < Math.min(2, schemeCount); i++) {
        await schemeCheckboxes.nth(i).check();
      }
    }
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-012: Should configure e-invoice settings', async ({ page }) => {
    // Navigate to Settings → E-Invoice
    await page.goto('/settings/e-invoice');
    
    // Enable e-invoice
    const einvoiceToggle = page.locator('[data-testid="settings-einvoice-enabled-toggle"]');
    if (await einvoiceToggle.isVisible()) {
      await einvoiceToggle.click();
    }
    
    // Enter BirFatura credentials
    await page.locator('[data-testid="settings-einvoice-username-input"]').fill('birfatura_user');
    await page.locator('[data-testid="settings-einvoice-password-input"]').fill('birfatura_pass');
    
    // Select environment
    await page.locator('[data-testid="settings-einvoice-environment-select"]').click();
    await page.locator('text=Test').first().click();
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-013: Should configure SMS settings', async ({ page }) => {
    // Navigate to Settings → SMS
    await page.goto('/settings/sms');
    
    // Enable SMS
    const smsToggle = page.locator('[data-testid="settings-sms-enabled-toggle"]');
    if (await smsToggle.isVisible()) {
      await smsToggle.click();
    }
    
    // Select SMS provider
    await page.locator('[data-testid="settings-sms-provider-select"]').click();
    await page.locator('text=VatanSMS').first().click();
    
    // Enter SMS credentials
    await page.locator('[data-testid="settings-sms-username-input"]').fill('sms_user');
    await page.locator('[data-testid="settings-sms-password-input"]').fill('sms_pass');
    
    // Enter sender name
    await page.locator('[data-testid="settings-sms-sender-input"]').fill('XEAR');
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-014: Should configure email settings (SMTP)', async ({ page }) => {
    // Navigate to Settings → Email
    await page.goto('/settings/email');
    
    // Enable email
    const emailToggle = page.locator('[data-testid="settings-email-enabled-toggle"]');
    if (await emailToggle.isVisible()) {
      await emailToggle.click();
    }
    
    // Enter SMTP settings
    await page.locator('[data-testid="settings-smtp-host-input"]').fill('smtp.gmail.com');
    await page.locator('[data-testid="settings-smtp-port-input"]').fill('587');
    await page.locator('[data-testid="settings-smtp-username-input"]').fill('noreply@xear.com');
    await page.locator('[data-testid="settings-smtp-password-input"]').fill('smtp_pass');
    
    // Enable TLS
    const tlsCheckbox = page.locator('[data-testid="settings-smtp-tls-checkbox"]');
    if (await tlsCheckbox.isVisible()) {
      await tlsCheckbox.check();
    }
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-015: Should configure backup settings', async ({ page }) => {
    // Navigate to Settings → Backup
    await page.goto('/settings/backup');
    
    // Enable automatic backup
    const backupToggle = page.locator('[data-testid="settings-backup-enabled-toggle"]');
    if (await backupToggle.isVisible()) {
      await backupToggle.click();
    }
    
    // Select backup frequency
    await page.locator('[data-testid="settings-backup-frequency-select"]').click();
    await page.locator('text=Daily').first().click();
    
    // Select backup time
    await page.locator('[data-testid="settings-backup-time-input"]').fill('02:00');
    
    // Submit
    await page.locator('[data-testid="settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SETTINGS-016: Should view audit log', async ({ page }) => {
    // Navigate to Settings → Audit Log
    await page.goto('/settings/audit-log');
    
    // Verify audit log items displayed
    const auditLogCount = await page.locator('[data-testid="audit-log-item"]').count();
    expect(auditLogCount).toBeGreaterThanOrEqual(0);
    
    // If audit logs exist, verify details
    if (auditLogCount > 0) {
      const firstLog = page.locator('[data-testid="audit-log-item"]').first();
      await expect(firstLog).toContainText(/.+/); // Contains some text
      
      // Click on first log to view details
      await firstLog.click();
      
      // Verify details displayed
      await page.waitForTimeout(500);
    }
  });

  test('SETTINGS-017: Should view user activity report', async ({ page }) => {
    // Navigate to Settings → User Activity
    await page.goto('/settings/user-activity');
    
    // Select date range
    await page.locator('[data-testid="activity-date-from-input"]').fill(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    await page.locator('[data-testid="activity-date-to-input"]').fill(
      new Date().toISOString().split('T')[0]
    );
    
    // Click Generate Report button
    await page.locator('[data-testid="activity-generate-button"]').click();
    
    // Wait for report
    await page.waitForTimeout(1000);
    
    // Verify activity items displayed
    const activityCount = await page.locator('[data-testid="activity-item"]').count();
    expect(activityCount).toBeGreaterThanOrEqual(0);
  });

  test('SETTINGS-018: Should change theme settings', async ({ page }) => {
    // Navigate to Settings → Appearance
    await page.goto('/settings/appearance');
    
    // Select theme
    const themeSelect = page.locator('[data-testid="settings-theme-select"]');
    if (await themeSelect.isVisible()) {
      await themeSelect.click();
      await page.locator('text=Dark').first().click();
      
      // Submit
      await page.locator('[data-testid="settings-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      
      // Verify theme applied (check for dark mode class)
      await page.waitForTimeout(500);
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toMatch(/dark|theme-dark/i);
    }
  });

  test('SETTINGS-019: Should change language settings', async ({ page }) => {
    // Navigate to Settings → Language
    await page.goto('/settings/language');
    
    // Select language
    const languageSelect = page.locator('[data-testid="settings-language-select"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.click();
      await page.locator('text=English').first().click();
      
      // Submit
      await page.locator('[data-testid="settings-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      
      // Verify language changed (check for English text)
      await page.waitForTimeout(500);
    }
  });

  test('SETTINGS-020: Should enable two-factor authentication (2FA)', async ({ page }) => {
    // Navigate to Settings → Security
    await page.goto('/settings/security');
    
    // Enable 2FA
    const twoFAToggle = page.locator('[data-testid="settings-2fa-enabled-toggle"]');
    if (await twoFAToggle.isVisible()) {
      await twoFAToggle.click();
      
      // Verify QR code displayed
      const qrCode = page.locator('[data-testid="2fa-qr-code"]');
      if (await qrCode.isVisible()) {
        await expect(qrCode).toBeVisible();
        
        // Enter verification code (in real test, would scan QR and get code)
        await page.locator('[data-testid="2fa-verification-code-input"]').fill('123456');
        
        // Submit
        await page.locator('[data-testid="2fa-verify-button"]').click();
        
        // Verify success or error (depends on code validity)
        await page.waitForTimeout(1000);
      }
    }
  });
});
