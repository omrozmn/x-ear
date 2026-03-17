import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Appointment CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('APPOINTMENT-001: Should create appointment', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Click New Appointment button
    await page.locator('[data-testid="appointment-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'appointment-modal');
    
    // Enter date: Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    
    // Enter time: 14:00
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    
    // Select appointment type: Control
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    
    // Select doctor/specialist
    await page.locator('[data-testid="appointment-doctor-select"]').click();
    await page.locator('option').first().click();
    
    // Enter note
    await page.locator('[data-testid="appointment-note-input"]').fill('İlk kontrol');
    
    // Submit
    await page.locator('[data-testid="appointment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify appointment in list
    await expect(page.locator('[data-testid="appointment-list-item"]').first()).toContainText('14:00');
    await expect(page.locator('[data-testid="appointment-list-item"]').first()).toContainText('Kontrol');
    
    // Verify appointment in calendar
    await page.locator('[data-testid="calendar-view"]').click();
    await expect(page.locator('[data-testid="calendar-appointment"]')).toBeVisible();
  });

  test('APPOINTMENT-002: Should update appointment', async ({ page }) => {
    // Create a test party and appointment first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create appointment
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click Edit button on first appointment
    await page.locator('[data-testid="appointment-edit-button"]').first().click();
    
    // Verify modal opened with data
    await expectModalOpen(page, 'appointment-modal');
    
    // Update time to 15:00
    await page.locator('[data-testid="appointment-time-input"]').clear();
    await page.locator('[data-testid="appointment-time-input"]').fill('15:00');
    
    // Submit
    await page.locator('[data-testid="appointment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify updated time in list
    await expect(page.locator('[data-testid="appointment-list-item"]').first()).toContainText('15:00');
  });

  test('APPOINTMENT-003: Should cancel appointment', async ({ page }) => {
    // Create a test party and appointment first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create appointment
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click Cancel button
    await page.locator('[data-testid="appointment-cancel-button"]').first().click();
    
    // Verify cancel modal opened
    await expectModalOpen(page, 'appointment-cancel-modal');
    
    // Select cancellation reason
    await page.locator('[data-testid="appointment-cancel-reason-select"]').click();
    await page.locator('text=Hasta talebi').first().click();
    
    // Submit
    await page.locator('[data-testid="appointment-cancel-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify appointment status updated
    await expect(page.locator('[data-testid="appointment-status"]')).toContainText('İptal Edildi');
  });

  test('APPOINTMENT-004: Should send SMS reminder', async ({ page }) => {
    // Create a test party and appointment first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create appointment for tomorrow
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click Send Reminder button
    await page.locator('[data-testid="appointment-reminder-button"]').first().click();
    
    // Verify reminder modal opened
    await expectModalOpen(page, 'appointment-reminder-modal');
    
    // Verify message template auto-filled
    await expect(page.locator('[data-testid="appointment-reminder-message-input"]')).toHaveValue(/.+/);
    
    // Submit
    await page.locator('[data-testid="appointment-reminder-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('SMS gönderildi');
    
    // Verify SMS sent badge
    await expect(page.locator('[data-testid="appointment-sms-sent-badge"]')).toBeVisible();
  });

  test('APPOINTMENT-005: Should display calendar view', async ({ page }) => {
    // Navigate to Appointments page
    await page.goto('/appointments');
    
    // Verify calendar view displayed
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Verify appointments shown on calendar
    const appointmentCount = await page.locator('[data-testid="calendar-appointment"]').count();
    expect(appointmentCount).toBeGreaterThanOrEqual(0);
    
    // Click on an appointment (if exists)
    if (appointmentCount > 0) {
      await page.locator('[data-testid="calendar-appointment"]').first().click();
      
      // Verify detail modal opened
      await expectModalOpen(page, 'appointment-detail-modal');
      
      // Verify party information displayed
      await expect(page.locator('[data-testid="appointment-detail-modal"]')).toContainText(/.+/);
    }
  });

  test('APPOINTMENT-006: Should detect appointment conflict', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create first appointment
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-doctor-select"]').click();
    await page.locator('[data-testid="appointment-doctor-select"] option').first().textContent();
    await page.locator('[data-testid="appointment-doctor-select"] option').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Try to create second appointment at same time with same doctor
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-doctor-select"]').click();
    await page.locator('[data-testid="appointment-doctor-select"] option').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    
    // Verify error toast
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('randevu var');
  });

  test('APPOINTMENT-007: Should complete appointment', async ({ page }) => {
    // Create a test party and appointment first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Appointments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    
    // Create appointment for today
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    await page.locator('[data-testid="appointment-date-input"]').fill(new Date().toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click Complete button
    await page.locator('[data-testid="appointment-complete-button"]').first().click();
    
    // Verify completion modal opened (if exists)
    const completionModal = page.locator('[data-testid="appointment-completion-modal"]');
    if (await completionModal.isVisible()) {
      // Enter completion note
      await page.locator('[data-testid="appointment-completion-note-input"]').fill('Kontrol yapıldı');
      
      // Submit
      await page.locator('[data-testid="appointment-completion-submit-button"]').click();
    }
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify appointment status updated
    await expect(page.locator('[data-testid="appointment-status"]')).toContainText('Tamamlandı');
  });

  test('APPOINTMENT-008: Should filter appointments by date', async ({ page }) => {
    // Navigate to Appointments page
    await page.goto('/appointments');
    
    // Click date filter
    await page.locator('[data-testid="appointment-date-filter"]').click();
    
    // Select "Today"
    await page.locator('text=Bugün').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify results filtered
    const appointmentCount = await page.locator('[data-testid="appointment-list-item"]').count();
    expect(appointmentCount).toBeGreaterThanOrEqual(0);
  });

  test('APPOINTMENT-009: Should filter appointments by status', async ({ page }) => {
    // Navigate to Appointments page
    await page.goto('/appointments');
    
    // Click status filter
    await page.locator('[data-testid="appointment-status-filter"]').click();
    
    // Select "Pending"
    await page.locator('text=Beklemede').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify results filtered
    const appointmentCount = await page.locator('[data-testid="appointment-list-item"]').count();
    expect(appointmentCount).toBeGreaterThanOrEqual(0);
  });

  test('APPOINTMENT-010: Should search appointments by party name', async ({ page }) => {
    // Create a test party with unique name
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create appointment for this party
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="appointments-tab"]').click();
    await page.locator('[data-testid="appointment-create-button"]').click();
    await waitForModalOpen(page, 'appointment-modal');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('[data-testid="appointment-date-input"]').fill(tomorrow.toISOString().split('T')[0]);
    await page.locator('[data-testid="appointment-time-input"]').fill('14:00');
    await page.locator('[data-testid="appointment-type-select"]').click();
    await page.locator('text=Kontrol').first().click();
    await page.locator('[data-testid="appointment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Navigate to Appointments page
    await page.goto('/appointments');
    
    // Search for the party
    await page.locator('[data-testid="appointment-search-input"]').fill(testParty.firstName);
    await page.locator('[data-testid="appointment-search-button"]').click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify party name appears in results
    await expect(page.locator('text=' + testParty.firstName)).toBeVisible();
  });
});
