/**
 * Design audit.
 *
 * Checks the rendered result against the visual requirements in the brief —
 * the gradient header, the hero's dark overlay and rounded corners, the
 * heading copy, the four featured category tiles, the call-to-action row,
 * and the responsive column behaviour.
 *
 * Usage:  npm run audit:design
 */
import { existsSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate));
/**
 * Vite's production `base`: `vite preview` serves the app under that sub-path,
 * so the bare origin 404s. The config writes the base as a conditional, so the
 * first quoted sub-path wins.
 */
const VITE_BASE = (() => {
  try {
    const source = readFileSync('vite.config.js', 'utf8');
    return source.match(/base:.*?['"](\/[^'"]*)['"]/)?.[1] ?? '/';
  } catch {
    return '/';
  }
})();

const BASE_URL =
  process.env.BASE_URL ?? `http://localhost:4173${VITE_BASE.replace(/\/$/, '')}`;

/**
 * Turns an `href` such as `/Recipe-Discovery-App/recipes` back into the route
 * the app was asked to render, `/recipes`, so assertions can compare routes.
 */
function routeOf(href) {
  const base = VITE_BASE.replace(/\/$/, '');
  if (!base || !href) return href;
  if (href === base) return '/';
  return href.startsWith(`${base}/`) ? href.slice(base.length) : href;
}

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    const note = await fn();
    passed += 1;
    console.log(`  PASS  ${label}${note ? `  (${note})` : ''}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${label}\n        ${error.message.split('\n')[0]}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function settle(page) {
  await page.waitForSelector('#root > *', { timeout: 15000 });
  await page.waitForFunction(
    () => ((document.getElementById('root')?.innerText ?? '').length > 40),
    { timeout: 20000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

const style = (page, selector, property) =>
  page.$eval(selector, (el, prop) => getComputedStyle(el)[prop], property);

async function main() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  console.log('\nHeader');

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await settle(page);

  await check('header uses the purple/blue gradient', async () => {
    const image = await style(page, '.navbar', 'backgroundImage');
    assert(
      image.includes('gradient') && image.includes('102, 126, 234'),
      `expected the brand gradient, got ${image}`,
    );
    return 'linear-gradient(135deg, #667eea, #764ba2)';
  });

  await check('title is "Recipe Discovery"', async () => {
    const title = await page.$eval('.navbar__title', (el) => el.textContent.trim());
    assert(title === 'Recipe Discovery', `got "${title}"`);
  });

  await check('subtitle is "Find delicious recipes from around the world"', async () => {
    const subtitle = await page.$eval('.navbar__tagline', (el) => el.textContent.trim());
    assert(
      subtitle === 'Find delicious recipes from around the world',
      `got "${subtitle}"`,
    );
  });

  await check('logo renders from the bundled brand asset', async () => {
    const info = await page.$eval('.navbar__logo', (el) => ({
      src: el.currentSrc || el.src,
      width: Math.round(el.getBoundingClientRect().width),
    }));
    assert(info.width >= 40, `logo should be visible, was ${info.width}px wide`);
    // Vite inlines assets under its size limit, so the logo may arrive as a
    // base64 data URI rather than a hashed file URL.
    const isBundled = info.src.startsWith('data:image/') || info.src.includes('/assets/');
    assert(isBundled, `unexpected src ${info.src.slice(0, 60)}`);
    return `${info.width}px`;
  });

  await check('search input placeholder is "Search for recipes..."', async () => {
    const placeholder = await page.$eval(
      '.navbar__search input',
      (el) => el.placeholder,
    );
    assert(placeholder === 'Search for recipes...', `got "${placeholder}"`);
  });

  await check('search button is labelled "Search"', async () => {
    const label = await page.$eval('.navbar__search button[type="submit"]', (el) =>
      el.textContent.trim(),
    );
    assert(label === 'Search', `got "${label}"`);
  });

  console.log('\nHero');

  await check('heading reads "Discover Amazing Recipes"', async () => {
    const text = await page.$eval('.hero__title', (el) => el.textContent.replace(/\s+/g, ' ').trim());
    assert(text === 'Discover Amazing Recipes', `got "${text}"`);
  });

  await check('supporting text matches the brief', async () => {
    const text = await page.$eval('.hero__text', (el) => el.textContent.replace(/\s+/g, ' ').trim());
    assert(
      text === 'Search hundreds of recipes from around the world and find your next favorite meal',
      `got "${text}"`,
    );
  });

  await check('hero has rounded corners', async () => {
    const radius = await style(page, '.hero', 'borderRadius');
    const value = Number.parseFloat(radius);
    assert(value >= 16, `expected a generous radius, got ${radius}`);
    return radius;
  });

  await check('hero has a dark overlay over the photo', async () => {
    const scrim = await style(page, '.hero__scrim', 'backgroundImage');
    const color = await style(page, '.hero__scrim', 'backgroundColor');
    assert(
      scrim.includes('gradient') || color !== 'rgba(0, 0, 0, 0)',
      'no dark overlay found',
    );
    // The first stop must be strongly darkened.
    const firstStop = scrim.match(/rgba?\([^)]+\)/)?.[0] ?? '';
    const alpha = Number.parseFloat(firstStop.split(',')[3] ?? '0');
    assert(alpha >= 0.6, `overlay too light (alpha ${alpha})`);
    return `alpha ${alpha}`;
  });

  await check('hero photo is the optimised local asset, not a remote one', async () => {
    const info = await page.$eval('.hero__image', (el) => ({
      src: el.currentSrc || el.src,
      natural: el.naturalWidth,
    }));
    assert(info.natural > 0, 'the hero image failed to load');
    assert(
      info.src.includes('/assets/') && info.src.endsWith('.webp'),
      `expected a bundled webp, got ${info.src}`,
    );
    return `${info.natural}px wide`;
  });

  await check('hero content is horizontally centred', async () => {
    const boxes = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const content = document.querySelector('.hero__content').getBoundingClientRect();
      return {
        heroCentre: hero.left + hero.width / 2,
        contentCentre: content.left + content.width / 2,
      };
    });
    const delta = Math.abs(boxes.heroCentre - boxes.contentCentre);
    assert(delta < 2, `off centre by ${delta}px`);
  });

  await check('four featured tiles: Pasta, Chicken, Cake, Beef', async () => {
    const labels = await page.$$eval('.hero__tile', (tiles) =>
      tiles.map((tile) => tile.textContent.trim()),
    );
    assert(labels.length === 4, `expected 4 tiles, got ${labels.length}`);
    assert(
      JSON.stringify(labels) === JSON.stringify(['Pasta', 'Chicken', 'Cake', 'Beef']),
      `got ${JSON.stringify(labels)}`,
    );
  });

  await check('each featured tile shows its food icon', async () => {
    const icons = await page.$$eval('.hero__tile-icon', (nodes) =>
      nodes.map((node) => ({
        loaded: node.naturalWidth > 0,
        width: Math.round(node.getBoundingClientRect().width),
      })),
    );
    assert(icons.length === 4, `expected 4 icons, got ${icons.length}`);
    assert(icons.every((icon) => icon.loaded), 'a tile icon failed to load');
    return `${icons[0].width}px each`;
  });

  console.log('\nCall to action row');

  await check('Explore Recipes / Browse Categories / About Us are present', async () => {
    const labels = await page.$$eval('.action-row .btn', (nodes) =>
      nodes.map((node) => node.textContent.trim()),
    );
    for (const expected of ['Explore Recipes', 'Browse Categories', 'About Us']) {
      assert(labels.includes(expected), `missing "${expected}" in ${JSON.stringify(labels)}`);
    }
  });

  await check('the three actions navigate to the right routes', async () => {
    const hrefs = await page.$$eval('.action-row a', (nodes) =>
      nodes.map((node) => node.getAttribute('href')),
    );
    const routes = hrefs.map((href) => routeOf(href));
    assert(routes.includes('/recipes'), `missing /recipes in ${JSON.stringify(routes)}`);
    assert(routes.includes('/categories'), 'missing /categories');
    assert(routes.includes('/about'), 'missing /about');
  });

  console.log('\nResponsive behaviour');

  const columnCounts = {};
  for (const width of [320, 375, 480, 640, 768, 1366]) {
    await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await settle(page);

    columnCounts[width] = await page.$eval('.hero__tiles', (el) =>
      getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
  }

  await check('featured tiles: 2 columns on phones, 4 from 640px up', async () => {
    assert(columnCounts[320] === 2, `320px should be 2 columns, got ${columnCounts[320]}`);
    assert(columnCounts[375] === 2, `375px should be 2 columns, got ${columnCounts[375]}`);
    assert(columnCounts[480] === 2, `480px should be 2 columns, got ${columnCounts[480]}`);
    assert(columnCounts[640] === 4, `640px should be 4 columns, got ${columnCounts[640]}`);
    assert(columnCounts[1366] === 4, `1366px should be 4 columns, got ${columnCounts[1366]}`);
    return JSON.stringify(columnCounts);
  });

  await check('action buttons stack on a 320px phone', async () => {
    await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await settle(page);

    const rows = await page.$$eval('.action-row .btn', (nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
    );
    assert(
      new Set(rows).size === rows.length,
      `buttons should each be on their own row at 320px, tops: ${rows.join(',')}`,
    );
  });

  await check('hero heading scales with the viewport', async () => {
    const sizes = {};
    for (const width of [320, 768, 1366]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
      await settle(page);
      sizes[width] = await page.$eval('.hero__title', (el) =>
        Number.parseFloat(getComputedStyle(el).fontSize),
      );
    }
    assert(
      sizes[320] < sizes[768] && sizes[768] < sizes[1366],
      `heading should grow with width, got ${JSON.stringify(sizes)}`,
    );
    return `${sizes[320]}px -> ${sizes[768]}px -> ${sizes[1366]}px`;
  });

  console.log('\nRecipe detail page');

  /** The detail page is data-driven, so wait for its layout, not just text. */
  const settleDetail = async (page) => {
    await page.waitForSelector('.detail-hero', { timeout: 30000 });
    await page.waitForSelector('.instructions p', { timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(`${BASE_URL}/recipe/52772`, { waitUntil: 'networkidle2', timeout: 45000 });
  await settle(page);
  await settleDetail(page);

  await check('desktop detail puts the image left of the text', async () => {
    const boxes = await page.evaluate(() => {
      const image = document.querySelector('.detail-hero').getBoundingClientRect();
      const panel = document.querySelector('.panel').getBoundingClientRect();
      return { imageRight: image.right, panelLeft: panel.left };
    });
    assert(
      boxes.panelLeft > boxes.imageRight - 1,
      `image and text should sit side by side (image ends ${Math.round(boxes.imageRight)}, text starts ${Math.round(boxes.panelLeft)})`,
    );
  });

  await check('mobile detail stacks the image above the text', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/recipe/52772`, { waitUntil: 'networkidle2', timeout: 45000 });
    await settle(page);
    await settleDetail(page);

    const boxes = await page.evaluate(() => {
      const image = document.querySelector('.detail-hero').getBoundingClientRect();
      const panel = document.querySelector('.panel').getBoundingClientRect();
      return { imageBottom: image.bottom, panelTop: panel.top };
    });
    assert(
      boxes.panelTop >= boxes.imageBottom - 1,
      `text should start below the image (image ends ${Math.round(boxes.imageBottom)}, text starts ${Math.round(boxes.panelTop)})`,
    );
  });

  await check('ingredients are listed with their measurements', async () => {
    const rows = await page.$$eval('.ingredient', (nodes) =>
      nodes.map((node) => ({
        name: node.querySelector('.ingredient__name')?.textContent.trim(),
        measure: node.querySelector('.ingredient__measure')?.textContent.trim(),
      })),
    );
    assert(rows.length > 0, 'no ingredient rows rendered');
    assert(rows.every((row) => row.name), 'an ingredient row has no name');
    assert(rows.some((row) => row.measure && row.measure !== '—'), 'no measured ingredient');
    return `${rows.length} ingredients, e.g. "${rows[0].measure} ${rows[0].name}"`;
  });

  await check('instructions are split into steps', async () => {
    const steps = await page.$$eval('.instructions p', (nodes) => nodes.length);
    assert(steps > 0, 'no instruction paragraphs');
    return `${steps} step(s)`;
  });

  await browser.close();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  // Hard exit: an early throw would otherwise leave the browser child process
  // alive and hang the shell.
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
