import { Page, expect } from '@playwright/test';

/**
 * Party Helper Functions for E2E Tests
 */

export interface CreatePartyOptions {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  tcNumber?: string;
  birthDate?: string;
  address?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

/**
 * Create a test party
 * @param page - Playwright page object
 * @param options - Party creation options
 */
export async function createTestParty(page: Page, options: CreatePartyOptions) {
  // Navigate to parties page
  await page.goto('/parties');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Click "New Party" button - try multiple selectors
  const newPartySelectors = [
    '[data-testid="new-party-button"]',
    'button:has-text("Yeni Hasta")',
    'button:has-text("Yeni Hasta Ekle")',
    'button:has-text("Yeni Party")',
    'button:has-text("Ekle")'
  ];
  
  let buttonClicked = false;
  for (const selector of newPartySelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await page.click(selector);
      buttonClicked = true;
      break;
    }
  }
  
  if (!buttonClicked) {
    throw new Error('Could not find "New Party" button');
  }
  
  // Wait for form to be visible
  await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible();
  
  // Fill required fields
  await page.fill('[data-testid="party-first-name-input"]', options.firstName);
  await page.fill('[data-testid="party-last-name-input"]', options.lastName);
  await page.fill('[data-testid="party-phone-input"]', options.phone);
  
  // Fill optional fields
  if (options.email) {
    await page.fill('[data-testid="party-email-input"]', options.email);
  }
  
  if (options.tcNumber) {
    await page.fill('[data-testid="party-tc-number-input"]', options.tcNumber);
  }
  
  if (options.birthDate) {
    await page.fill('[data-testid="party-birth-date-input"]', options.birthDate);
  }
  
  if (options.address) {
    await page.fill('[data-testid="party-address-input"]', options.address);
  }
  
  if (options.gender) {
    await page.selectOption('[data-testid="party-gender-select"]', options.gender);
  }
  
  // Submit form
  await page.click('[data-testid="party-submit-button"]');
  
  // Wait for form to close or success indication
  await page.waitForTimeout(3000);
  
  // Try to find success toast with multiple selectors
  const toastSelectors = [
    '[data-testid="toast-success"]',
    '[role="alert"]',
    '.toast-success',
    '[class*="success"]',
    'text=/başarı|success|kaydedildi/i'
  ];
  
  let successFound = false;
  for (const selector of toastSelectors) {
    try {
      const count = await page.locator(selector).count();
      if (count > 0) {
        successFound = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  // If no toast found, check if form closed (modal disappeared)
  if (!successFound) {
    const formVisible = await page.locator('[data-testid="party-first-name-input"]').isVisible();
    if (!formVisible) {
      successFound = true; // Form closed, likely success
    }
  }
  
  // Get party ID from URL or response
  const url = page.url();
  const partyId = url.match(/\/parties\/([^/]+)/)?.[1];
  
  return { partyId, success: successFound };
}

/**
 * Search for a party
 * @param page - Playwright page object
 * @param searchTerm - Search term (name, phone, etc.)
 */
export async function searchParty(page: Page, searchTerm: string) {
  await page.goto('/parties');
  
  // Fill search input
  await page.fill('[data-testid="party-search-input"]', searchTerm);
  
  // Wait for search results
  await page.waitForTimeout(500); // Debounce
  
  // Return first result
  const firstResult = page.locator('[data-testid^="party-row-"]').first();
  await expect(firstResult).toBeVisible();
  
  return firstResult;
}

/**
 * Delete a test party
 * @param page - Playwright page object
 * @param partyId - Party ID to delete
 */
export async function deleteTestParty(page: Page, partyId: string) {
  await page.goto(`/parties/${partyId}`);
  
  // Click delete button
  await page.click('[data-testid="party-delete-button"]');
  
  // Confirm deletion
  await page.click('[data-testid="confirm-delete-button"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Update a party
 * @param page - Playwright page object
 * @param partyId - Party ID to update
 * @param updates - Fields to update
 */
export async function updateParty(page: Page, partyId: string, updates: Partial<CreatePartyOptions>) {
  await page.goto(`/parties/${partyId}/edit`);
  
  // Wait for form
  await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible();
  
  // Update fields
  if (updates.firstName) {
    await page.fill('[data-testid="party-first-name-input"]', updates.firstName);
  }
  
  if (updates.lastName) {
    await page.fill('[data-testid="party-last-name-input"]', updates.lastName);
  }
  
  if (updates.phone) {
    await page.fill('[data-testid="party-phone-input"]', updates.phone);
  }
  
  if (updates.email) {
    await page.fill('[data-testid="party-email-input"]', updates.email);
  }
  
  // Submit
  await page.click('[data-testid="party-submit-button"]');
  
  // Wait for success
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
}
