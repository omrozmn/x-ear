const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  console.log('Navigating to http://localhost:8080/login');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Wait a bit more for React to render
  await page.waitForTimeout(3000);
  
  // Get the HTML content
  const body = await page.locator('body').innerHTML();
  console.log('Body HTML (first 3000 chars):', body.substring(0, 3000));
  
  // Check for errors
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\nNo console errors found');
  }
  
  await browser.close();
})();
