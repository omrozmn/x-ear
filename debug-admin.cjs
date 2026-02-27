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
  
  console.log('Navigating to http://localhost:8082/login');
  await page.goto('http://localhost:8082/login', { waitUntil: 'networkidle', timeout: 30000 });
  
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Wait for React to render
  await page.waitForTimeout(3000);
  
  // Get all input fields
  const inputs = await page.locator('input').count();
  console.log('Number of input fields:', inputs);
  
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
