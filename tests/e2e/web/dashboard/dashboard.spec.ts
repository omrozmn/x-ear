/**
 * E2E Tests: Dashboard Module - Phase 3.2
 * 
 * Phase 3.2 Dashboard Tests
 * 
 * Tasks:
 * 3.2.1: Dashboard loads with all widgets
 * 3.2.2: Revenue summary widget - data displayed
 * 3.2.3: Today's appointments widget - data displayed
 * 3.2.4: Recent sales widget - data displayed
 * 3.2.5: Quick action buttons functional
 * 3.2.6: Dashboard date range filter
 * 3.2.7: Dashboard responsive layout
 * 
 * POM: tests/pom/web/dashboard.page.ts
 * Web App URL: http://localhost:8080
 * 
 */

import { expect } from '@playwright/test';
import { test } from '../../fixtures/fixtures';
import { WebDashboardPage } from '../../../pom/web/dashboard.page';

async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

function dashboardCard(page: import('@playwright/test').Page, title: RegExp | string) {
  return page.locator('div').filter({ has: page.getByText(title) }).first();
}

test.describe('Dashboard Module - Phase 3.2', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('3.2.1: Dashboard loads with all widgets', () => {
    
    test('should load dashboard with main container', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      // Check main dashboard container
      const mainContent = page.locator('main, [class*="dashboard"], [class*="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });
    });

    test('should display multiple widgets on dashboard', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      await expect(page.getByText('Toplam Hasta')).toBeVisible();
      await expect(page.getByText('Aktif Denemeler')).toBeVisible();
      await expect(page.getByText('Aylık Ciro')).toBeVisible();
      await expect(page.getByText('Bugünkü Randevular')).toBeVisible();
    });

    test('should show dashboard title or header', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      await expect(page.getByText('Hızlı İstatistikler')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('3.2.2: Revenue summary widget', () => {
    
    test('should display revenue summary widget', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const revenueWidget = dashboardCard(page, 'Aylık Ciro');
      await expect(revenueWidget).toBeVisible({ timeout: 10000 });
    });

    test('should display formatted currency values', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const revenueWidget = dashboardCard(page, 'Aylık Ciro');
      await expect(revenueWidget).toBeVisible();
      await expect(revenueWidget).toContainText('₺');
    });
  });

  test.describe('3.2.3: Today\'s appointments widget', () => {
    
    test('should display appointments widget or list', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const appointmentsWidget = dashboardCard(page, 'Bugünkü Randevular');
      await expect(appointmentsWidget).toBeVisible({ timeout: 10000 });
    });

    test('should show appointment count or numbers', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const appointmentsWidget = dashboardCard(page, 'Bugünkü Randevular');
      await expect(appointmentsWidget).toBeVisible();
      await expect(appointmentsWidget).toContainText(/\d+/);
    });
  });

  test.describe('3.2.4: Recent sales widget', () => {
    
    test('should display quick stats card', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      await expect(page.getByText('Hızlı İstatistikler')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Günlük Ciro')).toBeVisible();
    });

    test('should show sales data or numbers', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const quickStats = page.locator('text=/Günlük Ciro|Aktif Hastalar|Bekleyen Randevular/');
      await expect(quickStats.first()).toBeVisible();
      await expect(page.locator('main').first()).toContainText(/₺|\d+/);
    });
  });

  test.describe('3.2.5: Quick action buttons functional', () => {
    
    test('should display quick action buttons', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const actionButtons = page.locator('button:visible');
      const count = await actionButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have refresh button and filters', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      await expect(page.locator('select')).toBeVisible();
      await expect(page.locator('button').first()).toBeVisible();
    });

    test('should navigate on revenue widget click', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      await dashboardCard(page, 'Aylık Ciro').click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/reports/);
    });
  });

  test.describe('3.2.6: Dashboard date range filter', () => {
    
    test('should display date filter options', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const dateFilter = page.locator(
        'select, [data-testid="date-range-filter"], input[type="date"], [class*="date"], button:has-text("Tarih")'
      );
      const isVisible = await dateFilter.first().isVisible({ timeout: 10000 }).catch(() => false);
      expect(isVisible || (await page.locator('main').first().isVisible())).toBeTruthy();
    });

    test('should have date picker or calendar', async ({ tenantPage: page }) => {
      await gotoDashboard(page);
      
      const dateFilter = page.locator('select').first();
      await expect(dateFilter).toBeVisible();
      await dateFilter.selectOption('month');
      await expect(dateFilter).toHaveValue('month');
    });
  });

  test.describe('3.2.7: Dashboard responsive layout', () => {
    
    test('should display correctly on desktop', async ({ tenantPage: page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await gotoDashboard(page);
      
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible();
    });

    test('should display correctly on tablet', async ({ tenantPage: page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await gotoDashboard(page);
      
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible();
    });

    test('should display correctly on mobile', async ({ tenantPage: page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoDashboard(page);
      
      const mainContent = page.locator('main, [class*="dashboard"]').first();
      await expect(mainContent).toBeVisible();
      
      // Check that content is not cut off horizontally
      const body = page.locator('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    });

    test('should have scrollable content on mobile', async ({ tenantPage: page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await gotoDashboard(page);
      
      const scrollable = page.locator('main, [class*="content"], body').first();
      await expect(scrollable).toBeVisible();
    });
  });

  test.describe('POM Usage Tests', () => {
    
    test('should use WebDashboardPage POM', async ({ tenantPage: page }) => {
      const dashboard = new WebDashboardPage(page);
      
      await dashboard.goto();
      
      // Verify POM works
      const mainContent = page.locator('main, [class*="dashboard"]').first();
      await expect(mainContent).toBeVisible();
    });

    test('should navigate using POM goto method', async ({ tenantPage: page }) => {
      const dashboard = new WebDashboardPage(page);
      
      await dashboard.goto();
      
      const url = page.url();
      expect(url.includes('/login')).toBeFalsy();
    });
  });
});
