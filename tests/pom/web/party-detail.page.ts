import { Page, Locator } from '@playwright/test';

/**
 * Web Party Detail Page Object Model
 * Phase 3.3 - Party detail functionality
 */
export class WebPartyDetailPage {
  readonly page: Page;
  
  // Header
  readonly partyName: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  
  // Tabs
  readonly infoTab: Locator;
  readonly salesTab: Locator;
  readonly appointmentsTab: Locator;
  readonly notesTab: Locator;
  
  // Info section
  readonly phoneField: Locator;
  readonly emailField: Locator;
  readonly roleField: Locator;
  
  // Sales section
  readonly salesTable: Locator;
  readonly salesCount: Locator;
  
  // Appointments section
  readonly appointmentsTable: Locator;
  readonly appointmentsCount: Locator;
  
  // Notes section
  readonly notesList: Locator;
  readonly addNoteButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Header
    this.partyName = page.locator('[data-testid="party-detail-name"]');
    this.editButton = page.locator('[data-testid="party-edit-button"]');
    this.deleteButton = page.locator('[data-testid="party-delete-button"]');
    
    // Tabs
    this.infoTab = page.locator('[data-testid="tab-info"]');
    this.salesTab = page.locator('[data-testid="tab-sales"]');
    this.appointmentsTab = page.locator('[data-testid="tab-appointments"]');
    this.notesTab = page.locator('[data-testid="tab-notes"]');
    
    // Info section
    this.phoneField = page.locator('[data-testid="party-phone"]');
    this.emailField = page.locator('[data-testid="party-email"]');
    this.roleField = page.locator('[data-testid="party-role"]');
    
    // Sales section
    this.salesTable = page.locator('[data-testid="party-sales-table"]');
    this.salesCount = page.locator('[data-testid="sales-count"]');
    
    // Appointments section
    this.appointmentsTable = page.locator('[data-testid="party-appointments-table"]');
    this.appointmentsCount = page.locator('[data-testid="appointments-count"]');
    
    // Notes section
    this.notesList = page.locator('[data-testid="party-notes-list"]');
    this.addNoteButton = page.locator('[data-testid="add-note-button"]');
  }

  /**
   * Navigate to party detail
   */
  async goto(partyId: string): Promise<void> {
    await this.page.goto(`/parties/${partyId}`);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.partyName.isVisible().catch(() => false);
  }

  /**
   * Switch to info tab
   */
  async goToInfoTab(): Promise<void> {
    await this.infoTab.click();
  }

  /**
   * Switch to sales tab
   */
  async goToSalesTab(): Promise<void> {
    await this.salesTab.click();
    await this.salesTable.waitFor({ state: 'visible' });
  }

  /**
   * Switch to appointments tab
   */
  async goToAppointmentsTab(): Promise<void> {
    await this.appointmentsTab.click();
    await this.appointmentsTable.waitFor({ state: 'visible' });
  }

  /**
   * Switch to notes tab
   */
  async goToNotesTab(): Promise<void> {
    await this.notesTab.click();
    await this.notesList.waitFor({ state: 'visible' });
  }

  /**
   * Get sales count
   */
  async getSalesCount(): Promise<number> {
    const text = await this.salesCount.textContent() || '0';
    return parseInt(text, 10);
  }

  /**
   * Get appointments count
   */
  async getAppointmentsCount(): Promise<number> {
    const text = await this.appointmentsCount.textContent() || '0';
    return parseInt(text, 10);
  }

  /**
   * Edit party
   */
  async editParty(): Promise<void> {
    await this.editButton.click();
  }

  /**
   * Delete party
   */
  async deleteParty(): Promise<void> {
    await this.deleteButton.click();
    await this.page.locator('[data-testid="confirm-delete-button"]').click();
  }

  /**
   * Add note
   */
  async addNote(noteText: string): Promise<void> {
    await this.addNoteButton.click();
    await this.page.locator('[data-testid="note-input"]').fill(noteText);
    await this.page.locator('[data-testid="note-submit-button"]').click();
  }
}
