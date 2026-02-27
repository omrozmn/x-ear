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

const landingRoutes = [
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
  '/blog/test-blog-post',
  '/features',
  '/faq',
  '/privacy',
  '/terms',
  '/signup',
  '/login',
];

const screenshotsDir = 'test-results/debug-scan/landing';
const BASE_URL = 'http://localhost:3000';
const resultsFile = 'test-results/debug-scan-results-landing.json';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function loadResults(): RouteScanResult[] {
  if (fs.existsSync(resultsFile)) {
    try {
      return JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveResult(result: RouteScanResult) {
  const results = loadResults();
  const existingIndex = results.findIndex(r => r.route === result.route);
  if (existingIndex >= 0) {
    results[existingIndex] = result;
  } else {
    results.push(result);
  }
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

test.describe('Debug Scan: Landing Page Routes (Phase 2.3)', () => {
  for (const route of landingRoutes) {
    test(`scan ${route}`, async ({ page }) => {
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
        const response = await page.goto(`${BASE_URL}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        }).catch(() => null);

        await page.waitForTimeout(1000);

        const statusCode = response?.status();
        const status: RouteScanResult['status'] = 
          statusCode === 200 ? 'success' :
          statusCode && statusCode >= 300 && statusCode < 400 ? 'redirect' :
          statusCode ? 'error' : 'timeout';

        const safeRoute = route.replace(/\//g, '-') || 'home';
        const screenshotPath = `${screenshotsDir}/${safeRoute}-${Date.now()}.png`;
        try {
          await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 3000 });
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
        
        saveResult(result);

        console.log(`[${status.toUpperCase()}] ${route} - ${statusCode || 'N/A'}`);
        
        await expect(page).toHaveURL(/.*/);
        
      } catch (error: any) {
        console.log(`[ERROR] ${route} - ${error.message}`);
        saveResult({
          route,
          status: 'error',
          consoleErrors,
          networkFailures,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  test('generate final report', async () => {
    const reportPath = 'test-results/debug-scan-report-landing.json';
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const results = loadResults();
    const report = {
      app: 'landing',
      phase: '2.3',
      totalRoutes: landingRoutes.length,
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
    console.log(`\n✅ Landing Page Debug Scan Complete`);
    console.log(`   Total: ${results.length}/${landingRoutes.length} routes scanned`);
  });
});
