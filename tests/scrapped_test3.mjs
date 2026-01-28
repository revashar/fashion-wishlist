it('should add a new item to the wishlist and verify item count', async () => {
  // Count items before adding
  await page.goto('https://final-project-revashar.onrender.com/your-wishlist', { waitUntil: 'networkidle0' });
  const initialCount = await page.evaluate(() => document.querySelectorAll('.item-card').length);
  console.log('Initial wishlist count:', initialCount);

  // Go to add item page
  await page.goto('https://final-project-revashar.onrender.com/add-item', { waitUntil: 'networkidle0' });

  await page.type('#name', 'Modern Boatneck T-Shirt', { delay: 50 });
  await page.select('#category', 'Shirt');
  await page.click('input[name="color"][value="White"]');
  await page.select('#size', 'S');
  await page.type('#link', 'https://www.gap.com/browse/product.do?pid=801453032&vid=2', { delay: 50 });

  // Select brand = other, then type manually
  await page.select('#brandSelect', 'other');
  await page.waitForSelector('#brandManual', { visible: true });
  await page.type('#brandManual', 'Gap', { delay: 50 });

  // Ensure Autumn season checkbox is checked
  await page.evaluate(() => {
    const checkbox = document.querySelector('input[name="season"][value="Autumn"]');
    if (checkbox) checkbox.checked = true;
  });

  // Submit form and wait for wishlist to load
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);

  // Wait a short moment to ensure items are rendered
  await page.waitForTimeout(1000);

  // Count items after adding
  const finalCount = await page.evaluate(() => document.querySelectorAll('.item-card').length);
  console.log('Final wishlist count:', finalCount);

  assert(finalCount === initialCount + 1, 'New item was not added to the wishlist');
});
