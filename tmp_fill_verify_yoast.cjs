const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
  page.setDefaultTimeout(25000);

  const postId = 3273;
  const user = 'aquatrace-bragi';
  const pass = '!wMnTgL*OI8Lm*PHQk%Pe334';

  const values = {
    focus: 'my pool leak seems to have stopped',
    seoTitle: 'My Pool Leak Seems to Have Stopped - Should I Still Get It Inspected? | Aquatrace',
    metaDesc: 'If your pool leak seems to have stopped on its own, do not cancel that inspection. Debris can temporarily plug a leak the same way a stopper seals a drain - and when it shifts, the water loss comes right back.',
    socialTitle: 'Your Pool Leak "Stopped" - But It Probably Didn\'t',
    socialDesc: 'Dirt, silt, and leaves can seal a leaking pool penetration just like a bathtub stopper. The leak is not gone - it is covered. Here is what is really happening and what to do before you cancel your inspection.'
  };

  await page.goto('https://aquatraceleak.com/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('#wp-submit')
  ]);

  const editUrl = `https://aquatraceleak.com/wp-admin/post.php?post=${postId}&action=edit`;
  await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  async function setValue(selector, value) {
    await page.evaluate(({ selector, value }) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`Missing selector: ${selector}`);
      node.value = value;
      node.setAttribute('value', value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      node.dispatchEvent(new Event('blur', { bubbles: true }));
    }, { selector, value });
  }

  await page.evaluate(() => document.querySelector('#wpseo_meta')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1000);
  await setValue('#yoast_wpseo_focuskw', values.focus);
  await setValue('#yoast_wpseo_title', values.seoTitle);
  await setValue('#yoast_wpseo_metadesc', values.metaDesc);
  await page.evaluate(() => document.querySelector('#wpseo-meta-tab-social')?.click());
  await page.waitForTimeout(1500);
  await setValue('#yoast_wpseo_opengraph-title', values.socialTitle);
  await setValue('#yoast_wpseo_opengraph-description', values.socialDesc);

  const screenshotDir = 'C:/Users/Peyto/NexTeam-Studio/tmp-proof';
  fs.mkdirSync(screenshotDir, { recursive: true });
  const beforeSave = path.join(screenshotDir, 'yoast-fields-before-save.png');
  await page.screenshot({ path: beforeSave, fullPage: true });

  const saveButton = page.getByRole('button', { name: 'Save draft' }).first();
  await saveButton.click({ force: true });
  await page.waitForTimeout(8000);

  await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.evaluate(() => document.querySelector('#wpseo-meta-tab-social')?.click());
  await page.waitForTimeout(1200);

  const stored = await page.evaluate(() => ({
    focus: document.querySelector('#yoast_wpseo_focuskw')?.value || null,
    seoTitle: document.querySelector('#yoast_wpseo_title')?.value || null,
    metaDesc: document.querySelector('#yoast_wpseo_metadesc')?.value || null,
    socialTitle: document.querySelector('#yoast_wpseo_opengraph-title')?.value || null,
    socialDesc: document.querySelector('#yoast_wpseo_opengraph-description')?.value || null,
    commentsDisabled: document.querySelector('#comment_status') ? !document.querySelector('#comment_status').checked : null,
    pingbacksDisabled: document.querySelector('#ping_status') ? !document.querySelector('#ping_status').checked : null,
    permalink: document.querySelector('#sample-permalink a')?.href || null,
    editorVisible: {
      focus: !!document.querySelector('#yoast_wpseo_focuskw'),
      seoTitle: !!document.querySelector('#yoast_wpseo_title'),
      metaDesc: !!document.querySelector('#yoast_wpseo_metadesc'),
      socialTitle: !!document.querySelector('#yoast_wpseo_opengraph-title'),
      socialDesc: !!document.querySelector('#yoast_wpseo_opengraph-description')
    }
  }));

  const afterSave = path.join(screenshotDir, 'yoast-fields-after-save.png');
  await page.screenshot({ path: afterSave, fullPage: true });

  console.log(JSON.stringify({
    editUrl,
    screenshotBeforeSave: beforeSave,
    screenshotAfterSave: afterSave,
    values,
    stored,
    currentUrl: page.url()
  }, null, 2));

  await browser.close();
})();
