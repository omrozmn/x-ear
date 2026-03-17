const { chromium } = require('playwright');
(async () => {
  console.log('start');
  const browser = await chromium.launch();
  console.log('launched');
  await browser.close();
  console.log('closed');
})();
