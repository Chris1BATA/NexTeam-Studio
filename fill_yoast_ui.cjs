const { chromium } = require('playwright');

(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const user = 'aquatrace-bragi';
  const pass = '!wMnTgL*OI8Lm*PHQk%Pe334';
  await page.goto('https://aquatraceleak.com/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await page.click('#wp-submit');
  await page.goto('https://aquatraceleak.com/wp-admin/post.php?post=3273&action=edit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  async function fillIfFound(selectors, value) {
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.count()) {
        try {
          await el.scrollIntoViewIfNeeded();
          await el.fill('');
          await el.fill(value);
          return sel;
        } catch {}
      }
    }
    return null;
  }

  // Try Gutenberg Yoast fields and classic/meta box variants
  const focus = await fillIfFound([
    'input[id*="focus-keyword"]',
    'input[name*="focuskw"]',
    'input[placeholder*="keyphrase" i]',
    'textarea[placeholder*="keyphrase" i]',
    '#yoast_wpseo_focuskw',
    'input[id*="yoast_wpseo_focuskw"]'
  ], 'my pool leak seems to have stopped');

  const seoTitle = await fillIfFound([
    'input[id*="snippet_title"]',
    'input[name*="title"]',
    '#yoast_wpseo_title',
    'input[id*="yoast_wpseo_title"]'
  ], 'My Pool Leak Seems to Have Stopped - Should I Still Get It Inspected? | Aquatrace');

  const metaDesc = await fillIfFound([
    'textarea[id*="metadesc"]',
    'textarea[name*="metadesc"]',
    '#yoast_wpseo_metadesc',
    'textarea[id*="yoast_wpseo_metadesc"]'
  ], 'If your pool leak seems to have stopped on its own, do not cancel that inspection. Debris can temporarily plug a leak the same way a stopper seals a drain - and when it shifts, the water loss comes right back.');

  // Open social tab if present
  const socialTab = page.locator('text=Social').first();
  if (await socialTab.count()) {
    try { await socialTab.click(); await page.waitForTimeout(1500); } catch {}
  }

  const socialTitle = await fillIfFound([
    'input[id*="opengraph-title"]',
    '#yoast_wpseo_opengraph-title',
    'input[name*="opengraph-title"]',
    'input[placeholder*="social title" i]'
  ], 'Your Pool Leak "Stopped" - But It Probably Didn\'t');

  const socialDesc = await fillIfFound([
    'textarea[id*="opengraph-description"]',
    '#yoast_wpseo_opengraph-description',
    'textarea[name*="opengraph-description"]',
    'textarea[placeholder*="social description" i]'
  ], 'Dirt, silt, and leaves can seal a leaking pool penetration just like a bathtub stopper. The leak is not gone - it is covered. Here is what is really happening and what to do before you cancel your inspection.');

  const updateButton = page.locator('button:has-text("Update"), input#publish').first();
  if (await updateButton.count()) {
    await updateButton.click();
    await page.waitForTimeout(5000);
  }

  console.log(JSON.stringify({ focus, seoTitle, metaDesc, socialTitle, socialDesc, url: page.url() }));
  await browser.close();
})();