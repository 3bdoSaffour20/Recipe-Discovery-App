/**
 * Local image manifest.
 *
 * The optimiser emits a WebP + JPEG pair per width (see
 * `scripts/optimize-assets.mjs`). Importing the files here means Vite hashes
 * and rewrites the URLs at build time, and gives every component a ready-made
 * `<picture>` descriptor instead of hand-written `srcSet` strings.
 */

import hero960Webp from './images/generated/hero-960.webp';
import hero960Jpg from './images/generated/hero-960.jpg';
import hero1600Webp from './images/generated/hero-1600.webp';
import hero1600Jpg from './images/generated/hero-1600.jpg';

import beefWebp from './images/generated/category-beef-560.webp';
import beefJpg from './images/generated/category-beef-560.jpg';
import chickenWebp from './images/generated/category-chicken-560.webp';
import chickenJpg from './images/generated/category-chicken-560.jpg';
import dessertWebp from './images/generated/category-dessert-560.webp';
import dessertJpg from './images/generated/category-dessert-560.jpg';
import pastaWebp from './images/generated/category-pasta-560.webp';
import pastaJpg from './images/generated/category-pasta-560.jpg';

import beefIconWebp from './icons/generated/beef-96.webp';
import beefIconJpg from './icons/generated/beef-96.jpg';
import chickenIconWebp from './icons/generated/chicken-96.webp';
import chickenIconJpg from './icons/generated/chicken-96.jpg';
import cakeIconWebp from './icons/generated/cake-96.webp';
import cakeIconJpg from './icons/generated/cake-96.jpg';
import pastaIconWebp from './icons/generated/pasta-96.webp';
import pastaIconJpg from './icons/generated/pasta-96.jpg';

import logo96Webp from './brand/generated/logo-96.webp';
import logo96Jpg from './brand/generated/logo-96.jpg';
import logo192Webp from './brand/generated/logo-192.webp';
import logo192Jpg from './brand/generated/logo-192.jpg';

/** Hero backdrop — two widths so phones never download the 1600px file. */
export const heroImage = {
  srcSet: `${hero960Webp} 960w, ${hero1600Webp} 1600w`,
  src: hero1600Jpg,
};

/** Smallest source used for every locally bundled photograph. */
const TILE_WIDTH = 560;

/** Builds a `<picture>` descriptor for one optimised photo. */
function photo(webp, jpg) {
  return { srcSet: `${webp} ${TILE_WIDTH}w`, src: jpg };
}

export const categoryPhotos = {
  Beef: photo(beefWebp, beefJpg),
  Chicken: photo(chickenWebp, chickenJpg),
  Dessert: photo(dessertWebp, dessertJpg),
  Pasta: photo(pastaWebp, pastaJpg),
};

const ICON_WIDTH = 96;

/** Badge icons used by the hero category tiles. */
function icon(webp, jpg) {
  return { srcSet: `${webp} ${ICON_WIDTH}w`, src: jpg };
}

export const categoryIcons = {
  Beef: icon(beefIconWebp, beefIconJpg),
  Chicken: icon(chickenIconWebp, chickenIconJpg),
  Cake: icon(cakeIconWebp, cakeIconJpg),
  Pasta: icon(pastaIconWebp, pastaIconJpg),
};

/** Brand mark, emitted small and large for retina and normal-density screens. */
export const logo = {
  srcSet: `${logo96Webp} 96w, ${logo192Webp} 192w`,
  src: logo96Jpg,
};
