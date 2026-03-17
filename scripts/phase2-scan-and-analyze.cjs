const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../test-results/debug-scan');
fs.mkdirSync(outDir, { recursive: true });

const apps = [
  {
    name: 'web',
    baseUrl: process.env.WEB_BASE_URL || 'http://localhost:8080',
    routes: [
      "/login",
      "/forgot-password",
      "/dashboard",
      "/parties",
      "/appointments",
      "/invoices",
      "/devices",
      "/inventory",
      "/cashflow",
      "/reports",
      "/reports/sales",
      "/reports/collections",
      "/profile",
      "/settings",
      "/settings/team",
      "/settings/roles",
      "/settings/branches",
      "/settings/general",
      "/settings/integration",
      "/settings/subscription",
      "/campaigns",
      "/suppliers",
      "/pos",
      "/automation",
      "/invoices/purchases",
      "/invoices/new",
      "/invoices/payments",
      "/sgk",
      "/remaining-route-1",
      "/remaining-route-2",
      "/remaining-route-3"
    ]
  },
  {
    name: 'admin',
    baseUrl: process.env.ADMIN_BASE_URL || 'http://localhost:8082',
    routes: [
      "/login",
      "/dashboard",
      "/tenants",
      "/tenants/test-tenant-id",
      "/users",
      "/users/test-user-id",
      "/subscriptions",
      "/activity-logs",
      "/devices",
      "/settings",
      "/reports",
      "/plans",
      "/roles",
      "/branches",
      "/affiliates",
      "/support",
      "/analytics",
      "/health-care",
      "/inventory",
      "/monitoring",
      "/security",
      "/validation",
      "/impersonation",
      "/payments",
      "/integrations",
      "/remaining-admin-route-1",
      "/remaining-admin-route-2",
      "/remaining-admin-route-3",
      "/remaining-admin-route-4",
      "/remaining-admin-route-5",
      "/remaining-admin-route-6",
      "/remaining-admin-route-7",
      "/remaining-admin-route-8",
      "/remaining-admin-route-9",
      "/remaining-admin-route-10",
      "/remaining-admin-route-11"
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
      '/signup'
    ]
  }
];

function slug(route) {
  return route.replace(/[^a-z0-9]/gi, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '') || 'root';
}

function httpStatus(url) {
  // Use curl via spawnSync with timeout
  try {
    const res = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url], { timeout: 8000 });
    if (res.error) {
      return { code: null, error: res.error.message };
    }
    const out = res.stdout ? res.stdout.toString().trim() : '';
    if (out === '') return { code: null, error: 'no-response' };
    return { code: out };
  } catch (e) {
    return { code: null, error: e.message };
  }
}

function hasTestIdForRoute(route) {
  const keyword = (route === '/' ? 'home' : route.split('/').filter(Boolean).slice(-1)[0] || route.replace(/\//g, '_'));
  const alt1 = keyword.replace(/-/g, '_');
  const alt2 = keyword.replace(/-/g, '');
  const searchPaths = ['apps', 'packages', 'tests'];
  try {
    const grepCmd = `grep -R --line-number --no-color "data-testid=\"" ${searchPaths.join(' ')} 2>/dev/null | grep -i -E "${keyword}|${alt1}|${alt2}" | head -n 1 || true`;
    const out = execSync(grepCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return out && out.trim().length > 0;
  } catch (e) {
    return false;
  }
}

const analysis = {
  generatedAt: new Date().toISOString(),
  apps: {}
};

for (const app of apps) {
  const results = [];
  let success = 0, redirects = 0, errors = 0;
  for (const route of app.routes) {
    const url = app.baseUrl.replace(/\/$/, '') + route;
    const { code, error } = httpStatus(url);
    let status = 'error';
    let statusCode = null;
    if (code && code !== '000') {
      statusCode = Number(code);
      if (statusCode === 200) status = 'success';
      else if (statusCode >= 300 && statusCode < 400) status = 'redirect';
      else if (statusCode >= 400) status = 'error';
    } else {
      status = 'timeout';
    }

    if (status === 'success') success++;
    else if (status === 'redirect') redirects++;
    else errors++;

    const hasTestId = hasTestIdForRoute(route);

    results.push({ route, url, status, statusCode, consoleErrors: [], networkFailures: [], screenshot: null, hasTestId });
  }

  const outJson = path.join(outDir, `debug-scan-report-${app.name}.json`);
  fs.writeFileSync(outJson, JSON.stringify({ app: app.name, baseUrl: app.baseUrl, scannedAt: new Date().toISOString(), summary: { success, redirects, errors, total: app.routes.length }, results }, null, 2));
  analysis.apps[app.name] = { baseUrl: app.baseUrl, summary: { success, redirects, errors, total: app.routes.length }, resultsFile: path.relative(process.cwd(), outJson) };
  console.log(`Wrote ${outJson}`);
}

// Generate analysis report (markdown)
const mdLines = [];
mdLines.push('# Debug Scan Analysis Report');
mdLines.push(`Generated: ${analysis.generatedAt}`);
mdLines.push('');
for (const [appName, info] of Object.entries(analysis.apps)) {
  mdLines.push(`## ${appName.toUpperCase()} - ${info.baseUrl}`);
  mdLines.push('');
  mdLines.push(`Summary: success=${info.summary.success}, redirects=${info.summary.redirects}, errors=${info.summary.errors}, total=${info.summary.total}`);
  mdLines.push('');

  const report = JSON.parse(fs.readFileSync(path.resolve(info.resultsFile), 'utf8'));
  const missingTestIds = report.results.filter(r => !r.hasTestId).map(r => r.route);
  const errorRoutes = report.results.filter(r => r.status !== 'success').map(r => ({ route: r.route, status: r.status, code: r.statusCode }));

  mdLines.push('### Routes with issues');
  if (errorRoutes.length === 0) mdLines.push('- None (no HTTP errors/timeouts detected)');
  else {
    for (const er of errorRoutes) mdLines.push(`- ${er.route}: ${er.status} ${er.code || ''}`);
  }
  mdLines.push('');

  mdLines.push('### Routes missing TestIDs (heuristic)');
  if (missingTestIds.length === 0) mdLines.push('- None detected by heuristic');
  else {
    for (const r of missingTestIds) mdLines.push(`- ${r}`);
  }
  mdLines.push('');
}

mdLines.push('## Priority Fix List (ordered by impact)');
mdLines.push('');
mdLines.push('1. Fix any routes with 5xx/4xx or timeouts (high impact)');
mdLines.push('2. Add TestIDs to routes reported as missing by heuristic (medium impact)');
mdLines.push('3. Capture console errors and network failures in a follow-up Playwright scan (low-medium)');

const mdOut = path.join(outDir, 'debug-analysis-report.md');
fs.writeFileSync(mdOut, mdLines.join('\n'));
console.log(`Wrote analysis: ${mdOut}`);

console.log('Phase 2 scan+analysis complete');
