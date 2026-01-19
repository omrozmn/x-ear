import { test, expect, Page } from '@playwright/test';

// Test data
const testParty = {
  name: 'Test Hasta',
  phone: '+905551234567',
  email: 'test@example.com'
};

const testTemplate = {
  name: 'Test Şablonu',
  subject: 'Test Konusu',
  content: 'Merhaba {partyName}, randevunuz {appointmentDate} tarihinde planlanmıştır.',
  type: 'email' as const
};

const testMessage = {
  subject: 'Test Mesajı',
  content: 'Bu bir test mesajıdır.',
  channel: 'email' as const
};

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'admin@test.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
}

async function navigateToCommunicationCenter(page: Page) {
  await page.click('[data-testid="communication-menu"]');
  await expect(page).toHaveURL('/communication');
  await expect(page.locator('h1')).toContainText('İletişim Merkezi');
}

async function createTestTemplate(page: Page) {
  // Navigate to templates tab
  await page.click('[data-testid="templates-tab"]');
  
  // Click create template button
  await page.click('[data-testid="create-template-button"]');
  
  // Fill template form
  await page.fill('[data-testid="template-name-input"]', testTemplate.name);
  await page.selectOption('[data-testid="template-type-select"]', testTemplate.type);
  await page.fill('[data-testid="template-subject-input"]', testTemplate.subject);
  await page.fill('[data-testid="template-content-textarea"]', testTemplate.content);
  
  // Save template
  await page.click('[data-testid="save-template-button"]');
  
  // Verify template was created
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  await expect(page.locator(`text=${testTemplate.name}`)).toBeVisible();
}

test.describe('Communication Center E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToCommunicationCenter(page);
  });

  test.describe('Message Composition and Sending', () => {
    test('should compose and send an email message', async ({ page }) => {
      // Click compose message button
      await page.click('[data-testid="compose-message-button"]');
      
      // Verify compose modal is open
      await expect(page.locator('[data-testid="compose-message-modal"]')).toBeVisible();
      
      // Select email channel
      await page.selectOption('[data-testid="message-channel-select"]', 'email');
      
      // Fill message form
      await page.fill('[data-testid="message-subject-input"]', testMessage.subject);
      await page.fill('[data-testid="message-content-textarea"]', testMessage.content);
      
      // Select recipients
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      
      // Send message
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message was sent
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Mesaj başarıyla gönderildi');
      
      // Verify message appears in sent messages
      await page.click('[data-testid="messages-tab"]');
      await expect(page.locator(`text=${testMessage.subject}`)).toBeVisible();
    });

    test('should compose and send an SMS message', async ({ page }) => {
      // Click compose message button
      await page.click('[data-testid="compose-message-button"]');
      
      // Select SMS channel
      await page.selectOption('[data-testid="message-channel-select"]', 'sms');
      
      // Fill SMS content (no subject for SMS)
      await page.fill('[data-testid="message-content-textarea"]', 'Test SMS mesajı');
      
      // Select recipients
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      
      // Send message
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message was sent
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      
      // Verify message appears in sent messages
      await page.click('[data-testid="messages-tab"]');
      await expect(page.locator('text=Test SMS mesajı')).toBeVisible();
    });

    test('should validate required fields before sending', async ({ page }) => {
      // Click compose message button
      await page.click('[data-testid="compose-message-button"]');
      
      // Try to send without filling required fields
      await page.click('[data-testid="send-message-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="content-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="recipients-error"]')).toBeVisible();
    });
  });

  test.describe('Template Management', () => {
    test('should create a new email template', async ({ page }) => {
      await createTestTemplate(page);
    });

    test('should edit an existing template', async ({ page }) => {
      // First create a template
      await createTestTemplate(page);
      
      // Click edit button for the template
      await page.click(`[data-testid="edit-template-${testTemplate.name}"]`);
      
      // Modify template content
      const updatedContent = 'Güncellenen şablon içeriği: {partyName}';
      await page.fill('[data-testid="template-content-textarea"]', updatedContent);
      
      // Save changes
      await page.click('[data-testid="save-template-button"]');
      
      // Verify template was updated
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator(`text=${updatedContent}`)).toBeVisible();
    });

    test('should duplicate a template', async ({ page }) => {
      // First create a template
      await createTestTemplate(page);
      
      // Click duplicate button
      await page.click(`[data-testid="duplicate-template-${testTemplate.name}"]`);
      
      // Verify duplicate modal is open
      await expect(page.locator('[data-testid="duplicate-template-modal"]')).toBeVisible();
      
      // Modify the name for the duplicate
      await page.fill('[data-testid="template-name-input"]', `${testTemplate.name} - Kopya`);
      
      // Save duplicate
      await page.click('[data-testid="save-template-button"]');
      
      // Verify duplicate was created
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator(`text=${testTemplate.name} - Kopya`)).toBeVisible();
    });

    test('should delete a template', async ({ page }) => {
      // First create a template
      await createTestTemplate(page);
      
      // Click delete button
      await page.click(`[data-testid="delete-template-${testTemplate.name}"]`);
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify template was deleted
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator(`text=${testTemplate.name}`)).not.toBeVisible();
    });

    test('should preview a template', async ({ page }) => {
      // First create a template
      await createTestTemplate(page);
      
      // Click preview button
      await page.click(`[data-testid="preview-template-${testTemplate.name}"]`);
      
      // Verify preview modal is open
      await expect(page.locator('[data-testid="template-preview-modal"]')).toBeVisible();
      
      // Verify template content is displayed
      await expect(page.locator('[data-testid="preview-content"]')).toContainText(testTemplate.content);
      
      // Close preview
      await page.click('[data-testid="close-preview-button"]');
      await expect(page.locator('[data-testid="template-preview-modal"]')).not.toBeVisible();
    });

    test('should filter templates by type', async ({ page }) => {
      // Navigate to templates tab
      await page.click('[data-testid="templates-tab"]');
      
      // Create email template
      await createTestTemplate(page);
      
      // Create SMS template
      await page.click('[data-testid="create-template-button"]');
      await page.fill('[data-testid="template-name-input"]', 'SMS Şablonu');
      await page.selectOption('[data-testid="template-type-select"]', 'sms');
      await page.fill('[data-testid="template-content-textarea"]', 'SMS şablon içeriği');
      await page.click('[data-testid="save-template-button"]');
      
      // Filter by email templates
      await page.selectOption('[data-testid="template-type-filter"]', 'email');
      await expect(page.locator(`text=${testTemplate.name}`)).toBeVisible();
      await expect(page.locator('text=SMS Şablonu')).not.toBeVisible();
      
      // Filter by SMS templates
      await page.selectOption('[data-testid="template-type-filter"]', 'sms');
      await expect(page.locator('text=SMS Şablonu')).toBeVisible();
      await expect(page.locator(`text=${testTemplate.name}`)).not.toBeVisible();
      
      // Show all templates
      await page.selectOption('[data-testid="template-type-filter"]', 'all');
      await expect(page.locator(`text=${testTemplate.name}`)).toBeVisible();
      await expect(page.locator('text=SMS Şablonu')).toBeVisible();
    });
  });

  test.describe('Message History and Tracking', () => {
    test('should display message history with correct status', async ({ page }) => {
      // Send a test message first
      await page.click('[data-testid="compose-message-button"]');
      await page.selectOption('[data-testid="message-channel-select"]', 'email');
      await page.fill('[data-testid="message-subject-input"]', 'Test History Message');
      await page.fill('[data-testid="message-content-textarea"]', 'Test content');
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      await page.click('[data-testid="send-message-button"]');
      
      // Navigate to messages tab
      await page.click('[data-testid="messages-tab"]');
      
      // Verify message appears in history
      await expect(page.locator('text=Test History Message')).toBeVisible();
      
      // Verify message status is displayed
      await expect(page.locator('[data-testid="message-status"]')).toBeVisible();
    });

    test('should filter messages by channel', async ({ page }) => {
      // Navigate to messages tab
      await page.click('[data-testid="messages-tab"]');
      
      // Filter by email
      await page.selectOption('[data-testid="message-channel-filter"]', 'email');
      
      // Verify only email messages are shown
      const emailMessages = page.locator('[data-testid="message-item"][data-channel="email"]');
      const smsMessages = page.locator('[data-testid="message-item"][data-channel="sms"]');
      
      await expect(emailMessages.first()).toBeVisible();
      await expect(smsMessages.first()).not.toBeVisible();
    });

    test('should filter messages by status', async ({ page }) => {
      // Navigate to messages tab
      await page.click('[data-testid="messages-tab"]');
      
      // Filter by sent status
      await page.selectOption('[data-testid="message-status-filter"]', 'sent');
      
      // Verify only sent messages are shown
      const sentMessages = page.locator('[data-testid="message-item"][data-status="sent"]');
      await expect(sentMessages.first()).toBeVisible();
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display communication analytics', async ({ page }) => {
      // Navigate to analytics tab
      await page.click('[data-testid="analytics-tab"]');
      
      // Verify analytics components are visible
      await expect(page.locator('[data-testid="total-messages-stat"]')).toBeVisible();
      await expect(page.locator('[data-testid="delivery-rate-stat"]')).toBeVisible();
      await expect(page.locator('[data-testid="open-rate-stat"]')).toBeVisible();
      await expect(page.locator('[data-testid="click-rate-stat"]')).toBeVisible();
      
      // Verify charts are displayed (or placeholders)
      await expect(page.locator('[data-testid="messages-over-time-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="channel-distribution-chart"]')).toBeVisible();
    });

    test('should allow date range filtering', async ({ page }) => {
      // Navigate to analytics tab
      await page.click('[data-testid="analytics-tab"]');
      
      // Change date range
      await page.selectOption('[data-testid="date-range-select"]', '7d');
      
      // Verify analytics update (check if refresh was triggered)
      await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible();
    });

    test('should refresh analytics data', async ({ page }) => {
      // Navigate to analytics tab
      await page.click('[data-testid="analytics-tab"]');
      
      // Click refresh button
      await page.click('[data-testid="refresh-analytics-button"]');
      
      // Verify refresh was triggered
      await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible();
    });
  });

  test.describe('Offline Functionality', () => {
    test('should work offline and sync when back online', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);
      
      // Verify offline indicator is shown
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Try to compose a message while offline
      await page.click('[data-testid="compose-message-button"]');
      await page.selectOption('[data-testid="message-channel-select"]', 'email');
      await page.fill('[data-testid="message-subject-input"]', 'Offline Message');
      await page.fill('[data-testid="message-content-textarea"]', 'This message was composed offline');
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      await page.click('[data-testid="send-message-button"]');
      
      // Verify message is queued for sending
      await expect(page.locator('[data-testid="message-queued-toast"]')).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      
      // Verify online indicator is shown
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
      
      // Verify sync happens automatically
      await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="syncing-indicator"]')).not.toBeVisible();
      
      // Verify message was sent
      await page.click('[data-testid="messages-tab"]');
      await expect(page.locator('text=Offline Message')).toBeVisible();
    });

    test('should show pending changes count', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);
      
      // Create multiple messages while offline
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="compose-message-button"]');
        await page.selectOption('[data-testid="message-channel-select"]', 'email');
        await page.fill('[data-testid="message-subject-input"]', `Offline Message ${i}`);
        await page.fill('[data-testid="message-content-textarea"]', `Content ${i}`);
        await page.click('[data-testid="add-recipient-button"]');
        await page.fill('[data-testid="recipient-search-input"]', testParty.name);
        await page.click(`[data-testid="party-${testParty.name}"]`);
        await page.click('[data-testid="send-message-button"]');
        await page.click('[data-testid="close-compose-modal"]');
      }
      
      // Verify pending changes count
      await expect(page.locator('[data-testid="pending-changes-count"]')).toContainText('3');
      
      // Go back online and verify sync
      await context.setOffline(false);
      await expect(page.locator('[data-testid="pending-changes-count"]')).toContainText('0');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('/api/communications/messages', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Try to send a message
      await page.click('[data-testid="compose-message-button"]');
      await page.selectOption('[data-testid="message-channel-select"]', 'email');
      await page.fill('[data-testid="message-subject-input"]', 'Test Error Message');
      await page.fill('[data-testid="message-content-textarea"]', 'Test content');
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      await page.click('[data-testid="send-message-button"]');
      
      // Verify error message is shown
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('Mesaj gönderilemedi');
    });

    test('should handle network timeouts', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/communications/messages', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }, 10000); // 10 second delay
      });
      
      // Try to send a message
      await page.click('[data-testid="compose-message-button"]');
      await page.selectOption('[data-testid="message-channel-select"]', 'email');
      await page.fill('[data-testid="message-subject-input"]', 'Timeout Test');
      await page.fill('[data-testid="message-content-textarea"]', 'Test content');
      await page.click('[data-testid="add-recipient-button"]');
      await page.fill('[data-testid="recipient-search-input"]', testParty.name);
      await page.click(`[data-testid="party-${testParty.name}"]`);
      await page.click('[data-testid="send-message-button"]');
      
      // Verify loading state is shown
      await expect(page.locator('[data-testid="sending-indicator"]')).toBeVisible();
      
      // Verify timeout handling (should show error after timeout)
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test keyboard navigation through main interface
      await page.keyboard.press('Tab'); // Focus first interactive element
      await page.keyboard.press('Tab'); // Move to next element
      await page.keyboard.press('Enter'); // Activate focused element
      
      // Verify keyboard navigation works
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for ARIA labels on key elements
      await expect(page.locator('[data-testid="compose-message-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="messages-tab"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="templates-tab"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="analytics-tab"]')).toHaveAttribute('aria-label');
    });

    test('should support screen readers', async ({ page }) => {
      // Check for screen reader friendly elements
      await expect(page.locator('h1')).toBeVisible(); // Main heading
      await expect(page.locator('[role="main"]')).toBeVisible(); // Main content area
      await expect(page.locator('[role="navigation"]')).toBeVisible(); // Navigation elements
    });
  });
});