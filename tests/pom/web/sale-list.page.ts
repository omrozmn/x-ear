import { Page, Locator } from '@playwright/test';

/**
 * Web Sale List Page Object Model
 * Phase 3.4 - Sales functionality
 */
export class WebSaleListPage {
  readonly page: Page;
  
  // Main elements
  readonly addSaleButton: Locator;
  readonly searchInput: Locator;
  readonly saleTable: Locator;
  readonly tableRows: Locator;
  
  // Filters
  readonly dateFilter: Locator;
  readonly statusFilter: Locator;
  
  // Pagination
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  
  // Modal
  readonly createSaleModal: Locator;
  readonly saleForm: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    this.addSaleButton = page.locator('[data-testid="add-sale-button"]');
    this.searchInput = page.locator('[data-testid="sale-search-input"]');
    this.saleTable = page.locator('[data-testid="sale-table"]');
    this.tableRows = this.saleTable.locator('tbody tr');
    
    this.dateFilter = page.locator('[data-testid="date-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    
    this.nextPageButton = page.locator('[data-testid="pagination-next"]');
    this.prevPageButton = page.locator('[data-testid="pagination-prev"]');
    
    this.createSaleModal = page.locator('[data-testid="create-sale-modal"]');
    this.saleForm = page.locator('[data-testid="sale-form"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/sales');
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.saleTable.isVisible().catch(() => false);
  }

  async getSaleCount(): Promise<number> {
    return this.tableRows.count();
  }

  async searchBySaleNumber(saleNumber: string): Promise<void> {
    await this.searchInput.fill(saleNumber);
    await this.page.waitForTimeout(500);
  }

  async filterByDate(startDate: string, endDate: string): Promise<void> {
    await this.dateFilter.click();
    await this.page.locator('[data-testid="start-date-input"]').fill(startDate);
    await this.page.locator('[data-testid="end-date-input"]').fill(endDate);
    await this.page.locator('[data-testid="apply-filter-button"]').click();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.locator(`[data-testid="status-option-${status}"]`).click();
  }

  async openCreateModal(): Promise<void> {
    await this.addSaleButton.click();
    await this.createSaleModal.waitFor({ state: 'visible' });
  }

  async createSale(saleData: {
    partyId?: string;
    deviceId?: string;
    amount?: number;
    paymentType?: string;
  }): Promise<void> {
    await this.openCreateModal();
    
    if (saleData.partyId) {
      await this.page.locator('[data-testid="sale-party-select"]').click();
      await this.page.locator(`[data-testid="party-option-${saleData.partyId}"]`).click();
    }
    
    if (saleData.deviceId) {
      await this.page.locator('[data-testid="sale-device-select"]').click();
      await this.page.locator(`[data-testid="device-option-${saleData.deviceId}"]`).click();
    }
    
    if (saleData.amount) {
      await this.page.locator('[data-testid="sale-amount-input"]').fill(saleData.amount.toString());
    }
    
    if (saleData.paymentType) {
      await this.page.locator(`[data-testid="payment-type-${saleData.paymentType}"]`).click();
    }
    
    await this.page.locator('[data-testid="sale-submit-button"]').click();
  }

  async viewSaleDetail(saleId: string): Promise<void> {
    const row = this.saleTable.locator(`tr[data-sale-id="${saleId}"]`);
    await row.locator('[data-testid="sale-link"]').click();
  }

  async deleteSale(saleId: string): Promise<void> {
    const row = this.saleTable.locator(`tr[data-sale-id="${saleId}"]`);
    await row.locator('[data-testid="sale-delete-button"]').click();
    await this.page.locator('[data-testid="confirm-delete-button"]').click();
  }

  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }
}
