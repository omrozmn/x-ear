import { chromium } from '@playwright/test';
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

// Complete Web App routes (31 routes as per tasks.md)
const webRoutes = [
  '/login',
  '/forgot-password',
  '/dashboard',
  '/parties',
  '/parties/test-party-id',
  '/sales',
  '/sales/test-sale-id',
  '/payments',
  '/appointments',
  '/communication',
  '/settings',
  '/settings/users',
  '/settings/branches',
  '/settings/roles',
  '/settings/general',
  '/invoices',
  '/devices',
  '/inventory',
  '/cash-register',
  '/reports',
  '/reports/sales',
  '/reports/collections',
  '/reports/sgk',
  '/profile',
  '/campaigns',
  '/suppliers',
  '/pos',
  '/automation',
  '/cashflow',
];

const screenshotsDir = 'test-results/debug-scan/web';

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function scanRoutes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results: RouteScanResult[] = [];
  
  const baseURL = process.env.WEB_BASE_URL || 'http://localhost:8080';
  
  for (const route of webRoutes) {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
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
      console.log(`\n🔍 Scanning: ${route}`);
      
      const response = await page.goto(`${baseURL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      }).catch(() => null);

      // Wait for any dynamic content to load
      await page.waitForTimeout(1500);

      const statusCode = response?.status();
      const status: RouteScanResult['status'] = 
        statusCode === 200 ? 'success' :
        statusCode && statusCode >= 300 && statusCode < 400 ? 'redirect' :
        statusCode ? 'error' : 'timeout';

      // Take screenshot
      const safeRouteName = route.replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '-') || 'home';
      const screenshotPath = `${screenshotsDir}/${safeRouteName}.png`;
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
      console.log(`  ✅ ${status.toUpperCase()} - ${statusCode || 'N/A'}`);
      if (consoleErrors.length > 0) {
        console.log(`  📛 Console errors (${consoleErrors.length}):`);
        consoleErrors.slice(0, 2).forEach(e => console.log(`     - ${e.substring(0, 60)}`));
      }
      if (networkFailures.length > 0) {
        console.log(`  🌐 Network failures (${networkFailures.length}):`);
        networkFailures.slice(0, 2).forEach(e => console.log(`     - ${e.substring(0, 60)}`));
      }
      
    } catch (error: any) {
      console.log(`  ❌ ERROR: ${error.message.substring(0, 60)}`);
      results.push({
        route,
        status: 'error',
        consoleErrors,
        networkFailures,
        timestamp: new Date().toISOString(),
      });
    }
  }

  await browser.close();

  // Generate report
  const reportPath = 'test-results/debug-scan-report-web.json';
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const report = {
    app: 'web',
    phase: '2.1',
    totalRoutes: webRoutes.length,
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
  
  console.log(`\n✅ Web App Debug Scan Complete!`);
  console.log(`   Report: ${reportPath}`);
  console.log(`   Total: ${report.summary.success + report.summary.error + report.summary.redirect + report.summary.timeout}/${webRoutes.length}`);
  console.log(`   Success: ${report.summary.success}`);
  console.log(`   Errors: ${report.summary.error}`);
  console.log(`   Routes with console errors: ${report.summary.routesWithConsoleErrors}`);
  console.log(`   Routes with network failures: ${report.summary.routesWithNetworkFailures}`);
}

scanRoutes().catch(console.error);
