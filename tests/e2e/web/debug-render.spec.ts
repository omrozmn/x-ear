/**
 * Debug test to check if React is rendering
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test('debug: check page rendering', async ({ page }) => {
  console.log('Navigating to:', WEB_URL);
  
  // Listen for console messages BEFORE navigation
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  // Listen for page errors BEFORE navigation
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
    console.log('Stack:', error.stack);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    console.log('Request failed:', request.url(), request.failure()?.errorText);
  });
  
  await page.goto(WEB_URL, { waitUntil: 'networkidle' });
  
  console.log('Page loaded, waiting 5 seconds...');
  await page.waitForTimeout(5000);
  
  const title = await page.title();
  console.log('Page title:', title);
  
  const content = await page.content();
  console.log('HTML length:', content.length);
  
  // Check for React root
  const hasRoot = await page.evaluate(() => {
    return document.getElementById('root') !== null;
  });
  console.log('Has #root element:', hasRoot);
  
  // Check if root has children
  const rootChildren = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.children.length : 0;
  });
  console.log('Root children count:', rootChildren);
  
  // Check for any text content
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text length:', bodyText.length);
  
  // Check for script errors in window
  const windowErrors = await page.evaluate(() => {
    return (window as any).__errors || [];
  });
  console.log('Window errors:', windowErrors);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-results/debug-screenshot.png');
  
  // This test always passes - it's just for debugging
  expect(true).toBe(true);
});
