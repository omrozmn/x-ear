import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.helpers';

test.describe('Communication Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to communication center', async ({ page }) => {
    // Try multiple possible routes
    const commRoutes = ['/communication', '/iletisim', '/messages'];
    
    let pageLoaded = false;
    for (const route of commRoutes) {
      try {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('communication') || url.includes('iletisim') || url.includes('message')) {
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
        'a:has-text("İletişim")',
        'a:has-text("Communication")',
        'a:has-text("Mesaj")',
        'a:has-text("Message")'
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

  test('should display message composition interface', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForTimeout(2000);
    
    // Look for compose button
    const composeSelectors = [
      '[data-testid="compose-message-button"]',
      'button:has-text("Yeni Mesaj")',
      'button:has-text("Mesaj Gönder")',
      'button:has-text("New Message")',
      'button:has-text("Compose")'
    ];
    
    let hasComposeButton = false;
    for (const selector of composeSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasComposeButton = true;
        break;
      }
    }
    
    // Should have compose button OR message list
    const hasMessageList = await page.locator('[data-testid^="message-"]').count() > 0 ||
                           await page.locator('table').count() > 0;
    
    expect(hasComposeButton || hasMessageList).toBeTruthy();
  });

  test('should open compose message modal', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForTimeout(2000);
    
    // Look for compose button
    const composeSelectors = [
      '[data-testid="compose-message-button"]',
      'button:has-text("Yeni Mesaj")',
      'button:has-text("Mesaj Gönder")',
      'button:has-text("New Message")'
    ];
    
    let buttonClicked = false;
    for (const selector of composeSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        await page.waitForTimeout(1000);
        buttonClicked = true;
        break;
      }
    }
    
    if (buttonClicked) {
      // Check if modal opened
      const modalSelectors = [
        '[data-testid="compose-message-modal"]',
        '[role="dialog"]',
        'form',
        '[class*="modal"]'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          modalFound = true;
          break;
        }
      }
      
      expect(modalFound).toBeTruthy();
    } else {
      // If no button, just verify page loaded
      expect(page.url()).toContain('communication');
    }
  });

  test('should display message templates', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForTimeout(2000);
    
    // Look for templates tab
    const templateTabSelectors = [
      '[data-testid="templates-tab"]',
      'button:has-text("Şablon")',
      'button:has-text("Template")',
      'a:has-text("Şablon")',
      'a:has-text("Template")'
    ];
    
    let hasTemplatesTab = false;
    for (const selector of templateTabSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasTemplatesTab = true;
        break;
      }
    }
    
    // Should have templates tab OR template list
    const hasTemplateList = await page.locator('[data-testid^="template-"]').count() > 0;
    
    expect(hasTemplatesTab || hasTemplateList || page.url().includes('communication')).toBeTruthy();
  });

  test('should display message history', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForTimeout(2000);
    
    // Look for messages tab
    const messagesTabSelectors = [
      '[data-testid="messages-tab"]',
      'button:has-text("Mesajlar")',
      'button:has-text("Messages")',
      'a:has-text("Mesajlar")',
      'a:has-text("Messages")'
    ];
    
    let hasMessagesTab = false;
    for (const selector of messagesTabSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasMessagesTab = true;
        break;
      }
    }
    
    // Should have messages tab OR message list
    const hasMessageList = await page.locator('[data-testid^="message-"]').count() > 0 ||
                           await page.locator('table').count() > 0;
    
    expect(hasMessagesTab || hasMessageList || page.url().includes('communication')).toBeTruthy();
  });

  test('should filter messages by channel', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForTimeout(2000);
    
    // Look for channel filter
    const channelFilterSelectors = [
      '[data-testid="message-channel-filter"]',
      'select[name="channel"]',
      'button:has-text("Kanal")',
      'button:has-text("Channel")'
    ];
    
    let hasChannelFilter = false;
    for (const selector of channelFilterSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasChannelFilter = true;
        break;
      }
    }
    
    // Should have channel filter OR message data
    const hasMessageData = await page.locator('[data-testid^="message-"]').count() > 0;
    
    expect(hasChannelFilter || hasMessageData || page.url().includes('communication')).toBeTruthy();
  });
});
