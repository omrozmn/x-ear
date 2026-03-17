import { Page, Locator, expect } from '@playwright/test';

/**
 * Table Helper - Table operations and assertions
 * 
 * Provides reusable patterns for:
 * - Table row operations
 * - Cell value extraction
 * - Sorting
 * - Filtering
 * - Pagination
 * - Row selection
 */
export class TableHelper {
  constructor(private page: Page) {}

  // ================== Row Operations ==================

  /**
   * Get all table rows
   */
  getRows(tableTestId?: string): Locator {
    if (tableTestId) {
      return this.page.locator(`[data-testid="${tableTestId}"] tbody tr`);
    }
    return this.page.locator('table tbody tr');
  }

  /**
   * Get row count
   */
  async getRowCount(tableTestId?: string): Promise<number> {
    return this.getRows(tableTestId).count();
  }

  /**
   * Get specific row by index
   */
  getRow(index: number, tableTestId?: string): Locator {
    return this.getRows(tableTestId).nth(index);
  }

  /**
   * Find row that contains text
   */
  async findRow(text: string, tableTestId?: string): Promise<Locator> {
    const rows = this.getRows(tableTestId);
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent();
      if (rowText?.includes(text)) {
        return rows.nth(i);
      }
    }
    
    throw new Error(`Row containing "${text}" not found`);
  }

  // ================== Cell Operations ==================

  /**
   * Get cell value by row and column index
   */
  async getCellValue(rowIndex: number, columnIndex: number, tableTestId?: string): Promise<string> {
    const row = this.getRow(rowIndex, tableTestId);
    const cell = row.locator('td').nth(columnIndex);
    return cell.textContent() || '';
  }

  /**
   * Get cell by test ID within row
   */
  getCellByTestId(row: Locator, cellTestId: string): Locator {
    return row.locator(`[data-testid="${cellTestId}"]`);
  }

  /**
   * Get all cells in a row
   */
  getCells(row: Locator): Locator {
    return row.locator('td');
  }

  // ================== Header Operations ==================

  /**
   * Get table headers
   */
  getHeaders(tableTestId?: string): Locator {
    if (tableTestId) {
      return this.page.locator(`[data-testid="${tableTestId}"] thead th`);
    }
    return this.page.locator('table thead th');
  }

  /**
   * Get header index by text
   */
  async getHeaderIndex(headerText: string, tableTestId?: string): Promise<number> {
    const headers = this.getHeaders(tableTestId);
    const count = await headers.count();
    
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.includes(headerText)) {
        return i;
      }
    }
    
    throw new Error(`Header "${headerText}" not found`);
  }

  /**
   * Get cell value by header name
   */
  async getCellByHeaderName(rowIndex: number, headerText: string, tableTestId?: string): Promise<string> {
    const columnIndex = await this.getHeaderIndex(headerText, tableTestId);
    return this.getCellValue(rowIndex, columnIndex, tableTestId);
  }

  // ================== Sorting ==================

  /**
   * Click header to sort
   */
  async sortByColumn(columnText: string, tableTestId?: string): Promise<void> {
    const headers = this.getHeaders(tableTestId);
    const count = await headers.count();
    
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.includes(columnText)) {
        await headers.nth(i).click();
        await this.page.waitForLoadState('networkidle');
        return;
      }
    }
    
    throw new Error(`Column "${columnText}" not found`);
  }

  /**
   * Get sort direction (asc/desc/none)
   */
  async getSortDirection(columnText: string, tableTestId?: string): Promise<'asc' | 'desc' | 'none'> {
    const headers = this.getHeaders(tableTestId);
    const count = await headers.count();
    
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.includes(columnText)) {
        const header = headers.nth(i);
        const classAttr = await header.getAttribute('class') || '';
        
        if (classAttr.includes('asc')) return 'asc';
        if (classAttr.includes('desc')) return 'desc';
        return 'none';
      }
    }
    
    return 'none';
  }

  // ================== Row Selection ==================

  /**
   * Select row by checkbox
   */
  async selectRow(rowIndex: number, tableTestId?: string): Promise<void> {
    const row = this.getRow(rowIndex, tableTestId);
    const checkbox = row.locator('input[type="checkbox"]');
    await checkbox.check();
  }

  /**
   * Select all rows
   */
  async selectAll(tableTestId?: string): Promise<void> {
    const selectAll = this.page.locator(`[data-testid="${tableTestId}-select-all"], thead input[type="checkbox"]`);
    await selectAll.check();
  }

  /**
   * Get selected row count
   */
  async getSelectedCount(tableTestId?: string): Promise<number> {
    const checked = this.page.locator(`[data-testid="${tableTestId}"] tbody input[type="checkbox"]:checked`);
    return checked.count();
  }

  // ================== Action Buttons ==================

  /**
   * Click action button in row
   */
  async clickRowAction(rowIndex: number, actionTestId: string, tableTestId?: string): Promise<void> {
    const row = this.getRow(rowIndex, tableTestId);
    await row.locator(`[data-testid="${actionTestId}"]`).click();
  }

  /**
   * Click edit in row
   */
  async editRow(rowIndex: number, tableTestId?: string): Promise<void> {
    await this.clickRowAction(rowIndex, 'edit-button', tableTestId);
  }

  /**
   * Click delete in row
   */
  async deleteRow(rowIndex: number, tableTestId?: string): Promise<void> {
    await this.clickRowAction(rowIndex, 'delete-button', tableTestId);
  }

  /**
   * Click view in row
   */
  async viewRow(rowIndex: number, tableTestId?: string): Promise<void> {
    await this.clickRowAction(rowIndex, 'view-button', tableTestId);
  }

  // ================== Pagination ==================

  /**
   * Get pagination info
   */
  async getPaginationInfo(paginationTestId?: string): Promise<{ current: number; pageSize: number; total: number }> {
    const pagination = paginationTestId
      ? this.page.locator(`[data-testid="${paginationTestId}"]`)
      : this.page.locator('.ant-pagination, .pagination');
    
    const text = await pagination.textContent() || '';
    
    // Parse "Page 1 of 10 (100 items)"
    const currentMatch = text.match(/Page (\d+)/);
    const totalMatch = text.match(/of (\d+)/);
    const sizeMatch = text.match(/(\d+)\s*items?/);
    
    return {
      current: currentMatch ? parseInt(currentMatch[1]) : 1,
      pageSize: sizeMatch ? parseInt(sizeMatch[1]) : 10,
      total: totalMatch ? parseInt(totalMatch[1]) : 0,
    };
  }

  /**
   * Go to next page
   */
  async nextPage(paginationTestId?: string): Promise<void> {
    const nextBtn = this.page.locator(`[data-testid="${paginationTestId}-next"], .ant-pagination-next`);
    await nextBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Go to previous page
   */
  async previousPage(paginationTestId?: string): Promise<void> {
    const prevBtn = this.page.locator(`[data-testid="${paginationTestId}-prev"], .ant-pagination-prev`);
    await prevBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Go to specific page
   */
  async goToPage(pageNumber: number, paginationTestId?: string): Promise<void> {
    const pageInput = this.page.locator(`[data-testid="${paginationTestId}-input"]`);
    await pageInput.fill(String(pageNumber));
    await pageInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Change page size
   */
  async changePageSize(size: number, pageSizeTestId?: string): Promise<void> {
    const sizeSelect = this.page.locator(`[data-testid="${pageSizeTestId}"], .ant-pagination-options .ant-select`);
    await sizeSelect.click();
    await this.page.locator(`.ant-select-dropdown [role="option"]:has-text("${size}")`).click();
    await this.page.waitForLoadState('networkidle');
  }

  // ================== Empty State ==================

  /**
   * Check if table is empty
   */
  async isEmpty(tableTestId?: string): Promise<boolean> {
    const emptyState = this.page.locator(`[data-testid="${tableTestId}-empty"], .ant-empty-description`);
    return emptyState.isVisible();
  }

  /**
   * Get empty state message
   */
  async getEmptyMessage(tableTestId?: string): Promise<string> {
    const emptyState = this.page.locator(`[data-testid="${tableTestId}-empty"], .ant-empty-description`);
    return emptyState.textContent() || '';
  }

  // ================== Loading State ==================

  /**
   * Wait for table to load
   */
  async waitForLoad(tableTestId?: string): Promise<void> {
    // Wait for loading to disappear
    const loading = this.page.locator(`[data-testid="${tableTestId}-loading"], .ant-spin`);
    await loading.waitFor({ state: 'hidden' }).catch(() => {});
    
    // Wait for network idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if table is loading
   */
  async isLoading(tableTestId?: string): Promise<boolean> {
    const loading = this.page.locator(`[data-testid="${tableTestId}-loading"], .ant-spin`);
    return loading.isVisible();
  }

  // ================== Assertions ==================

  /**
   * Assert row count
   */
  async expectRowCount(expected: number, tableTestId?: string): Promise<void> {
    const count = await this.getRowCount(tableTestId);
    expect(count).toBe(expected);
  }

  /**
   * Assert cell value
   */
  async expectCellValue(rowIndex: number, columnIndex: number, expected: string, tableTestId?: string): Promise<void> {
    const value = await this.getCellValue(rowIndex, columnIndex, tableTestId);
    expect(value).toContain(expected);
  }

  /**
   * Assert table contains text
   */
  async expectContains(text: string, tableTestId?: string): Promise<void> {
    const rows = this.getRows(tableTestId);
    const count = await rows.count();
    let found = false;
    
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent();
      if (rowText?.includes(text)) {
        found = true;
        break;
      }
    }
    
    expect(found).toBe(true);
  }
}
