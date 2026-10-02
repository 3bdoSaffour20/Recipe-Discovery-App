/**
 * One-off asset optimiser.
 *
 * The reference photos and logo shipped with the original static build are
 * desktop sized exports (the hero photo alone was 4.1 MB, the logo 159 KB).
 * This script re-encodes every local asset into responsive WebP + fallback
 * pairs at sensible widths, plus favicons, so mobile browsers never download
 * a camera-resolution file.
 *
 * Originals stay in Images/, Icons/ and the repo root, so the script is
 * re-runnable.
 *
 * Run with:  npm run optimize:assets
 */
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PHOTOS = path.join(ROOT, 'Images');
const ICONS = path.join(ROOT, 'Icons');
const LOGO = path.join(ROOT, 'Discover Recipes.png');

const PHOTO_OUT = path.join(ROOT, 'src/assets/images/generated');
const ICON_OUT = path.join(ROOT, 'src/assets/icons/generated');
const BRAND_OUT = path.join(ROOT, 'src/assets/brand/generated');
const PUBLIC_OUT = path.join(ROOT, 'public');

/** Superseded full-size copies staged before the app existed. */
const STALE_FILES = [
  'src/assets/logo.png',
  'src/assets/images/hero.jpg',
  'src/assets/images/category-beef.jpg',
  'src/assets/images/category-chicken.jpg',
  'src/assets/images/category-dessert.jpg',
  'src/assets/images/category-pasta.jpg',
  'src/assets/icons/beef.png',
  'src/assets/icons/cake.png',
  'src/assets/icons/chicken.png',
  'src/assets/icons/pasta.png',
  'public/favicon.ico',
];

/**
 * Per-photo emit plan. The hero fills the viewport so it gets two widths;
 * the category tiles are small and a single width beats shipping variants
 * the browser will never pick.
 */
const PHOTO_PLAN = {
  'Backgound.jpg': { stem: 'hero', widths: [960, 1600] },
  'Beef Backgound.jpg': { stem: 'category-beef', widths: [560] },
  'Chicken Backgound.jpg': { stem: 'category-chicken', widths: [560] },
  'Cake Backgound.jpg': { stem: 'category-dessert', widths: [560] },
  'Pasta Backgound.jpg': { stem: 'category-pasta', widths: [560] },
};

/** Category badge icons, rendered at 96px inside the hero tiles. */
const ICON_PLAN = {
  'beef.png': 'beef',
  'chicken.png': 'chicken',
  'cake.png': 'cake',
  'pasta.png': 'pasta',
};

const ICON_SIZE = 96;
const LOGO_WIDTHS = [96, 192];
const FAVICON_SIZES = { 'favicon-32.png': 32, 'apple-touch-icon.png': 180 };

/** Emits a WebP + JPEG pair from one pipeline, returning the combined size. */
async function emitPair(pipeline, stem, width, outDir) {
  const webp = path.join(outDir, `${stem}-${width}.webp`);
  const jpeg = path.join(outDir, `${stem}-${width}.jpg`);

  await pipeline.clone().webp({ quality: 78, effort: 5 }).toFile(webp);
  await pipeline
    .clone()
    .jpeg({ quality: 76, progressive: true, mozjpeg: true })
    .toFile(jpeg);

  return (await stat(webp)).size + (await stat(jpeg)).size;
}

function report(label, before, after, count) {
  const saved = ((1 - after / before) * 100).toFixed(0);
  console.log(
    `${label.padEnd(24)} ${(before / 1024).toFixed(0).padStart(5)} KB -> ` +
      `${(after / 1024).toFixed(0).padStart(4)} KB (${count} files, -${saved}%)`,
  );
}

async function processPhotos() {
  for (const [fileName, { stem, widths }] of Object.entries(PHOTO_PLAN)) {
    const input = path.join(PHOTOS, fileName);
    const before = (await stat(input)).size;

    let after = 0;
    for (const width of widths) {
      after += await emitPair(
        sharp(input).resize({ width, withoutEnlargement: true }).rotate(),
        stem,
        width,
        PHOTO_OUT,
      );
    }

    report(fileName, before, after, widths.length * 2);
  }
}

async function processIcons() {
  for (const [fileName, stem] of Object.entries(ICON_PLAN)) {
    const input = path.join(ICONS, fileName);
    const before = (await stat(input)).size;

    // `fit: inside` keeps the aspect ratio; `ensureAlpha` preserves the
    // transparent background the original badges rely on.
    const after = await emitPair(
      sharp(input)
        .resize({ width: ICON_SIZE, height: ICON_SIZE, fit: 'inside', withoutEnlargement: true })
        .ensureAlpha(),
      stem,
      ICON_SIZE,
      ICON_OUT,
    );

    report(fileName, before, after, 2);
  }
}

async function processBrand() {
  const before = (await stat(LOGO)).size;
  let after = 0;

  for (const width of LOGO_WIDTHS) {
    after += await emitPair(
      sharp(LOGO).resize({ width, withoutEnlargement: true }).rotate(),
      'logo',
      width,
      BRAND_OUT,
    );
  }

  // Favicons stay PNG; sharp cannot write .ico.
  for (const [fileName, size] of Object.entries(FAVICON_SIZES)) {
    const png = path.join(PUBLIC_OUT, fileName);
    await sharp(LOGO)
      .resize({ width: size, height: size, fit: 'cover' })
      .png()
      .toFile(png);
    after += (await stat(png)).size;
  }

  report('Discover Recipes.png', before, after, LOGO_WIDTHS.length * 2 + 2);
}

async function removeStaleCopies() {
  for (const relative of STALE_FILES) {
    await rm(path.join(ROOT, relative), { force: true });
  }

  // Drop any unoptimised leftovers an earlier run may have left in generated/.
  for (const dir of [PHOTO_OUT, ICON_OUT, BRAND_OUT]) {
    const generated = path.basename(dir);
    for (const name of await readdir(path.dirname(dir)).catch(() => [])) {
      if (name !== generated) await rm(path.join(path.dirname(dir), name), { recursive: true, force: true });
    }
  }
}

async function main() {
  for (const dir of [PHOTO_OUT, ICON_OUT, BRAND_OUT, PUBLIC_OUT]) {
    await mkdir(dir, { recursive: true });
  }

  await processPhotos();
  await processIcons();
  await processBrand();
  await removeStaleCopies();

  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
