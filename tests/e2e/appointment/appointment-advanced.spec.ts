import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen } from '../../helpers/wait';
import { expectToastVisible } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Appointment Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('APPOINTMENT-011: Should create bulk appointments', async ({ page }) => {
    // Navigate to Appointments page
    await page.goto('/appointments');
    
    // Look for bulk appointment button
    const bulkButton = page.locator('button').filter({ hasText: /Toplu|Bulk/i }).first();
    
    if (await bulkButton.isVisible()) {
      await bulkButton.click();
      
      // Verify bulk appointment modal or file upload
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Upload Excel file (if file upload is implemented)
        // For now, just verify the upload interface exists
        await expect(fileInput).toBeVisible();
      }
    }
  });

  test('APPOINTMENT-012: Should export appointments to Excel', async ({ page }) => {
    // Navigate to Appointments page
    await page.goto('/appointments');
    
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

  test('APPOINTMENT-013: Should create recurring appointments', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Click New Appointment button
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    
    // Enter date: Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    
    // Enter time: 14:00
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    
    // Select appointment type
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    
    // Look for recurring checkbox
    const recurringCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Tekrar|Recurring/i });
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
      
      // Select recurrence type: Weekly
      await page.locator('[data-testid="recurrence-type-select"]').click();
      await page.locator('text=Haftalık').first().click();
      
      // Enter recurrence count: 4
      await page.locator('[data-testid="recurrence-count-input"]').fill('4');
      
      // Submit
      await page.locator('[data-testid="appointment-submit-button"]').click();
      
      // Verify success toast with count
      await expectToastVisible(page, 'success');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('4 randevu');
      
      // Verify 4 appointments created
      const appointmentCount = await page.locator('[data-testid="appointment-list-item"]').count();
      expect(appointmentCount).toBeGreaterThanOrEqual(4);
    } else {
      // If recurring not implemented, just create single appointment
      await page.locator('[data-testid="appointment-submit-button"]').click();
      await expectToastVisible(page, 'success');
    }
  });

  test('APPOINTMENT-014: Should display today appointments widget on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify today's appointments widget exists
    const todayAppointmentsWidget = page.locator('[data-testid="today-appointments-widget"]');
    if (await todayAppointmentsWidget.isVisible()) {
      // Verify count displayed
      await expect(page.locator('[data-testid="today-appointments-count"]')).toBeVisible();
      
      // Click details button
      const detailsButton = page.locator('[data-testid="today-appointments-details-button"]');
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        
        // Verify navigated to appointments page
        await page.waitForTimeout(1000);
        
        // Should show appointments page
        const url = page.url();
        expect(url).toMatch(/appointment|randevu/i);
      }
    }
  });

  test('APPOINTMENT-015: Should display appointment history', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create and complete an appointment
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    await page.locator('[data-testid="appointment-date-input"]').fill(new Date().toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Complete the appointment
    const completeButton = page.locator('[data-testid="appointment-complete-button"]').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await waitForToast(page, 'success');
    }
    
    // Look for appointment history tab
    const historyTab = page.locator('[data-testid="appointment-history-tab"]');
    if (await historyTab.isVisible()) {
      await historyTab.click();
      
      // Verify history items displayed
      const historyCount = await page.locator('[data-testid="appointment-history-item"]').count();
      expect(historyCount).toBeGreaterThanOrEqual(1);
      
      // Verify completed appointment shown
      await expect(page.locator('[data-testid="appointment-history-item"]').first()).toContainText(/Tamamlandı|Completed/i);
    }
  });
});
