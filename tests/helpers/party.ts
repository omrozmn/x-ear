import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait.helper';

/**
 * Party Helper Functions
 * 
 * Provides party (customer) management utilities for E2E tests
 */

export interface PartyData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

/**
 * Create a new party
 * 
 * @param page - Playwright page object
 * @param data - Party data
 * @returns Party ID
 */
export async function createParty(
  page: Page,
  data: PartyData
): Promise<string> {
  // Navigate to parties page
  await page.goto('/parties');
  
  // Wait for page to load (use domcontentloaded instead of networkidle)
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Give time for React to render
  
  // Find and click button by text (more reliable than test ID)
  await page.locator('button:has-text("Yeni Hasta")').first().click();
  
  // Wait for modal to open
  await waitForModalOpen(page, 'party-form-modal');
  
  // Fill form
  await page.locator('[data-testid="party-first-name-input"]').fill(data.firstName);
  await page.locator('[data-testid="party-last-name-input"]').fill(data.lastName);
  await page.locator('[data-testid="party-phone-input"]').fill(data.phone);
  
  if (data.email) {
    await page.locator('[data-testid="party-email-input"]').fill(data.email);
  }
  
  if (data.address) {
    await page.locator('[data-testid="party-address-input"]').fill(data.address);
  }
  
  if (data.notes) {
    await page.locator('[data-testid="party-notes-input"]').fill(data.notes);
  }
  
  // Submit form
  await page.locator('[data-testid="party-submit-button"]').click();
  
  // Wait for API response and extract party ID (more reliable than toast)
  const response = await page.waitForResponse(
    r => r.url().includes('/parties') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Search for parties
 * 
 * @param page - Playwright page object
 * @param query - Search query
 */
export async function searchParty(
  page: Page,
  query: string
): Promise<void> {
  await page.goto('/parties');
  await page.locator('[data-testid="party-search-input"]').fill(query);
  await page.locator('[data-testid="party-search-button"]').click();
  await waitForApiCall(page, '/parties', 'GET');
}

/**
 * Delete a party
 * 
 * @param page - Playwright page object
 * @param partyId - Party ID to delete
 */
export async function deleteParty(
  page: Page,
  partyId: string
): Promise<void> {
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[DELETE]')) {
      console.log(`[BROWSER CONSOLE] ${msg.text()}`);
    }
  });
  
  // Navigate to party detail page
  console.log('[Helper] Navigating to party detail page:', partyId);
  await page.goto(`/parties/${partyId}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Give time for React to render
  
  // Check if delete button exists
  const deleteButton = page.locator('[data-testid="party-delete-button"]');
  const buttonExists = await deleteButton.count();
  console.log('[Helper] Delete button count:', buttonExists);
  
  if (buttonExists === 0) {
    throw new Error('Delete button not found on page');
  }
  
  // Set up API response listener BEFORE clicking delete
  console.log('[Helper] Setting up DELETE API listener');
  const deleteResponsePromise = page.waitForResponse(
    response => 
      response.url().includes(`/parties/${partyId}`) && 
      response.request().method() === 'DELETE',
    { timeout: 10000 }
  );
  
  // Set up dialog handler BEFORE clicking delete
  page.once('dialog', dialog => {
    console.log('[Helper] Accepting delete confirmation dialog');
    dialog.accept();
  });
  
  // Click delete button
  console.log('[Helper] Clicking delete button');
  await deleteButton.click();
  
  // Wait for API response
  console.log('[Helper] Waiting for DELETE API response');
  const deleteResponse = await deleteResponsePromise;
  console.log('[Helper] DELETE API response status:', deleteResponse.status());
  
  // Wait for redirect to parties list
  console.log('[Helper] Waiting for redirect to /parties');
  await page.waitForURL('/parties', { timeout: 5000 });
  
  console.log('[Helper] Party deleted via UI:', partyId);
}

/**
 * Update a party
 * 
 * @param page - Playwright page object
 * @param partyId - Party ID to update
 * @param data - Updated party data
 */
export async function updateParty(
  page: Page,
  partyId: string,
  data: Partial<PartyData>
): Promise<void> {
  await page.goto(`/parties/${partyId}`);
  await page.locator('[data-testid="party-edit-button"]').click();
  
  await waitForModalOpen(page, 'party-form-modal');
  
  if (data.firstName) {
    await page.locator('[data-testid="party-first-name-input"]').fill(data.firstName);
  }
  
  if (data.lastName) {
    await page.locator('[data-testid="party-last-name-input"]').fill(data.lastName);
  }
  
  if (data.phone) {
    await page.locator('[data-testid="party-phone-input"]').fill(data.phone);
  }
  
  if (data.email) {
    await page.locator('[data-testid="party-email-input"]').fill(data.email);
  }
  
  await page.locator('[data-testid="party-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'party-form-modal');
}

/**
 * Get party count from list
 * 
 * @param page - Playwright page object
 * @returns Number of parties in the list
 */
export async function getPartyCount(page: Page): Promise<number> {
  await page.goto('/parties');
  await waitForApiCall(page, '/parties', 'GET');
  
  const items = await page.locator('[data-testid="party-list-item"]').count();
  return items;
}
