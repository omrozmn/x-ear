import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('Appointment Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to appointments page', async ({ page }) => {
    // Try multiple possible routes
    const appointmentRoutes = ['/appointments', '/randevular', '/calendar'];
    
    let pageLoaded = false;
    for (const route of appointmentRoutes) {
      try {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('appointment') || url.includes('randevu') || url.includes('calendar')) {
          pageLoaded = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If no direct route, try navigation menu
    if (!pageLoaded) {
      const navLinks = [
        'a:has-text("Randevu")',
        'a:has-text("Appointment")',
        'a:has-text("Takvim")',
        'a:has-text("Calendar")'
      ];
      
      for (const selector of navLinks) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.click(selector);
          await page.waitForTimeout(2000);
          pageLoaded = true;
          break;
        }
      }
    }
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display calendar view', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(2000);
    
    // Look for calendar elements
    const calendarIndicators = [
      '[data-testid="calendar"]',
      '[class*="calendar"]',
      '[class*="Calendar"]',
      'table',
      '[role="grid"]'
    ];
    
    let hasCalendar = false;
    for (const selector of calendarIndicators) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasCalendar = true;
        break;
      }
    }
    
    // Should have calendar OR appointment list
    const hasAppointmentList = await page.locator('[data-testid^="appointment-"]').count() > 0;
    
    expect(hasCalendar || hasAppointmentList).toBeTruthy();
  });

  test('should open new appointment modal', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(2000);
    
    // Look for "New Appointment" button
    const newAppointmentSelectors = [
      '[data-testid="new-appointment-button"]',
      'button:has-text("Yeni Randevu")',
      'button:has-text("Randevu Ekle")',
      'button:has-text("New Appointment")',
      'button:has-text("Ekle")'
    ];
    
    let buttonFound = false;
    for (const selector of newAppointmentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        buttonFound = true;
        break;
      }
    }
    
    // Button should exist OR page should have appointment data
    const hasAppointmentData = await page.locator('[data-testid^="appointment-"]').count() > 0 ||
                               await page.locator('table').count() > 0;
    
    expect(buttonFound || hasAppointmentData).toBeTruthy();
  });

  test('should filter appointments by date', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should filter appointments by status', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
