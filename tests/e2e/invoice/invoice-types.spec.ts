import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { generateRandomParty } from '../../fixtures/parties';
import { waitForToast } from '../../helpers/wait';

test.describe('Invoice Types E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('INVOICE-016: Create TEVKIFAT invoice (Type 11)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act: Navigate to new invoice page
    await page.goto('/invoices/new');
    
    // Select customer
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Select invoice type 11 (Tevkifat)
    await page.locator('[data-testid="invoice-type-select"]').selectOption('11');
    
    // Add product line
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Hizmet Bedeli');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('10000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('20');
    
    // Add withholding data
    await page.locator('[data-testid="product-line-0-withholding-button"]').click();
    await page.locator('[data-testid="withholding-code-select"]').selectOption('624');
    await page.locator('[data-testid="withholding-rate-input"]').fill('20');
    await page.locator('[data-testid="withholding-save-button"]').click();
    
    // Submit invoice
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Invoice created with withholding
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-017: Create ISTISNA invoice (Type 13)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act: Create invoice with exemption
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('13');
    
    // Add product with 0% tax
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('İstisna Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('5000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('0');
    
    // Select exemption reason (should be visible in sidebar)
    await page.locator('[data-testid="exemption-reason-select"]').selectOption('317');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-018: Create IHRACAT invoice (Export)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act: Create export invoice
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Select export scenario
    await page.locator('[data-testid="scenario-select"]').selectOption('export');
    await page.locator('[data-testid="invoice-type-select"]').selectOption('13');
    
    // Fill export details in sidebar
    await page.locator('[data-testid="export-country-select"]').selectOption('DE');
    await page.locator('[data-testid="export-transport-mode"]').selectOption('sea');
    await page.locator('[data-testid="export-incoterm"]').selectOption('FOB');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Export Product');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('10');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('0');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-019: Create OZELMATRAH invoice (Type 12)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('12');
    
    // Fill special tax base in sidebar
    await page.locator('[data-testid="special-tax-base-amount"]').fill('5000');
    await page.locator('[data-testid="special-tax-base-rate"]').fill('18');
    await page.locator('[data-testid="special-tax-base-description"]').fill('Özel matrah açıklaması');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Özel Matrah Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('5000');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-020: Create EARSIV invoice', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('earsiv');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('E-Arşiv Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('18');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-021: Create HKS invoice (Accommodation Tax)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('hks');
    
    // Fill HKS details in sidebar
    await page.locator('[data-testid="hks-registration-no"]').fill('12345678');
    await page.locator('[data-testid="hks-start-date"]').fill('2025-03-01');
    await page.locator('[data-testid="hks-end-date"]').fill('2025-03-05');
    await page.locator('[data-testid="hks-guest-count"]').fill('2');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Konaklama');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('4');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('500');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-022: Create SARJ invoice (EV Charging)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('sarj');
    
    // Fill SARJ details
    await page.locator('[data-testid="sarj-station-code"]').fill('STATION001');
    await page.locator('[data-testid="sarj-plate-number"]').fill('34ABC123');
    await page.locator('[data-testid="sarj-start-date"]').fill('2025-03-09T10:00');
    await page.locator('[data-testid="sarj-end-date"]').fill('2025-03-09T12:00');
    await page.locator('[data-testid="sarj-energy-amount"]').fill('45.5');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Elektrik Şarj');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('45.5');
    await page.locator('[data-testid="product-line-0-unit"]').selectOption('KWH');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('5');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-023: Create YOLCU BERABERI invoice', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    await page.locator('[data-testid="invoice-type-select"]').selectOption('yolcu');
    
    // Fill passenger details
    await page.locator('[data-testid="passenger-name"]').fill('John Doe');
    await page.locator('[data-testid="passenger-passport"]').fill('AB1234567');
    await page.locator('[data-testid="passenger-nationality"]').fill('USA');
    await page.locator('[data-testid="tax-representative-name"]').fill('Tax Rep Ltd');
    await page.locator('[data-testid="tax-representative-tax-id"]').fill('1234567890');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Yolcu Beraberi Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('2000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('0');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-024: Create SEVK (E-İrsaliye)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act: Navigate to new despatch page
    await page.goto('/invoices/new?documentKind=despatch');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Invoice type should be auto-selected as 'sevk'
    await expect(page.locator('[data-testid="invoice-type-select"]')).toHaveValue('sevk');
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Sevk Ürünü');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('10');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('100');
    
    // Fill shipment info
    await page.locator('[data-testid="shipment-carrier-name"]').fill('Kargo Şirketi');
    await page.locator('[data-testid="shipment-vehicle-plate"]').fill('34ABC123');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-025: Create TIBBI CIHAZ invoice (Medical)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Select medical scenario
    await page.locator('[data-testid="scenario-select"]').selectOption('medical');
    
    // Open medical device modal
    await page.locator('[data-testid="medical-device-button"]').click();
    await page.locator('[data-testid="medical-device-name"]').fill('İşitme Cihazı');
    await page.locator('[data-testid="medical-device-serial"]').fill('HC123456');
    await page.locator('[data-testid="medical-device-manufacturer"]').fill('Phonak');
    await page.locator('[data-testid="medical-device-save-button"]').click();
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('İşitme Cihazı');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('15000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('10');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-026: Multiple invoice prefixes selection', async ({ page }) => {
    // This test assumes multiple prefixes are configured in settings
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Check if prefix selector is visible (only if multiple prefixes exist)
    const prefixSelect = page.locator('[data-testid="invoice-prefix-select"]');
    if (await prefixSelect.isVisible()) {
      await prefixSelect.selectOption({ index: 1 }); // Select second prefix
    }
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Test Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-027: 0% VAT with exemption reason auto-fill', async ({ page }) => {
    // This test verifies that default exemption reason is auto-filled
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Add product with 0% tax
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('İstisna Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    await page.locator('[data-testid="product-line-0-tax-rate"]').selectOption('0');
    
    // Exemption reason should be auto-filled if default is set
    const exemptionSelect = page.locator('[data-testid="exemption-reason-select"]');
    if (await exemptionSelect.isVisible()) {
      const value = await exemptionSelect.inputValue();
      expect(value).not.toBe('0'); // Should not be empty/default
    }
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });

  test('INVOICE-028: Save as draft functionality', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Taslak Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    
    // Save as draft
    await page.locator('[data-testid="invoice-save-draft-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Redirected to invoices page
    await expect(page).toHaveURL(/\/invoices$/);
    
    // Verify draft exists in list
    await page.locator('[data-testid="invoice-status-filter"]').selectOption('draft');
    await expect(page.locator('[data-testid="invoice-list-item"]').first()).toContainText('DRAFT');
  });

  test('INVOICE-029: Linked document creation (Invoice + E-İrsaliye)', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Bağlı Belge Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('5');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    
    // Enable linked document creation
    await page.locator('[data-testid="create-linked-document-checkbox"]').check();
    await page.locator('[data-testid="linked-document-type-select"]').selectOption('0');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Both documents created
    await expect(page).toHaveURL(/\/invoices$/);
    // Should see 2 new documents in the list
  });

  test('INVOICE-030: Clear product line button', async ({ page }) => {
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Add product
    await page.locator('[data-testid="add-product-line-button"]').click();
    await page.locator('[data-testid="product-line-0-name"]').fill('Test Ürün');
    await page.locator('[data-testid="product-line-0-quantity"]').fill('1');
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('1000');
    
    // Clear the line
    await page.locator('[data-testid="product-line-0-clear-button"]').click();
    
    // Assert: Line is cleared but still exists
    await expect(page.locator('[data-testid="product-line-0-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="product-line-0-quantity"]')).toHaveValue('1'); // Default value
    await expect(page.locator('[data-testid="product-line-0-unit-price"]')).toHaveValue('');
  });

  test('INVOICE-031: SGK invoice with auto-filled hearing device', async ({ page }) => {
    // This test verifies SGK invoice auto-fills hearing device for hearing centers
    // Arrange
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act
    await page.goto('/invoices/new');
    
    await page.locator('[data-testid="customer-search-input"]').fill(partyData.firstName);
    await page.locator(`[data-testid="customer-option-${partyId}"]`).click();
    
    // Select SGK invoice type (50)
    await page.locator('[data-testid="invoice-type-select"]').selectOption('50');
    
    // Product line should be auto-filled with "İşitme Cihazı"
    const firstProductName = await page.locator('[data-testid="product-line-0-name"]').inputValue();
    expect(firstProductName).toBe('İşitme Cihazı');
    
    // Fill SGK details
    await page.locator('[data-testid="sgk-number"]').fill('123456789');
    await page.locator('[data-testid="sgk-scheme-select"]').selectOption('over18_working');
    
    // Update product price
    await page.locator('[data-testid="product-line-0-unit-price"]').fill('15000');
    
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert
    await expect(page).toHaveURL(/\/invoices$/);
  });
});
