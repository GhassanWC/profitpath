import { chromium } from 'playwright';
import { resolve } from 'node:path';

const url = 'file://' + resolve('dist/profitpath-preview.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url);
await page.waitForSelector('.pp-hero');
await page.screenshot({ path: 'shots/01-landing.png', fullPage: true, animations: 'disabled' });

// Questionnaire: cakes
await page.click('a[href="#/analyze"].btn');
await page.waitForSelector('#offering');
await page.fill('#offering', 'custom birthday cakes');
await page.waitForSelector('.pp-detect');
await page.screenshot({ path: 'shots/02-detect.png', fullPage: true, animations: 'disabled' });
await page.click('#start');
await page.waitForSelector('#qform');
// context group
await page.click('[data-multi="channels"][data-value="instagram"]');
await page.click('[data-multi="channels"][data-value="delivery_app"]');
await page.fill('#country', 'Oman');
await page.selectOption('#currency', 'OMR');
await page.screenshot({ path: 'shots/03-context.png', fullPage: true, animations: 'disabled' });
await page.click('#qform button[type=submit]');
// direct group
await page.waitForSelector('#materials');
await page.fill('#materials', '4');
await page.fill('#packaging', '0.8');
await page.fill('#laborHours', '1.5');
await page.fill('#hourlyValue', '3');
await page.fill('#wastagePct', '8');
await page.click('#qform button[type=submit]');
// selling
await page.waitForSelector('#marketingPerUnit');
await page.fill('#marketingPerUnit', '0.6');
await page.fill('#paymentFeePct', '2.5');
await page.fill('#platformFeePct', '20');
await page.click('#qform button[type=submit]');
// fixed
await page.waitForSelector('#rent');
await page.fill('#equipment', '25');
await page.fill('#insurance', '10');
await page.click('#qform button[type=submit]');
// days
await page.waitForSelector('#daysPerMonth');
await page.fill('#daysPerMonth', '22');
await page.click('#qform button[type=submit]');
// goals
await page.waitForSelector('#expectedUnits');
await page.screenshot({ path: 'shots/04-goals.png', fullPage: true, animations: 'disabled' });
await page.click('#qform button[type=submit]'); // should fail validation
const errCount = await page.locator('.pp-error').count();
console.log('validation errors shown:', errCount);
await page.fill('#expectedUnits', '6');
await page.fill('#targetMonthlyProfit', '900');
await page.click('#qform button[type=submit]');
await page.waitForSelector('.pp-kpi-xl');
await page.screenshot({ path: 'shots/05-results.png', fullPage: true, animations: 'disabled' });
console.log('recommended:', await page.locator('.pp-kpi-xl').first().innerText());

await page.click('[data-tab="whatif"]');
await page.waitForSelector('#wi-price');
await page.fill('#wi-price', String(Number(await page.inputValue('#wi-price')) * 1.1));
await page.locator('#wi-price').dispatchEvent('input');
await page.screenshot({ path: 'shots/06-whatif.png', fullPage: true, animations: 'disabled' });
await page.click('[data-tab="target"]');
await page.waitForSelector('#tgt');
await page.fill('#tgt', '1500');
await page.screenshot({ path: 'shots/07-target.png', fullPage: true, animations: 'disabled' });

await page.click('a[href="#/roadmap"]');
await page.waitForSelector('.pp-rec');
console.log('recommendations:', await page.locator('.pp-rec').count());
await page.locator('[data-toggle]').first().click();
await page.screenshot({ path: 'shots/08-roadmap.png', fullPage: true, animations: 'disabled' });

// Example path + mobile
await page.goto(url + '#/');
await page.locator('[data-action="example"]').first().click();
await page.waitForSelector('.pp-kpi-xl');
console.log('example price:', await page.locator('.pp-kpi-xl').first().innerText());
await page.setViewportSize({ width: 390, height: 800 });
await page.screenshot({ path: 'shots/09-mobile-results.png', fullPage: true, animations: 'disabled' });
const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
console.log('mobile scrollWidth:', scrollW);

console.log('errors:', errors);
await browser.close();
