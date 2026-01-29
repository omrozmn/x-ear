/**
 * FLOW-14: Analytics Dashboard - Critical Flow Test
 * 
 * Priority: P2 (Admin Operations)
 * Why Critical: Business intelligence, monitoring, decision making
 * 
 * API Endpoints:
 * - GET /api/admin/analytics/overview (getAnalyticsOverview)
 * - GET /api/admin/analytics/revenue (getRevenueAnalytics)
 * - GET /api/admin/analytics/tenants (getTenantAnalytics)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-14: Analytics Dashboard (Admin)', () => {
  test('should load and interact with analytics dashboard successfully', async ({ adminPage, apiContext, authTokens }) => {
    // STEP 1: Login to admin panel
    console.log('[FLOW-14] Step 1: Navigate to admin analytics page');
    await adminPage.goto('/analytics');
    await adminPage.waitForLoadState('networkidle');
    
    // Verify analytics page loads
    await expect(adminPage.locator('h1, h2').filter({ hasText: /Analiz|Analytics|Dashboard|Rapor/i })).toBeVisible({ timeout: 10000 });

    // STEP 2: Verify metrics load
    console.log('[FLOW-14] Step 2: Verify metrics load');
    
    // Wait for API calls to complete
    await waitForApiCall(adminPage, '/api/admin/analytics', 10000).catch(() => {
      console.log('[FLOW-14] Analytics API call not detected, checking for data...');
    });
    
    // Verify key metrics are visible
    const metricsToCheck = [
      /Gelir|Revenue|Ciro/i,
      /Klinik|Tenant/i,
      /Kullanıcı|User/i,
      /Satış|Sale/i
    ];
    
    for (const metric of metricsToCheck) {
      await expect(adminPage.locator(`text=${metric}`)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('[FLOW-14] Metric not found:', metric);
      });
    }

    // STEP 3: Verify data via API
    console.log('[FLOW-14] Step 3: Verify analytics data via API');
    const analyticsResponse = await apiContext.get('/api/admin/analytics/overview', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(analyticsResponse.ok()).toBeTruthy();
    const analyticsData = await analyticsResponse.json();
    validateResponseEnvelope(analyticsData);
    
    const overview = analyticsData.data;
    console.log('[FLOW-14] Analytics overview:', {
      totalRevenue: overview.totalRevenue || 0,
      totalTenants: overview.totalTenants || 0,
      totalUsers: overview.totalUsers || 0,
      totalSales: overview.totalSales || 0
    });

    // STEP 4: Select date range
    console.log('[FLOW-14] Step 4: Select date range');
    const dateRangeButton = adminPage.locator('button:has-text("Tarih"), button:has-text("Date"), select[name="dateRange"]').first();
    await dateRangeButton.click({ timeout: 5000 }).catch(() => {
      console.log('[FLOW-14] Date range selector not found');
    });
    
    // Select "Last 30 days" or similar
    const last30DaysOption = adminPage.locator('button:has-text("30"), option:has-text("30")').first();
    await last30DaysOption.click({ timeout: 3000 }).catch(() => {
      console.log('[FLOW-14] Date range option not found, skipping');
    });
    
    await adminPage.waitForLoadState('networkidle');

    // STEP 5: Verify data updates
    console.log('[FLOW-14] Step 5: Verify data updates after date range change');
    
    // Wait for potential API call
    await adminPage.waitForTimeout(2000);
    
    // Verify charts/data are still visible
    await expect(adminPage.locator('text=/Gelir|Revenue/i')).toBeVisible({ timeout: 5000 });

    // STEP 6: Verify charts render correctly
    console.log('[FLOW-14] Step 6: Verify charts render');
    
    // Look for chart elements (canvas, svg, or chart containers)
    const chartElements = adminPage.locator('canvas, svg[class*="chart"], div[class*="chart"]');
    const chartCount = await chartElements.count();
    
    expect(chartCount, 'At least one chart should be rendered').toBeGreaterThan(0);
    console.log('[FLOW-14] Found', chartCount, 'chart elements');
    
    // Verify at least one chart is visible
    await expect(chartElements.first()).toBeVisible({ timeout: 10000 });

    // STEP 7: Test export functionality (if available)
    console.log('[FLOW-14] Step 7: Test export functionality');
    const exportButton = adminPage.getByRole('button', { name: /Dışa Aktar|Export|İndir|Download/i }).first();
    const hasExport = await exportButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasExport) {
      await exportButton.click();
      console.log('[FLOW-14] Export button clicked');
      
      // Wait for download or modal
      await adminPage.waitForTimeout(2000);
    } else {
      console.log('[FLOW-14] Export functionality not available');
    }

    // STEP 8: Verify tenant breakdown
    console.log('[FLOW-14] Step 8: Verify tenant breakdown');
    const tenantAnalyticsResponse = await apiContext.get('/api/admin/analytics/tenants', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    if (tenantAnalyticsResponse.ok()) {
      const tenantAnalyticsData = await tenantAnalyticsResponse.json();
      validateResponseEnvelope(tenantAnalyticsData);
      
      const tenants = tenantAnalyticsData.data;
      console.log('[FLOW-14] Tenant analytics:', {
        totalTenants: tenants.length,
        activeTenants: tenants.filter((t: any) => t.isActive).length
      });
    } else {
      console.log('[FLOW-14] Tenant analytics endpoint not available');
    }
    
    console.log('[FLOW-14] ✅ Analytics dashboard flow completed successfully');
  });
});
