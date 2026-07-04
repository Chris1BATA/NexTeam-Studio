const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  page.setDefaultTimeout(15000);
  const user = 'aquatrace-bragi';
  const pass = '!wMnTgL*OI8Lm*PHQk%Pe334';
  await page.goto('https://aquatraceleak.com/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('#wp-submit')
  ]);
  await page.goto('https://aquatraceleak.com/wp-admin/post.php?post=3273&action=edit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input, textarea, button, [role="tab"], [aria-label], [id], [name]'));
    const hits = all
      .map(el => ({
        tag: el.tagName,
        id: el.id || '',
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
        aria: el.getAttribute('aria-label') || '',
        text: (el.innerText || el.value || '').slice(0,120)
      }))
      .filter(x => /yoast|seo|meta|social|graph|focus|keyphrase|snippet/i.test(JSON.stringify(x)));
    return {
      url: location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 3000),
      hits: hits.slice(0, 200)
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
