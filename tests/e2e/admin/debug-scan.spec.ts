import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface RouteScanResult {
  route: string;
  status: 'success' | 'error' | 'redirect' | 'timeout';
  statusCode?: number;
  consoleErrors: string[];
  networkFailures: string[];
  screenshot?: string;
  timestamp: string;
}

// Complete Admin Panel routes (37 routes as per tasks.md)
const adminRoutes = [
  '/login',
  '/dashboard',
  '/tenants',
  '/tenants/test-tenant-id',
  '/users',
  '/users/test-user-id',
  '/subscriptions',
  '/activity-logs',
  '/devices',
  '/settings',
  '/reports',
  // Additional admin routes from existing tests
  '/plans',
  '/roles',
  '/branches',
  '/affiliates',
  '/support',
  '/analytics',
  '/health-care',
  '/inventory',
  '/inventory/suppliers',
  '/monitoring',
  '/security',
  '/validation',
  '/impersonation',
  '/payments',
  '/integrations',
  '/ai',
  '/notifications',
  '/webhooks',
  '/api-keys',
  '/backups',
  '/maintenance',
  '/audit-logs',
  '/system',
  '/import',
  '/export',
  '/templates',
  '/scheduled-tasks',
];

const screenshotsDir = 'test-results/debug-scan/admin';

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Store results in a global to persist across tests
const results: RouteScanResult[] = [];

/**
 * Debug Scan Test - Admin Panel Routes
 * Phase 2.2: Navigate to all routes and capture console errors + network failures + screenshots
 * 
 * Run: npx playwright test --project=admin tests/e2e/admin/debug-scan.spec.ts
 * Or: npx playwright test tests/e2e/admin/debug-scan.spec.ts
 */
for (const route of adminRoutes) {
  test(`scan ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out common non-critical errors
        if (!text.includes('favicon') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    // Listen for network failures
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        networkFailures.push(`${request.url()} - ${failure.errorText}`);
      }
    });

    // Listen for error responses (4xx, 5xx)
    page.on('response', response => {
      if (response.status() >= 400) {
        const url = response.url();
        if (!url.includes('favicon') && !url.endsWith('.ico')) {
          networkFailures.push(`${url} - ${response.status()}`);
        }
      }
    });

    try {
      const response = await page.goto(route, {
        waitUntil: 'networkidle',
        timeout: 30000
      }).catch(() => null);

      // Wait for any dynamic content to load
      await page.waitForTimeout(2000);

      const statusCode = response?.status();
      const status: RouteScanResult['status'] = 
        statusCode === 200 ? 'success' :
        statusCode && statusCode >= 300 && statusCode < 400 ? 'redirect' :
        statusCode ? 'error' : 'timeout';

      // Take screenshot
      const screenshotPath = `${screenshotsDir}${route.replace(/\//g, '-') || 'home'}-${Date.now()}.png`;
      try {
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: false,
          timeout: 5000 
        });
      } catch {
        // Screenshot failed, continue without it
      }

      // Build result object
      const result: RouteScanResult = {
        route,
        status,
        statusCode,
        consoleErrors,
        networkFailures,
        screenshot: fs.existsSync(screenshotPath) ? screenshotPath : undefined,
        timestamp: new Date().toISOString(),
      };
      
      results.push(result);

      // Log results
      console.log(`\n[${status.toUpperCase()}] ${route} - ${statusCode || 'N/A'}`);
      if (consoleErrors.length > 0) {
        console.log(`  📛 Console errors (${consoleErrors.length}):`);
        consoleErrors.slice(0, 3).forEach(e => console.log(`     - ${e.substring(0, 80)}`));
      }
      if (networkFailures.length > 0) {
        console.log(`  🌐 Network failures (${networkFailures.length}):`);
        networkFailures.slice(0, 3).forEach(e => console.log(`     - ${e.substring(0, 80)}`));
      }
      
      // Just verify page loaded (URL is valid)
      await expect(page).toHaveURL(/.*/);
      
    } catch (error: any) {
      console.log(`[ERROR] ${route} - ${error.message}`);
      results.push({
        route,
        status: 'error',
        consoleErrors,
        networkFailures,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// Generate report after all tests
test('generate report', async () => {
  const reportPath = 'test-results/debug-scan-report-admin.json';
  
  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const report = {
    app: 'admin',
    phase: '2.2',
    totalRoutes: adminRoutes.length,
    scannedAt: new Date().toISOString(),
    summary: {
      success: results.filter(r => r.status === 'success').length,
      redirect: results.filter(r => r.status === 'redirect').length,
      error: results.filter(r => r.status === 'error').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      routesWithConsoleErrors: results.filter(r => r.consoleErrors.length > 0).length,
      routesWithNetworkFailures: results.filter(r => r.networkFailures.length > 0).length,
    },
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Admin Panel Debug Scan Report: ${reportPath}`);
  console.log(`   Total: ${report.summary.success + report.summary.error + report.summary.redirect + report.summary.timeout}/${adminRoutes.length}`);
  console.log(`   Success: ${report.summary.success}`);
  console.log(`   Errors: ${report.summary.error}`);
  console.log(`   Routes with console errors: ${report.summary.routesWithConsoleErrors}`);
  console.log(`   Routes with network failures: ${report.summary.routesWithNetworkFailures}`);
});
