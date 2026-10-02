/**
 * Captures screenshots of the key pages at the viewports from the brief, for
 * visual comparison against the reference design.
 *
 * Usage:  npm run build && node scripts/screenshot.mjs
 * Output: screenshots/
 */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = CHROME_PATHS.find((candidate) => existsSync(candidate));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT_DIR = path.resolve('screenshots');

const SHOTS = [
  { name: 'home-desktop', route: '/', width: 1366, height: 900 },
  { name: 'home-mobile', route: '/', width: 375, height: 812, mobile: true },
  { name: 'home-mobile-small', route: '/', width: 320, height: 640, mobile: true },
  { name: 'home-tablet', route: '/', width: 768, height: 1024, mobile: true },
  { name: 'recipes-mobile', route: '/recipes?category=Chicken', width: 375, height: 812, mobile: true },
  { name: 'detail-desktop', route: '/recipe/52772', width: 1366, height: 900 },
  { name: 'detail-mobile', route: '/recipe/52772', width: 375, height: 812, mobile: true },
  { name: 'categories-desktop', route: '/categories', width: 1366, height: 900 },
  { name: 'about-mobile', route: '/about', width: 375, height: 812, mobile: true },
];

async function settle(page) {
  await page.waitForSelector('#root > *', { timeout: 15000 });
  await page.waitForFunction(
    () => ((document.getElementById('root')?.innerText ?? '').length > 40),
    { timeout: 20000 },
  );
  // Let lazy images decode and skeleton animations finish.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.evaluate(async () => {
    // Force any still-lazy images to load so the capture is complete.
    for (const image of document.images) {
      if (!image.complete) {
        image.loading = 'eager';
        try {
          await image.decode();
        } catch {
          /* broken image, ignore */
        }
      }
    }
    window.scrollTo(0, 0);
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  for (const shot of SHOTS) {
    await page.setViewport({
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 1,
      isMobile: Boolean(shot.mobile),
      hasTouch: Boolean(shot.mobile),
    });

    await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: 'networkidle2', timeout: 45000 });
    await settle(page);

    const file = path.join(OUT_DIR, `${shot.name}.png`);
    await page.screenshot({ path: file });
    console.log(`captured ${shot.name}  (${shot.route} @ ${shot.width}px)`);
  }

  // Mobile drawer, captured open.
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await settle(page);
  await page.click('.navbar__toggle');
  await page.waitForSelector('.mobile-menu', { timeout: 5000 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-menu-open.png') });
  console.log('captured mobile-menu-open');

  await browser.close();
  console.log(`\nSaved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
