import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(process.argv[2] || 'http://127.0.0.1:4310');
    await page.locator('.hero h1').waitFor();
    for (const route of ['home', 'dashboard', 'walletHub', 'deployer', 'privacy']) {
      if (route !== 'home') await page.goto((process.argv[2] || 'http://127.0.0.1:4310') + '/#/' + route);
      await page.locator('main h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' horizontal overflow');
      assert.equal(await page.locator('main h1').count(), 1);
      if (route === 'dashboard') assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true);
      if (route === 'walletHub') assert.equal(await page.getByRole('button', { name: 'Open faucet' }).isDisabled(), true);
      if (route === 'home' || route === 'dashboard') await page.screenshot({ path: '/tmp/' + process.argv[3] + '-' + route + '-' + width + '.png', fullPage: true });
    }
    await page.getByRole('link', { name: 'About', exact: true }).click();
    await page.locator('.hero').waitFor();
    await page.close();
  }
  console.log('PASS: desktop/mobile routes, overflow, gated forms, landing return');
} finally { await browser.close(); }
