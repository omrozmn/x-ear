import { Page, Locator, APIResponse } from '@playwright/test';

/**
 * CRUD Helper - Generic Create, Read, Update, Delete operations
 * 
 * Provides reusable patterns for:
 * - List operations (search, filter, pagination)
 * - Create operations (form fill, submit)
 * - Update operations (edit, save)
 * - Delete operations (confirm, cancel)
 * - Bulk operations (select all, select multiple)
 */
export class CrudHelper {
  constructor(private page: Page) {}

  // ================== List Operations ==================

  /**
   * Search for an item in a list
   */
  async searchInList(searchInputTestId: string, searchTerm: string): Promise<void> {
    const searchInput = this.page.locator(`[data-testid="${searchInputTestId}"]`);
    await searchInput.clear();
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    // Wait for results to update
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click action button in a table row
   */
  async clickRowAction(rowIndex: number, actionTestId: string): Promise<void> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.locator(`[data-testid="${actionTestId}"]`).click();
  }

  /**
   * Get row count in a table
   */
  async getRowCount(tableTestId?: string): Promise<number> {
    const table = tableTestId 
      ? this.page.locator(`[data-testid="${tableTestId}"] tbody tr`)
      : this.page.locator('tbody tr');
    return table.count();
  }

  /**
   * Find row by cell text
   */
  async findRowByText(columnIndex: number, text: string): Promise<Locator> {
    const rows = this.page.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const cell = rows.nth(i).locator(`td`).nth(columnIndex);
      const cellText = await cell.textContent();
      if (cellText?.includes(text)) {
        return rows.nth(i);
      }
    }
    
    throw new Error(`Row with text "${text}" not found in column ${columnIndex}`);
  }

  // ================== Pagination ==================

  /**
   * Navigate to next page
   */
  async goToNextPage(nextButtonTestId: string): Promise<void> {
    const nextBtn = this.page.locator(`[data-testid="${nextButtonTestId}"]`);
    await nextBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage(prevButtonTestId: string): Promise<void> {
    const prevBtn = this.page.locator(`[data-testid="${prevButtonTestId}"]`);
    await prevBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Go to specific page number
   */
  async goToPage(pageNumber: number, pageInputTestId: string): Promise<void> {
    const pageInput = this.page.locator(`[data-testid="${pageInputTestId}"]`);
    await pageInput.clear();
    await pageInput.fill(String(pageNumber));
    await pageInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if pagination exists and get current page info
   */
  async getPaginationInfo(paginationTestId: string): Promise<{ current: number; total: number }> {
    const pagination = this.page.locator(`[data-testid="${paginationTestId}"]`);
    const text = await pagination.textContent() || '';
    
    // Format: "Page 1 of 10" or "1 / 10"
    const match = text.match(/(\d+)\s*[\/of]+\s*(\d+)/i);
    if (match) {
      return { current: parseInt(match[1]), total: parseInt(match[2]) };
    }
    
    return { current: 1, total: 1 };
  }

  // ================== Create Operations ==================

  /**
   * Open create form/modal
   */
  async openCreateForm(createButtonTestId: string): Promise<void> {
    const createBtn = this.page.locator(`[data-testid="${createButtonTestId}"]`);
    await createBtn.click();
    // Wait for modal/form to appear
    await this.page.waitForSelector('[role="dialog"], [data-testid*="modal"]', { state: 'visible' });
  }

  /**
   * Fill and submit create form
   */
  async fillAndSubmitForm(fields: Record<string, string>, submitButtonTestId: string): Promise<void> {
    for (const [fieldTestId, value] of Object.entries(fields)) {
      const field = this.page.locator(`[data-testid="${fieldTestId}"]`);
      await field.fill(value);
    }
    
    const submitBtn = this.page.locator(`[data-testid="${submitButtonTestId}"]`);
    await submitBtn.click();
  }

  // ================== Update Operations ==================

  /**
   * Click edit button for a specific row
   */
  async openEditForm(rowIndex: number, editButtonTestId: string): Promise<void> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.locator(`[data-testid="${editButtonTestId}"]`).click();
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  }

  /**
   * Save form after editing
   */
  async saveForm(saveButtonTestId: string): Promise<void> {
    const saveBtn = this.page.locator(`[data-testid="${saveButtonTestId}"]`);
    await saveBtn.click();
    // Wait for modal to close
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  }

  // ================== Delete Operations ==================

  /**
   * Click delete button for a row and confirm
   */
  async deleteRow(rowIndex: number, deleteButtonTestId: string, confirmButtonTestId: string): Promise<void> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.locator(`[data-testid="${deleteButtonTestId}"]`).click();
    
    // Wait for confirm dialog
    await this.page.waitForSelector('[role="alertdialog"], .confirm-dialog', { state: 'visible' });
    
    const confirmBtn = this.page.locator(`[data-testid="${confirmButtonTestId}"]`);
    await confirmBtn.click();
    
    // Wait for row to disappear
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cancel delete operation
   */
  async cancelDelete(rowIndex: number, deleteButtonTestId: string, cancelButtonTestId: string): Promise<void> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.locator(`[data-testid="${deleteButtonTestId}"]`).click();
    
    const cancelBtn = this.page.locator(`[data-testid="${cancelButtonTestId}"]`);
    await cancelBtn.click();
  }

  // ================== Bulk Operations ==================

  /**
   * Select all rows (checkbox)
   */
  async selectAll(selectAllCheckboxTestId: string): Promise<void> {
    const checkbox = this.page.locator(`[data-testid="${selectAllCheckboxTestId}"]`);
    await checkbox.check();
  }

  /**
   * Select specific row by checkbox
   */
  async selectRow(rowIndex: number, checkboxTestId: string): Promise<void> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.locator(`[data-testid="${checkboxTestId}"]`).check();
  }

  /**
   * Bulk delete selected rows
   */
  async bulkDelete(bulkDeleteButtonTestId: string, confirmButtonTestId: string): Promise<void> {
    const deleteBtn = this.page.locator(`[data-testid="${bulkDeleteButtonTestId}"]`);
    await deleteBtn.click();
    
    await this.page.waitForSelector('[role="alertdialog"]', { state: 'visible' });
    
    const confirmBtn = this.page.locator(`[data-testid="${confirmButtonTestId}"]`);
    await confirmBtn.click();
    
    await this.page.waitForLoadState('networkidle');
  }

  // ================== Filter Operations ==================

  /**
   * Apply filter by selecting from dropdown
   */
  async applyFilter(filterDropdownTestId: string, optionText: string): Promise<void> {
    const dropdown = this.page.locator(`[data-testid="${filterDropdownTestId}"]`);
    await dropdown.click();
    
    const option = this.page.locator(`.ant-select-dropdown [role="option"]:has-text("${optionText}")`);
    await option.click();
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Apply date range filter
   */
  async applyDateFilter(startDateTestId: string, endDateTestId: string, startDate: string, endDate: string): Promise<void> {
    const startInput = this.page.locator(`[data-testid="${startDateTestId}"]`);
    const endInput = this.page.locator(`[data-testid="${endDateTestId}"]`);
    
    await startInput.fill(startDate);
    await endInput.fill(endDate);
    
    // Trigger filter
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear all filters
   */
  async clearFilters(clearButtonTestId?: string): Promise<void> {
    if (clearButtonTestId) {
      await this.page.locator(`[data-testid="${clearButtonTestId}"]`).click();
    } else {
      // Try common clear filter buttons
      const clearButtons = this.page.locator('[data-testid*="clear"], button:has-text("Clear"), button:has-text("Reset")');
      if (await clearButtons.count() > 0) {
        await clearButtons.first().click();
      }
    }
    await this.page.waitForLoadState('networkidle');
  }

  // ================== Sort Operations ==================

  /**
   * Click column header to sort
   */
  async sortByColumn(columnHeaderTestId: string): Promise<void> {
    const header = this.page.locator(`[data-testid="${columnHeaderTestId}"]`);
    await header.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Toggle sort direction (asc/desc)
   */
  async toggleSort(columnHeaderTestId: string): Promise<void> {
    const header = this.page.locator(`[data-testid="${columnHeaderTestId}"]`);
    await header.click();
    await header.click();
    await this.page.waitForLoadState('networkidle');
  }
}
