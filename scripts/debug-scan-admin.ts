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

// Admin Panel routes (37 routes as per tasks.md)
const adminRoutes = [
  '/login',
  '/dashboard',
  '/tenants',
  '/tenants/test-id',
  '/users',
  '/users/test-id',
  '/subscriptions',
  '/activity-logs',
  '/devices',
  '/settings',
  '/reports',
  // Add more routes based on the spec
];

const screenshotsDir = 'test-results/debug-scan/admin';

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function scanRoutes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results: RouteScanResult[] = [];
  
  const baseURL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';
  
  for (const route of adminRoutes) {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('404')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        networkFailures.push(`${request.url()} - ${failure.errorText}`);
      }
    });

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

      await page.waitForTimeout(1500);

      const statusCode = response?.status();
      const status: RouteScanResult['status'] = 
        statusCode === 200 ? 'success' :
        statusCode && statusCode >= 300 && statusCode < 400 ? 'redirect' :
        statusCode ? 'error' : 'timeout';

      const safeRouteName = route.replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '-') || 'home';
      const screenshotPath = `${screenshotsDir}/${safeRouteName}.png`;
      try {
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: false,
          timeout: 5000 
        });
      } catch {}

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

  const reportPath = 'test-results/debug-scan-report-admin.json';
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
  
  console.log(`\n✅ Admin Panel Debug Scan Complete!`);
  console.log(`   Report: ${reportPath}`);
  console.log(`   Total: ${report.summary.success + report.summary.error + report.summary.redirect + report.summary.timeout}/${adminRoutes.length}`);
  console.log(`   Success: ${report.summary.success}`);
  console.log(`   Errors: ${report.summary.error}`);
  console.log(`   Routes with console errors: ${report.summary.routesWithConsoleErrors}`);
  console.log(`   Routes with network failures: ${report.summary.routesWithNetworkFailures}`);
}

scanRoutes().catch(console.error);
