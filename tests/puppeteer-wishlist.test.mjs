import { strict as assert } from 'assert';
import puppeteer from 'puppeteer';

describe('Wishlist E2E Tests', function () {
  this.timeout(60000); // 60 seconds for slow networks

  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({
      headless: false, // set true to run headless
      args: ['--start-maximized'],
      defaultViewport: null
    });
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  it('should login successfully', async () => {
    await page.goto('https://final-project-revashar.onrender.com/login', { waitUntil: 'networkidle0' });

    await page.type('input[name="username"]', 'reva', { delay: 50 });
    await page.type('input[name="password"]', 'sampleuser', { delay: 50 });
    await page.click('button[type="submit"]');

    // Wait for the wishlist page to load
    await page.waitForSelector('.wishlist-section', { timeout: 15000 });
  });

  it('should filter items by color=Red and season=Winter', async () => {
    await page.goto('https://final-project-revashar.onrender.com/your-wishlist', { waitUntil: 'networkidle0' });

    // Select the filters
    await page.select('#filter-color', 'Red');
    await page.select('#filter-season', 'Winter');

    // Click the Apply Filters button
    await page.click('#apply-filters');

    // Wait for filtering to take effect
    await page.waitForFunction(() => {
      const items = Array.from(document.querySelectorAll('.item-card'));
      // Count only visible items
      return items.some(item => item.style.display !== 'none');
    }, { timeout: 10000 });

    // Count visible items
    const visibleItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.item-card'));
      return items.filter(item => item.style.display !== 'none').length;
    });

    console.log('Visible items after filter:', visibleItems);
    assert(visibleItems > 0, 'Expected at least one item to be visible after filtering');
  });
});
