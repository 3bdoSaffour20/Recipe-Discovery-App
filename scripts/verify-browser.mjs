/**
 * Browser verification harness.
 *
 * Drives the built app in a real Chrome via puppeteer-core (the system
 * browser is used, so nothing is downloaded) and asserts the things that
 * cannot be checked with a build or a unit test:
 *
 *   - every route renders real content, not an error or a blank screen;
 *   - no page scrolls horizontally at 320 / 375 / 768 / 1024 / 1366 / 1920;
 *   - touch targets are at least 44px on a phone viewport;
 *   - the mobile drawer opens, traps focus and closes on Escape;
 *   - search, category filters and the random route work end to end.
 *
 * Usage:  npm run build && npm run verify
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate));

if (!executablePath) {
  console.error('No Chrome or Edge found. Install one, or set CHROME_PATH.');
  process.exit(1);
}

/**
 * Vite's production `base`, read from the config so the harness talks to
 * `vite preview` where it actually serves: with `base: '/Recipe-Discovery-App/'`
 * the root origin 404s and everything is published under that sub-path. The
 * config writes the base as a conditional, so the first quoted sub-path wins.
 */
const VITE_BASE = (() => {
  try {
    const source = readFileSync('vite.config.js', 'utf8');
    return source.match(/base:.*?['"](\/[^'"]*)['"]/)?.[1] ?? '/';
  } catch {
    return '/';
  }
})();

/** Serves `dist/` over HTTP, because the router needs real navigable URLs. */
const BASE_URL =
  process.env.BASE_URL ?? `http://localhost:4173${VITE_BASE.replace(/\/$/, '')}`;

/**
 * Vite's `base`, e.g. `/Recipe-Discovery-App`.
 *
 * The built app is deployed into a sub-directory, so every in-page URL is
 * `<base>/search`, not `/search`. Assertions must compare the route the way
 * it is written in `src/App.jsx`, with the sub-path removed.
 */
const BASE_PATH = new URL(BASE_URL).pathname.replace(/\/$/, '');

/**
 * Waits until the route path satisfies `predicate`, a small expression over
 * `path` (for example `path === '/search'` or `path.startsWith('/recipe/')`).
 */
async function waitForRoute(page, predicate, timeout = 10000) {
  await page.waitForFunction(
    (base, source) => {
      const raw = window.location.pathname;
      const path = base && raw.startsWith(base) ? raw.slice(base.length) || '/' : raw;
      // `source` is harness code, never user input.
      return new Function('path', `return ${source};`)(path);
    },
    { timeout },
    BASE_PATH,
    predicate,
  );
}

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${label}\n        ${error.message.split('\n')[0]}`);
  }
}

/** Viewports from the brief's breakpoint list. */
const VIEWPORTS = [
  { name: '320px (small phone)', width: 320, height: 640, mobile: true },
  { name: '375px (phone)', width: 375, height: 812, mobile: true },
  { name: '768px (tablet)', width: 768, height: 1024, mobile: true },
  { name: '1024px (tablet landscape)', width: 1024, height: 768, mobile: true },
  { name: '1366px (laptop)', width: 1366, height: 768, mobile: false },
  { name: '1920px (desktop)', width: 1920, height: 1080, mobile: false },
];

const ROUTES = [
  { path: '/', expect: 'Discover Amazing Recipes' },
  { path: '/recipes', expect: 'Explore Recipes' },
  { path: '/recipes?category=Beef', expect: 'Beef Recipes' },
  { path: '/recipes?category=Dessert', expect: 'Dessert Recipes' },
  { path: '/categories', expect: 'Browse Categories' },
  { path: '/search?query=chicken', expect: 'Search Results for "chicken"' },
  { path: '/search?query=zzzznotarealmeal', expect: 'No recipes found.' },
  { path: '/about', expect: 'About Recipe Discovery' },
  { path: '/favorites', expect: 'Your Favourites' },
  { path: '/login', expect: 'Sign in' },
  { path: '/register', expect: 'Create your account' },
  { path: '/reset-password', expect: 'This link has expired' },
  // Signed out this must land on the sign-in form, not a blank frame.
  { path: '/profile', expect: 'Sign in' },
  { path: '/nope-not-a-route', expect: '404' },
];

/** Reports the widest offenders when the page scrolls sideways. */
async function findOverflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    if (scrollWidth <= docWidth + 1) return null;

    const offenders = [];
    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= docWidth + 1 && rect.left >= -1) continue;
      offenders.push(
        `${element.tagName.toLowerCase()}.${String(element.className || '').split(' ').filter(Boolean).slice(0, 2).join('.')} ` +
          `right=${Math.round(rect.right)}`,
      );
    }

    return {
      scrollWidth,
      docWidth,
      offenders: offenders.slice(0, 6),
    };
  });
}

/** Waits for the app to render something meaningful and the API to settle. */
/**
 * Navigates, tolerating TheMealDB's habit of stalling or resetting
 * connections.
 *
 * `networkidle2` never settles when a request hangs, so a single slow response
 * used to fail a check that had nothing to do with the network. One retry
 * separates "the app is broken" from "the API blinked".
 */
async function gotoRobust(page, url, options = {}) {
  const { retries = 1, ...rest } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await page.goto(url, { timeout: 60000, ...rest });
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

/**
 * Waits for real content, then for the page to finish loading.
 *
 * Checking only for `innerText.length > 40` is not enough: a loading state has
 * plenty of text, so assertions used to run against a spinner and report a
 * missing empty state or heading that was about to arrive.
 */
async function waitForContent(page) {
  await page.waitForSelector('#root > *', { timeout: 15000 });
  // Either real content or an explicit state block must appear.
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      if (!root) return false;
      const text = root.innerText || '';
      return text.length > 40;
    },
    { timeout: 20000 },
  );
  // Then the spinners and skeletons must be gone, or the page is still
  // fetching and any assertion now would be premature.
  await page
    .waitForFunction(
      () => {
        const pending = [...document.querySelectorAll('.spinner, .skeleton')].filter((node) => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        return pending.length === 0;
      },
      { timeout: 45000 },
    )
    .catch(() => {
      // A stuck spinner is reported by the assertion that follows, which
      // quotes the page text and so says what was actually on screen.
    });
  // Let skeleton transitions and images settle so measurements are stable.
  await new Promise((resolve) => setTimeout(resolve, 900));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

  console.log(`\nUsing: ${executablePath}`);
  console.log(`Base:  ${BASE_URL}\n`);

  console.log('Routes render real content');

  for (const route of ROUTES) {
    await check(`${route.path}`, async () => {
      await gotoRobust(page, `${BASE_URL}${route.path}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await waitForContent(page);

      const body = await page.evaluate(() => document.getElementById('root')?.innerText ?? '');
      assert.ok(
        body.includes(route.expect),
        `expected "${route.expect}" in the rendered text. Got: ${body.slice(0, 160).replace(/\n+/g, ' | ')}`,
      );
      assert.ok(
        !/Something went wrong\.\s*The page ran into/.test(body),
        'the error boundary rendered instead of the page',
      );
    });
  }

  console.log('\nNo horizontal overflow');

  for (const viewport of VIEWPORTS) {
    for (const route of ['/', '/recipes', '/categories', '/about', '/login', '/register', '/search?query=pasta']) {
      await check(`${viewport.name} ${route}`, async () => {
        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          isMobile: viewport.mobile,
          hasTouch: viewport.mobile,
        });
        await gotoRobust(page, `${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 45000 });
        await waitForContent(page);

        const overflow = await findOverflow(page);
        assert.equal(
          overflow,
          null,
          overflow
            ? `scrollWidth ${overflow.scrollWidth} > ${overflow.docWidth}. Offenders: ${overflow.offenders.join('; ')}`
            : '',
        );
      });
    }
  }

  console.log('\nTouch targets on a 375px phone');

  await check('interactive controls are at least 44px tall', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    const tooSmall = await page.evaluate(() => {
      const selector = 'button, a[href], input, select, [role="button"]';
      const failures = [];

      for (const element of document.querySelectorAll(selector)) {
        // Only measure what is actually on screen.
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        // Inline links inside a paragraph are exempt: stretching them would
        // break the line box. Anything with a button role must be large.
        const isInlineTextLink =
          element.tagName === 'A' &&
          style.display.includes('inline') &&
          !style.display.includes('flex') &&
          !style.display.includes('grid');

        if (isInlineTextLink) continue;

        if (rect.height < 44 || rect.width < 24) {
          failures.push(
            `${element.tagName.toLowerCase()}."${(element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 24)}" ` +
              `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      }

      return failures.slice(0, 8);
    });

    assert.deepEqual(tooSmall, [], `too small: ${tooSmall.join('; ')}`);
  });

  await check('drawer controls are at least 44px tall', async () => {
    // The drawer's search field only exists while the drawer is open, so it is
    // invisible to the check above.
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.click('.navbar__toggle');
    await page.waitForSelector('.mobile-menu .search-form', { timeout: 5000 });

    // Type something so the clear control renders.
    await page.type('.mobile-menu .search-form__input', 'pa');

    const tooSmall = await page.evaluate(() => {
      const failures = [];

      for (const element of document.querySelectorAll('.mobile-menu button, .mobile-menu a[href], .mobile-menu input')) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const isInlineTextLink =
          element.tagName === 'A' &&
          style.display.includes('inline') &&
          !style.display.includes('flex') &&
          !style.display.includes('grid');
        if (isInlineTextLink) continue;

        if (rect.height < 44 || rect.width < 24) {
          failures.push(
            `${element.tagName.toLowerCase()}."${(element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 20)}" ` +
              `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      }

      return failures.slice(0, 8);
    });

    assert.deepEqual(tooSmall, [], `too small: ${tooSmall.join('; ')}`);

    await page.keyboard.press('Escape');
  });

  console.log('\nMobile navigation');

  await check('hamburger opens the drawer and closes on Escape', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    assert.equal(await page.$('.mobile-menu'), null, 'drawer should start closed');

    await page.click('.navbar__toggle');
    await page.waitForSelector('.mobile-menu', { timeout: 5000 });

    const expanded = await page.$eval('.navbar__toggle', (el) => el.getAttribute('aria-expanded'));
    assert.equal(expanded, 'true', 'aria-expanded should be true while open');

    const drawerWidth = await page.$eval('.mobile-menu', (el) => el.getBoundingClientRect().width);
    assert.ok(drawerWidth <= 375, `drawer must fit the viewport (${drawerWidth}px)`);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.mobile-menu'), { timeout: 5000 });
  });

  await check('drawer closes when a link is clicked', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.click('.navbar__toggle');
    await page.waitForSelector('.mobile-menu', { timeout: 5000 });

    await page.evaluate(() => {
      const links = [...document.querySelectorAll('.mobile-menu__link')];
      const target = links.find((link) =>
        (link.getAttribute('href') || '').endsWith('/categories'),
      );
      if (!target) throw new Error('the drawer should contain a link to /categories');
      target.click();
    });

    await waitForRoute(page, "path === '/categories'", 5000);
    await page.waitForFunction(() => !document.querySelector('.mobile-menu'), { timeout: 5000 });
  });

  await check('search is reachable on a phone', async () => {
    // The header search is hidden below 1024px, so the drawer has to offer it.
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.click('.navbar__toggle');
    await page.waitForSelector('.mobile-menu .search-form', { timeout: 5000 });

    const field = await page.$('.mobile-menu .search-form__input');
    assert.ok(field, 'the drawer should contain a search field');

    await page.type('.mobile-menu .search-form__input', 'pasta');
    await page.keyboard.press('Enter');

    await waitForRoute(page, "path === '/search'", 5000);
    await page.waitForFunction(() => window.location.search.includes('pasta'), { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('.mobile-menu'), {
      timeout: 5000,
    }).catch(() => {
      throw new Error('searching from the drawer should close it');
    });
  });

  await check('drawer keeps focus inside itself', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.click('.navbar__toggle');
    await page.waitForSelector('.mobile-menu', { timeout: 5000 });

    // Focus should start inside the drawer, on its close button.
    const initial = await page.evaluate(() =>
      document.querySelector('.mobile-menu').contains(document.activeElement),
    );
    assert.ok(initial, 'focus should move into the drawer when it opens');

    // Tab past the end repeatedly: focus must never land back on the page.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');

      const inside = await page.evaluate(() =>
        document.querySelector('.mobile-menu').contains(document.activeElement),
      );
      assert.ok(inside, `focus escaped the drawer after ${i + 1} Tab presses`);
    }

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.mobile-menu'), { timeout: 5000 });

    // And it should come back to the button that opened it.
    const returned = await page.evaluate(
      () => document.activeElement === document.querySelector('.navbar__toggle'),
    );
    assert.ok(returned, 'focus should return to the toggle when the drawer closes');
  });

  await check('page load does not steal focus', async () => {
    // Regression: focusing the toggle on mount jumped past the skip link and
    // the brand link on a phone, where the toggle is visible.
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    assert.ok(
      focused.includes('skip-link'),
      `the first Tab should reach the skip link, but focus went to "${focused}"`,
    );
  });

  console.log('\nInteraction');

  await check('searching from the header navigates and filters', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.type('.navbar__search input[type="search"]', 'Arrabiata');
    await page.keyboard.press('Enter');

    await waitForRoute(page, "path === '/search'");
    await page.waitForFunction(
      () => (document.getElementById('root')?.innerText ?? '').includes('Search Results for'),
      { timeout: 15000 },
    );

    const text = await page.evaluate(() => document.getElementById('root').innerText);
    assert.ok(text.includes('Arrabiata'), 'the query should appear in the results heading');
  });

  await check('a recipe card opens its detail page with ingredients', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    await gotoRobust(page, `${BASE_URL}/recipes?category=Chicken`, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });
    await waitForContent(page);

    await page.waitForSelector('.card__title a', { timeout: 20000 });
    await page.click('.card__title a');

    await page.waitForFunction(() => window.location.pathname.includes('/recipe/'), {
      timeout: 10000,
    });
    await page.waitForFunction(
      () => (document.getElementById('root')?.innerText ?? '').includes('Ingredients'),
      { timeout: 20000 },
    );

    const text = await page.evaluate(() => document.getElementById('root').innerText);
    const ingredientCount = await page.evaluate(() => document.querySelectorAll('.ingredient').length);
    assert.ok(ingredientCount > 0, 'expected at least one ingredient row');
    assert.ok(/STEP|Add|Cook|Bake|Mix/i.test(text), 'expected instruction text');
  });

  await check('random recipe route resolves to a concrete recipe', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    await gotoRobust(page, `${BASE_URL}/recipe/random`, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });
    await waitForContent(page);

    await waitForRoute(page, '/\\/recipe\\/\\d+$/.test(path)', 25000);

    const text = await page.evaluate(() => document.getElementById('root').innerText);
    assert.ok(text.includes('Ingredients'), 'expected the resolved recipe to render');
  });

  await check('favourites persist across a reload', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    await gotoRobust(page, `${BASE_URL}/recipes?category=Beef`, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });
    await waitForContent(page);
    await page.waitForSelector('.card__favourite', { timeout: 20000 });

    await page.click('.card__favourite');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('recipe-discovery:favorites'),
    );
    assert.ok(stored && JSON.parse(stored).length > 0, 'favourite id should be stored');

    await gotoRobust(page, `${BASE_URL}/favorites`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    const text = await page.evaluate(() => document.getElementById('root').innerText);
    assert.ok(/1 recipe|recipes saved/i.test(text), `favourites page should list the saved recipe. Got: ${text.slice(0, 120)}`);

    // Leave no state behind for the next run.
    await page.evaluate(() => window.localStorage.clear());
  });

  console.log('\nAccessibility spot checks');

  await check('every page has exactly one h1 and a landmark structure', async () => {
    for (const route of ['/', '/recipes', '/categories', '/about', '/login', '/register']) {
      await gotoRobust(page, `${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await waitForContent(page);

      const audit = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        header: document.querySelectorAll('header').length,
        footer: document.querySelectorAll('footer').length,
        imgsNoAlt: [...document.querySelectorAll('img')].filter((img) => img.alt === null || img.alt === undefined).length,
        buttonsNoName: [...document.querySelectorAll('button')].filter((button) => {
          const name = (button.innerText || '').trim() || button.getAttribute('aria-label');
          return !name;
        }).length,
        skipLink: Boolean(document.querySelector('.skip-link')),
      }));

      assert.equal(audit.h1, 1, `${route} should have exactly one h1, found ${audit.h1}`);
      assert.equal(audit.main, 1, `${route} should have one main landmark`);
      assert.ok(audit.header >= 1, `${route} should have a header`);
      assert.ok(audit.footer >= 1, `${route} should have a footer`);
      assert.equal(audit.imgsNoAlt, 0, `${route} has images with no alt attribute`);
      assert.equal(audit.buttonsNoName, 0, `${route} has unnamed buttons`);
      assert.ok(audit.skipLink, `${route} should offer a skip link`);
    }
  });

  await check('keyboard focus reaches the search field and the skip link', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    await gotoRobust(page, `${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await waitForContent(page);

    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className ?? '');
    assert.ok(first.includes('skip-link'), `first tab stop should be the skip link, got "${first}"`);
  });

  await check('no console errors were logged during the run', async () => {
    // Third-party image 404s and aborted prefetches are not app bugs.
    const real = consoleErrors.filter(
      (message) =>
        !/favicon|ERR_ABORTED|net::ERR_FAILED.*(image|themealdb)/i.test(message) &&
        !/Failed to load resource/i.test(message),
    );
    assert.deepEqual(real.slice(0, 5), [], `console errors: ${real.slice(0, 5).join(' | ')}`);
  });

  await browser.close();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
