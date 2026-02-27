import { Page, Locator, ConsoleMessage, Response, Request } from '@playwright/test';

/**
 * Debug Helper - Debugging and diagnostic utilities
 * 
 * Provides utilities for:
 * - Console error capture and reporting
 * - Network request/response logging
 * - Screenshot capture
 * - HTML dump
 * - Performance metrics
 * - State inspection
 */
export class DebugHelper {
  constructor(private page: Page) {}

  // ================== Console Logging ==================

  /**
   * Capture all console messages
   */
  async captureConsole(): Promise<ConsoleMessage[]> {
    const messages: ConsoleMessage[] = [];
    
    this.page.on('console', msg => {
      messages.push(msg);
    });
    
    // Wait a bit to capture async messages
    await this.page.waitForTimeout(1000);
    
    return messages;
  }

  /**
   * Capture only error messages
   */
  async captureConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await this.page.waitForTimeout(1000);
    
    return errors;
  }

  /**
   * Capture console by type
   */
  async captureConsoleByType(type: 'log' | 'info' | 'warn' | 'error'): Promise<string[]> {
    const messages: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === type) {
        messages.push(msg.text());
      }
    });
    
    await this.page.waitForTimeout(1000);
    
    return messages;
  }

  /**
   * Print console messages to console
   */
  async printConsole(): Promise<void> {
    const messages = await this.captureConsole();
    
    console.log('=== Console Messages ===');
    for (const msg of messages) {
      console.log(`[${msg.type()}] ${msg.text()}`);
    }
    console.log('========================');
  }

  // ================== Network Logging ==================

  /**
   * Capture all network requests
   */
  async captureNetworkRequests(): Promise<Request[]> {
    const requests: Request[] = [];
    
    this.page.on('request', req => {
      requests.push(req);
    });
    
    await this.page.waitForTimeout(2000);
    
    return requests;
  }

  /**
   * Capture failed requests
   */
  async captureFailedRequests(): Promise<{ url: string; failure: string }[]> {
    const failures: { url: string; failure: string }[] = [];
    
    this.page.on('requestfailed', req => {
      const failure = req.failure();
      failures.push({
        url: req.url(),
        failure: failure?.errorText || 'Unknown failure',
      });
    });
    
    await this.page.waitForTimeout(2000);
    
    return failures;
  }

  /**
   * Capture responses with specific status
   */
  async captureResponsesByStatus(status: number): Promise<Response[]> {
    const responses: Response[] = [];
    
    this.page.on('response', res => {
      if (res.status() === status) {
        responses.push(res);
      }
    });
    
    await this.page.waitForTimeout(2000);
    
    return responses;
  }

  /**
   * Capture error responses (4xx, 5xx)
   */
  async captureErrorResponses(): Promise<{ url: string; status: number }[]> {
    const errors: { url: string; status: number }[] = [];
    
    this.page.on('response', res => {
      if (res.status() >= 400) {
        errors.push({
          url: res.url(),
          status: res.status(),
        });
      }
    });
    
    await this.page.waitForTimeout(2000);
    
    return errors;
  }

  // ================== Screenshot Capture ==================

  /**
   * Take screenshot with custom name
   */
  async screenshot(name: string, fullPage = false): Promise<string> {
    const path = `test-results/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage });
    return path;
  }

  /**
   * Take screenshot of element
   */
  async screenshotElement(testId: string, name: string): Promise<string> {
    const element = this.page.locator(`[data-testid="${testId}"]`);
    const path = `test-results/screenshots/${name}-${Date.now()}.png`;
    await element.screenshot({ path });
    return path;
  }

  /**
   * Take screenshot on failure (helper for test hooks)
   */
  async screenshotOnFailure(testName: string): Promise<string> {
    const safeName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return this.screenshot(`failure_${safeName}`, true);
  }

  // ================== HTML & DOM ==================

  /**
   * Get page HTML
   */
  async getHtml(selector?: string): Promise<string> {
    if (selector) {
      return this.page.locator(selector).innerHTML();
    }
    return this.page.content();
  }

  /**
   * Print HTML for debugging
   */
  async printHtml(selector?: string): Promise<void> {
    const html = await this.getHtml(selector);
    console.log('=== HTML Dump ===');
    console.log(html);
    console.log('=================');
  }

  /**
   * Get element info
   */
  async getElementInfo(testId: string): Promise<{
    text: string;
    html: string;
    attributes: Record<string, string>;
    visible: boolean;
    count: number;
  }> {
    const element = this.page.locator(`[data-testid="${testId}"]`);
    const count = await element.count();
    
    if (count === 0) {
      return {
        text: '',
        html: '',
        attributes: {},
        visible: false,
        count: 0,
      };
    }
    
    const first = element.first();
    const text = await first.textContent() || '';
    const html = await first.innerHTML();
    const visible = await first.isVisible();
    
    // Get all attributes
    const attrs: Record<string, string> = {};
    const handle = await first.evaluateHandle(el => {
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(el.attributes)) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });
    const attrsObj = handle.asElement() as unknown as Record<string, string>;
    
    return {
      text,
      html,
      attributes: attrsObj,
      visible,
      count,
    };
  }

  // ================== Performance ==================

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    navigationStart: number;
    loadEventEnd: number;
    domContentLoaded: number;
    firstPaint: number;
    firstContentfulPaint: number;
  }> {
    const metrics = await this.page.evaluate(() => {
      const timing = performance.timing;
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigationStart: timing.navigationStart,
        loadEventEnd: timing.loadEventEnd,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: paint.find(e => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
      };
    });
    
    return metrics;
  }

  /**
   * Measure page load time
   */
  async measureLoadTime(): Promise<number> {
    const start = Date.now();
    await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
    return Date.now() - start;
  }

  // ================== State Inspection ==================

  /**
   * Get localStorage
   */
  async getLocalStorage(): Promise<Record<string, string>> {
    return this.page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key) || '';
        }
      }
      return items;
    });
  }

  /**
   * Get sessionStorage
   */
  async getSessionStorage(): Promise<Record<string, string>> {
    return this.page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          items[key] = sessionStorage.getItem(key) || '';
        }
      }
      return items;
    });
  }

  /**
   * Get cookies
   */
  async getCookies() {
    return this.page.context().cookies();
  }

  /**
   * Get current URL and metadata
   */
  async getPageInfo(): Promise<{
    url: string;
    title: string;
    viewport: { width: number; height: number };
  }> {
    const url = this.page.url();
    const title = await this.page.title();
    const viewport = this.page.viewportSize();
    
    return {
      url,
      title,
      viewport: viewport || { width: 0, height: 0 },
    };
  }

  // ================== Combined Debug Reports ==================

  /**
   * Generate comprehensive debug report
   */
  async generateDebugReport(testName: string): Promise<string> {
    const lines: string[] = [];
    lines.push(`=== Debug Report: ${testName} ===`);
    lines.push(`Time: ${new Date().toISOString()}`);
    
    // Page info
    const pageInfo = await this.getPageInfo();
    lines.push(`\n--- Page Info ---`);
    lines.push(`URL: ${pageInfo.url}`);
    lines.push(`Title: ${pageInfo.title}`);
    lines.push(`Viewport: ${pageInfo.viewport.width}x${pageInfo.viewport.height}`);
    
    // Performance
    const perf = await this.getPerformanceMetrics();
    lines.push(`\n--- Performance ---`);
    lines.push(`DOM Content Loaded: ${perf.domContentLoaded}ms`);
    lines.push(`First Paint: ${perf.firstPaint}ms`);
    lines.push(`First Contentful Paint: ${perf.firstContentfulPaint}ms`);
    
    // Console errors
    const consoleErrors = await this.captureConsoleErrors();
    lines.push(`\n--- Console Errors (${consoleErrors.length}) ---`);
    consoleErrors.forEach(err => lines.push(`- ${err}`));
    
    // Network errors
    const networkErrors = await this.captureErrorResponses();
    lines.push(`\n--- Network Errors (${networkErrors.length}) ---`);
    networkErrors.forEach(err => lines.push(`- ${err.status}: ${err.url}`));
    
    lines.push(`\n======================`);
    
    return lines.join('\n');
  }

  /**
   * Print debug report to console
   */
  async printDebugReport(testName: string): Promise<void> {
    const report = await this.generateDebugReport(testName);
    console.log(report);
  }
}
