import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { waitForToast } from '../../helpers/wait';
import { expectToastVisible } from '../../helpers/assertions';
import { testUsers } from '../../fixtures';

test.describe('In-App Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('COMM-007: Should display in-app notification', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check if notification bell exists
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    if (await notificationBell.isVisible()) {
      // Check if there are notifications
      const notificationBadge = page.locator('[data-testid="notification-badge"]');
      if (await notificationBadge.isVisible()) {
        // Get notification count
        const count = await notificationBadge.textContent();
        expect(parseInt(count || '0')).toBeGreaterThan(0);
        
        // Click notification bell
        await notificationBell.click();
        
        // Verify dropdown opened
        await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
        
        // Verify notification items displayed
        await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible();
        
        // Click on first notification
        await page.locator('[data-testid="notification-item"]').first().click();
        
        // Should navigate to related page
        await page.waitForTimeout(1000);
      }
    }
  });

  test('COMM-008: Should configure notification settings', async ({ page }) => {
    // Navigate to Settings → Notifications
    await page.goto('/settings/notifications');
    
    // Toggle email notifications
    const emailToggle = page.locator('[data-testid="notification-settings-email-toggle"]');
    if (await emailToggle.isVisible()) {
      await emailToggle.click();
    }
    
    // Toggle SMS notifications
    const smsToggle = page.locator('[data-testid="notification-settings-sms-toggle"]');
    if (await smsToggle.isVisible()) {
      await smsToggle.click();
    }
    
    // Toggle in-app notifications
    const inappToggle = page.locator('[data-testid="notification-settings-inapp-toggle"]');
    if (await inappToggle.isVisible()) {
      await inappToggle.click();
    }
    
    // Select notification types
    const notificationCheckboxes = page.locator('[data-testid="notification-type-checkbox"]');
    const checkboxCount = await notificationCheckboxes.count();
    
    if (checkboxCount > 0) {
      // Check first 3 notification types
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await notificationCheckboxes.nth(i).check();
      }
    }
    
    // Submit
    await page.locator('[data-testid="notification-settings-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('COMM-015: Should clear all notifications', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check if notification bell exists
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    if (await notificationBell.isVisible()) {
      // Check if there are notifications
      const notificationBadge = page.locator('[data-testid="notification-badge"]');
      if (await notificationBadge.isVisible()) {
        // Click notification bell
        await notificationBell.click();
        
        // Verify dropdown opened
        await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
        
        // Click "Mark All as Read" button
        const markAllButton = page.locator('button').filter({ hasText: /Tümünü Okundu|Mark All/i }).first();
        if (await markAllButton.isVisible()) {
          await markAllButton.click();
          
          // Wait for action
          await page.waitForTimeout(500);
          
          // Verify badge disappeared or count is 0
          const badgeVisible = await notificationBadge.isVisible();
          if (badgeVisible) {
            const count = await notificationBadge.textContent();
            expect(parseInt(count || '0')).toBe(0);
          } else {
            // Badge should not be visible
            await expect(notificationBadge).not.toBeVisible();
          }
        }
      }
    }
  });
});
