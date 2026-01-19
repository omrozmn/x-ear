import { test, expect } from '@playwright/test';

test('Debug: Check page content', async ({ page }) => {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];
  
  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log('BROWSER:', text);
    consoleMessages.push(text);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    console.log('ERROR STACK:', error.stack);
    pageErrors.push(error.message);
  });
  
  // Listen for failed requests
  page.on('requestfailed', request => {
    const failure = request.failure();
    const url = request.url();
    console.log('REQUEST FAILED:', url, failure?.errorText);
    networkErrors.push(`${url}: ${failure?.errorText}`);
  });
  
  // Listen for responses
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:8080');
  
  // Wait a bit for page to load
  await page.waitForTimeout(5000);
  
  // Get page content
  const content = await page.content();
  console.log('PAGE HTML LENGTH:', content.length);
  
  // Check for error overlay
  const errorOverlay = await page.locator('text=EISDIR').count();
  console.log('EISDIR errors found:', errorOverlay);
  
  // Check for Vite error overlay
  const viteError = await page.locator('vite-error-overlay').count();
  console.log('Vite error overlays:', viteError);
  
  if (viteError > 0) {
    const errorText = await page.locator('vite-error-overlay').textContent();
    console.log('VITE ERROR:', errorText?.substring(0, 1000));
  }
  
  // Get all text content
  const bodyText = await page.locator('body').textContent();
  console.log('BODY TEXT:', bodyText?.substring(0, 500));
  
  // Check if root div exists
  const rootDiv = await page.locator('#root').count();
  console.log('Root div found:', rootDiv);
  
  if (rootDiv > 0) {
    const rootContent = await page.locator('#root').textContent();
    console.log('ROOT CONTENT:', rootContent?.substring(0, 500));
    const rootHTML = await page.locator('#root').innerHTML();
    console.log('ROOT HTML:', rootHTML.substring(0, 500));
  }
  
  // Check for any script errors by evaluating in browser
  const hasReact = await page.evaluate(() => {
    return {
      hasReact: typeof (window as any).React !== 'undefined',
      hasReactDOM: typeof (window as any).ReactDOM !== 'undefined',
      rootChildren: document.getElementById('root')?.children.length || 0
    };
  });
  console.log('React check:', hasReact);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-screenshot.png', fullPage: true });
  
  console.log('\n=== SUMMARY ===');
  console.log('Console messages:', consoleMessages.length);
  console.log('Page errors:', pageErrors.length);
  console.log('Network errors:', networkErrors.length);
  if (pageErrors.length > 0) {
    console.log('First error:', pageErrors[0]);
  }
  if (networkErrors.length > 0) {
    console.log('Network errors:', networkErrors);
  }
});
