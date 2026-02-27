import { Page, Locator, expect } from '@playwright/test';

/**
 * Web Party List Page Object Model
 * Phase 3.3.25 - POM for party management
 */
export class WebPartyListPage {
  readonly page: Page;
  
  // Main elements
  readonly pageTitle: Locator;
  readonly addPartyButton: Locator;
  readonly searchInput: Locator;
  readonly partyTable: Locator;
  readonly tableRows: Locator;
  
  // Filters
  readonly roleFilter: Locator;
  readonly dateRangeFilter: Locator;
  
  // Pagination
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageInfo: Locator;
  
  // Bulk actions
  readonly selectAllCheckbox: Locator;
  readonly bulkExportButton: Locator;
  readonly bulkDeleteButton: Locator;
  readonly bulkImportButton: Locator;
  
  // Modal
  readonly createPartyModal: Locator;
  readonly partyForm: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Main elements
    this.pageTitle = page.locator('[data-testid="page-title"]');
    this.addPartyButton = page.locator('[data-testid="add-party-button"]');
    this.searchInput = page.locator('[data-testid="party-search-input"]');
    this.partyTable = page.locator('[data-testid="party-table"]');
    this.tableRows = this.partyTable.locator('tbody tr');
    
    // Filters
    this.roleFilter = page.locator('[data-testid="role-filter"]');
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    
    // Pagination
    this.nextPageButton = page.locator('[data-testid="pagination-next"]');
    this.prevPageButton = page.locator('[data-testid="pagination-prev"]');
    this.pageInfo = page.locator('[data-testid="page-info"]');
    
    // Bulk actions
    this.selectAllCheckbox = page.locator('[data-testid="select-all-parties"]');
    this.bulkExportButton = page.locator('[data-testid="bulk-export-button"]');
    this.bulkDeleteButton = page.locator('[data-testid="bulk-delete-button"]');
    this.bulkImportButton = page.locator('[data-testid="bulk-import-button"]');
    
    // Modal
    this.createPartyModal = page.locator('[data-testid="create-party-modal"]');
    this.partyForm = page.locator('[data-testid="party-form"]');
  }

  /**
   * Navigate to party list
   */
  async goto(): Promise<void> {
    await this.page.goto('/parties');
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.partyTable.isVisible().catch(() => false);
  }

  /**
   * Get party count in table
   */
  async getPartyCount(): Promise<number> {
    return this.tableRows.count();
  }

  /**
   * Search for party by name
   */
  async searchByName(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(500); // Wait for search
  }

  /**
   * Search for party by phone
   */
  async searchByPhone(phone: string): Promise<void> {
    await this.searchInput.fill(phone);
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by role
   */
  async filterByRole(role: string): Promise<void> {
    await this.roleFilter.click();
    await this.page.locator(`[data-testid="role-option-${role}"]`).click();
  }

  /**
   * Open create party modal
   */
  async openCreateModal(): Promise<void> {
    await this.addPartyButton.click();
    await this.createPartyModal.waitFor({ state: 'visible' });
  }

  /**
   * Create new party
   */
  async createParty(partyData: {
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  }): Promise<void> {
    await this.openCreateModal();
    
    if (partyData.name) {
      await this.page.locator('[data-testid="party-name-input"]').fill(partyData.name);
    }
    if (partyData.phone) {
      await this.page.locator('[data-testid="party-phone-input"]').fill(partyData.phone);
    }
    if (partyData.email) {
      await this.page.locator('[data-testid="party-email-input"]').fill(partyData.email);
    }
    if (partyData.role) {
      await this.page.locator('[data-testid="party-role-select"]').click();
      await this.page.locator(`[data-testid="role-option-${partyData.role}"]`).click();
    }
    
    await this.page.locator('[data-testid="party-submit-button"]').click();
  }

  /**
   * Delete party by name (with confirmation)
   */
  async deleteParty(name: string): Promise<void> {
    const row = this.partyTable.locator(`tr:has-text("${name}")`);
    await row.locator('[data-testid="party-delete-button"]').click();
    await this.page.locator('[data-testid="confirm-delete-button"]').click();
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go to previous page
   */
  async prevPage(): Promise<void> {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Export to CSV
   */
  async exportToCSV(): Promise<void> {
    await this.bulkExportButton.click();
  }

  /**
   * Import from CSV
   */
  async importFromCSV(filePath: string): Promise<void> {
    await this.bulkImportButton.click();
    await this.page.locator('[data-testid="import-file-input"]').setInputFiles(filePath);
    await this.page.locator('[data-testid="import-submit-button"]').click();
  }

  /**
   * Click party name to view details
   */
  async viewPartyDetails(partyName: string): Promise<void> {
    const row = this.partyTable.locator(`tr:has-text("${partyName}")`);
    await row.locator('[data-testid="party-name-link"]').click();
  }
}
