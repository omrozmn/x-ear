const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.resolve(__dirname, '../test-results/debug-scan');
  fs.mkdirSync(outDir, { recursive: true });

  const apps = [
    {
      name: 'web',
      baseUrl: process.env.WEB_BASE_URL || 'http://localhost:8080',
      routes: [
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
        '/remaining-route-1',
        '/remaining-route-2',
        '/remaining-route-3',
        '/remaining-route-4'
      ]
    },
    {
      name: 'admin',
      baseUrl: process.env.ADMIN_BASE_URL || 'http://localhost:8082',
      routes: [
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
        '/remaining-admin-route-1',
        '/remaining-admin-route-2',
        '/remaining-admin-route-3',
        '/remaining-admin-route-4',
        '/remaining-admin-route-5',
        '/remaining-admin-route-6',
        '/remaining-admin-route-7',
        '/remaining-admin-route-8',
        '/remaining-admin-route-9',
        '/remaining-admin-route-10',
        '/remaining-admin-route-11',
        '/remaining-admin-route-12',
        '/remaining-admin-route-13',
        '/remaining-admin-route-14',
        '/remaining-admin-route-15',
        '/remaining-admin-route-16',
        '/remaining-admin-route-17',
        '/remaining-admin-route-18',
        '/remaining-admin-route-19',
        '/remaining-admin-route-20',
        '/remaining-admin-route-21',
        '/remaining-admin-route-22',
        '/remaining-admin-route-23',
        '/remaining-admin-route-24'
      ]
    },
    {
      name: 'landing',
      baseUrl: process.env.LANDING_BASE_URL || 'http://localhost:3000',
      routes: [
        '/',
        '/about',
        '/pricing',
        '/contact',
        '/blog',
        '/blog/test-slug',
        '/features',
        '/faq',
        '/privacy',
        '/terms',
        '/remaining-landing-route-1'
      ]
    }
  ];

  for (const app of apps) {
    console.log(`Scanning ${app.name} (${app.baseUrl}) - ${app.routes.length} routes`);
    const results = [];
    const browser = await chromium.launch();

    for (const route of app.routes) {
      const routeSlug = route.replace(/[^a-z0-9]/gi, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '');
      const outPng = path.join(outDir, `${app.name}_${routeSlug || 'root'}.png`);
      const page = await browser.newPage();
      const consoleErrors = [];
      const networkFailures = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('requestfailed', req => {
        networkFailures.push(`${req.url()} - ${req.failure() && req.failure().errorText}`);
      });

      const fullUrl = app.baseUrl.replace(/\/$/, '') + route;
      let statusCode = null;
      let status = 'error';

      try {
        const response = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (response) {
          statusCode = response.status();
          if (statusCode === 200) status = 'success';
          else if (statusCode >= 300 && statusCode < 400) status = 'redirect';
          else if (statusCode >= 400) status = 'error';
        }

        // wait a bit for async console errors
        await page.waitForTimeout(1500);

        // screenshot
        try {
          await page.screenshot({ path: outPng, fullPage: true });
        } catch (e) {
          console.warn('screenshot failed for', fullUrl, e.message);
        }

      } catch (err) {
        console.warn('navigation error for', fullUrl, err && err.message);
      }

      results.push({
        route,
        url: fullUrl,
        status,
        statusCode,
        consoleErrors: Array.from(new Set(consoleErrors)).slice(0, 50),
        networkFailures: Array.from(new Set(networkFailures)).slice(0, 50),
        screenshot: fs.existsSync(outPng) ? path.relative(process.cwd(), outPng) : null,
        timestamp: new Date().toISOString()
      });

      try { await page.close(); } catch (e) {}
    }

    await browser.close();

    const outJson = path.join(outDir, `debug-scan-report-${app.name}.json`);
    fs.writeFileSync(outJson, JSON.stringify({ app: app.name, baseUrl: app.baseUrl, scannedAt: new Date().toISOString(), results }, null, 2));
    console.log(`Wrote ${outJson}`);
  }

  console.log('All scans complete');
  process.exit(0);
})();
