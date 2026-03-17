import { Page, Locator } from '@playwright/test';

/**
 * Landing Blog Page Object Model
 * Phase 5.5.8 - POM for blog listing and detail pages
 */
export class LandingBlogPage {
  readonly page: Page;
  
  // Blog list
  readonly blogCards: Locator;
  readonly blogTitles: Locator;
  readonly blogLinks: Locator;
  readonly pagination: Locator;
  
  // Blog detail
  readonly articleContent: Locator;
  readonly articleTitle: Locator;
  readonly relatedPosts: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // List
    this.blogCards = page.locator('article, [class*="blog-card"], [class*="post-card"]');
    this.blogTitles = page.locator('article h2, [class*="blog"] h2, [class*="post-title"]');
    this.blogLinks = page.locator('article a, [class*="blog"] a');
    this.pagination = page.locator('[class*="pagination"], nav[aria-label="pagination"]');
    
    // Detail
    this.articleContent = page.locator('article, main, [class*="blog-content"]');
    this.articleTitle = page.locator('article h1, h1');
    this.relatedPosts = page.locator('[class*="related"], [class*="similar"]');
  }

  /**
   * Navigate to blog list
   */
  async goto(): Promise<void> {
    const baseUrl = process.env.LANDING_BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}/blog`);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.page.locator('body').isVisible();
  }

  /**
   * Get blog post count
   */
  async getBlogCount(): Promise<number> {
    return this.blogCards.count();
  }

  /**
   * Click blog post by index
   */
  async clickBlogPost(index: number = 0): Promise<void> {
    await this.blogLinks.nth(index).click();
  }

  /**
   * Get blog titles
   */
  async getBlogTitles(): Promise<string[]> {
    const count = await this.blogTitles.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await this.blogTitles.nth(i).textContent();
      if (text) titles.push(text.trim());
    }
    
    return titles;
  }

  /**
   * Check if pagination exists
   */
  async hasPagination(): Promise<boolean> {
    return this.pagination.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if related posts exist
   */
  async hasRelatedPosts(): Promise<boolean> {
    return this.relatedPosts.isVisible({ timeout: 2000 }).catch(() => false);
  }
}
