/**
 * Smoke test for the API service and the pure helpers.
 *
 * Runs the real functions the app imports, against the live TheMealDB API.
 * Usage:  node scripts/smoke-api.mjs
 */
import assert from 'node:assert/strict';
import * as api from '../src/services/mealApi.js';
import {
  buildIngredients,
  splitInstructions,
  hasStepMarkers,
  toYoutubeEmbedUrl,
  normalizeMeal,
  humanize,
  truncate,
} from '../src/utils/helpers.js';
import {
  getCountryCode,
  getFlagClassName,
  hasCountryFlag,
  normalizeKey,
  UNKNOWN_CUISINE_LABEL,
  UNMAPPED_AREAS,
  AREA_COUNTRY_CODES,
  FLAG_ASSET_CODES,
} from '../src/utils/countryFlags.js';

let passed = 0;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (error) {
    console.log(`  FAIL  ${label}\n        ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('\nPure helpers');

await check('buildIngredients pairs measures and skips empty slots', () => {
  const meal = {
    strIngredient1: 'Chicken',
    strMeasure1: '200g',
    strIngredient2: '',
    strMeasure2: '1 tsp',
    strIngredient3: 'Salt',
    strMeasure3: '',
    strIngredient4: 'Olive Oil',
    strMeasure4: '2 tbsp',
  };
  const result = buildIngredients(meal);
  assert.equal(result.length, 3, 'should drop the empty slot');
  assert.deepEqual(result[0], { index: 1, name: 'Chicken', measure: '200g' });
  assert.deepEqual(result[2], { index: 4, name: 'Olive Oil', measure: '2 tbsp' });
});

await check('buildIngredients handles a full 20-slot record', () => {
  const meal = {};
  for (let i = 1; i <= 20; i += 1) {
    meal[`strIngredient${i}`] = `Item ${i}`;
    meal[`strMeasure${i}`] = `${i} g`;
  }
  assert.equal(buildIngredients(meal).length, 20);
});

await check('splitInstructions reads a numbered list', () => {
  const steps = splitInstructions('1. Preheat the oven.\n2. Add the chicken.\n3. Bake.');
  assert.equal(steps.length, 3);
  assert.ok(!/^\d/.test(steps[0]), 'leading numbers should be stripped');
});

await check('splitInstructions splits on STEP markers and HTML', () => {
  const steps = splitInstructions('STEP 1 - Mix<br/>STEP 2 - Bake');
  assert.equal(steps.length, 2);
});

await check('splitInstructions does not tear apart measurements', () => {
  // "20." is a number followed by a full stop, but it is not a step marker.
  const steps = splitInstructions('Bake for 20. minutes until golden brown.');
  assert.equal(steps.length, 1);
  assert.ok(steps[0].includes('20.'), 'the measurement must survive intact');
});

await check('splitInstructions keeps a wrapped line with its step', () => {
  const steps = splitInstructions('1. Add the 200 g flour\n   and mix well.\n2. Bake.');
  assert.equal(steps.length, 2);
  assert.ok(steps[0].includes('and mix well'), 'continuation should join step 1');
});

await check('hasStepMarkers only reports real lists', () => {
  assert.equal(hasStepMarkers('1. Mix\n2. Bake'), true);
  assert.equal(hasStepMarkers('STEP 1 - Mix<br/>STEP 2 - Bake'), true);
  assert.equal(hasStepMarkers('Cook it slowly until golden brown.'), false);
  assert.equal(hasStepMarkers('Bake for 20. minutes'), false);
});

await check('splitInstructions keeps prose as a single block', () => {
  const steps = splitInstructions('Cook it slowly until everything is golden brown.');
  assert.equal(steps.length, 1);
});

await check('splitInstructions splits unnumbered prose into paragraphs', () => {
  // Most TheMealDB records have no step markers at all; the line breaks are
  // the only step structure there is.
  const steps = splitInstructions('Preheat the oven.\nCombine the sauce.\nBake for 30 minutes.');
  assert.equal(steps.length, 3);
  assert.ok(steps[0].startsWith('Preheat'), `got "${steps[0]}"`);
  assert.ok(steps[2].includes('30 minutes'), `got "${steps[2]}"`);
});

await check('splitInstructions drops separator-only lines', () => {
  // Real records contain lines holding nothing but a bullet or box glyph.
  const steps = splitInstructions('▢\nCut the fish into cubes.\n•\nSeason the fish.');
  assert.equal(steps.length, 2, 'the glyph lines are separators, not steps');
  assert.ok(steps.every((step) => /[\p{L}\p{N}]/u.test(step)));
  assert.ok(steps[0].startsWith('Cut the fish'), `got "${steps[0]}"`);
});

await check('splitInstructions handles Windows line endings', () => {
  const steps = splitInstructions('Mix the batter.\r\nFry until golden.\r\nServe.');
  assert.equal(steps.length, 3);
});

await check('normalizeMeal preserves instruction line breaks', () => {
  // Regression: collapsing whitespace here silently reduced every recipe to a
  // single unreadable paragraph, because the newlines are the step structure.
  const meal = normalizeMeal({
    idMeal: '52772',
    strInstructions: 'Preheat the oven.\r\nCombine the sauce.\r\nBake for 30 minutes.',
  });
  assert.ok(meal.instructions.includes('\n'), 'newlines must survive normalisation');
  assert.equal(splitInstructions(meal.instructions).length, 3);
});

await check('toYoutubeEmbedUrl handles every known URL shape', () => {
  assert.equal(
    toYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
  assert.equal(
    toYoutubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'),
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
  assert.equal(toYoutubeEmbedUrl('not a url'), '');
});

await check('normalizeMeal maps TheMealDB fields and splits tags', () => {
  const meal = normalizeMeal({
    idMeal: '52772',
    strMeal: ' Teriyaki Chicken ',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strTags: 'Meat',
    strMealThumb: '//www.themealdb.com/images/media/meals/xyz.jpg',
  });
  assert.equal(meal.id, '52772');
  assert.equal(meal.name, 'Teriyaki Chicken');
  assert.equal(meal.area, 'Japanese');
  assert.deepEqual(meal.tags, ['Meat']);
});

await check('humanize and truncate behave', () => {
  assert.equal(humanize('chicken_breast'), 'Chicken Breast');
  assert.ok(truncate('a'.repeat(200), 10).endsWith('...'));
});

console.log('\nCountry flags');

/*
 * Flags are SVG artwork from the `flag-icons` package, addressed by ISO
 * 3166-1 alpha-2 code. That choice is the point of the rewrite: a Unicode
 * regional-indicator pair is only a flag when the OS has the glyph, and
 * Windows desktop browsers without an emoji flag font fall back to printing the
 * two letters — "ES Spanish" instead of the flag of Spain.
 */
await check('getCountryCode maps TheMealDB areas to ISO codes', () => {
  const expected = {
    American: 'us',
    British: 'gb',
    Canadian: 'ca',
    Chinese: 'cn',
    Croatian: 'hr',
    Dutch: 'nl',
    Egyptian: 'eg',
    Filipino: 'ph',
    French: 'fr',
    Greek: 'gr',
    Indian: 'in',
    Irish: 'ie',
    Italian: 'it',
    Jamaican: 'jm',
    Japanese: 'jp',
    Kenyan: 'ke',
    Malaysian: 'my',
    Mexican: 'mx',
    Moroccan: 'ma',
    Norwegian: 'no',
    Polish: 'pl',
    Portuguese: 'pt',
    Russian: 'ru',
    Spanish: 'es',
    Thai: 'th',
    Tunisian: 'tn',
    Turkish: 'tr',
    Ukrainian: 'ua',
    Uruguayan: 'uy',
    Vietnamese: 'vn',
    Algerian: 'dz',
  };
  for (const [area, code] of Object.entries(expected)) {
    assert.equal(getCountryCode(area), code, `${area} should be ${code}`);
  }
});

await check('every mapped area resolves to a code the flag library ships', () => {
  // A code with no SVG behind it would render an empty box, so the mapping and
  // the asset list are checked against each other rather than trusted.
  const missing = [...new Set(AREA_COUNTRY_CODES.map((entry) => entry.code))].filter(
    (code) => !FLAG_ASSET_CODES.has(code),
  );
  assert.deepEqual(missing, [], `no flag artwork for: ${missing.join(', ')}`);
});

await check('getCountryCode accepts the country name as well as the demonym', () => {
  assert.equal(getCountryCode('United States'), 'us');
  assert.equal(getCountryCode('Malaysia'), 'my');
  assert.equal(getCountryCode('United Kingdom'), 'gb');
  assert.equal(getCountryCode('USA'), 'us');
  assert.equal(getCountryCode('UK'), 'gb');
  // The five cases that motivated replacing the emoji flags.
  assert.equal(getCountryCode('Spanish'), 'es');
  assert.equal(getCountryCode('Italian'), 'it');
  assert.equal(getCountryCode('Algerian'), 'dz');
  assert.equal(getCountryCode('Thai'), 'th');
  assert.equal(getCountryCode('Portuguese'), 'pt');
});

await check('getCountryCode matching ignores case, accents and punctuation', () => {
  for (const spelling of ['Malaysian', 'malaysian', 'MALAYSIAN', '  Malaysian  ']) {
    assert.equal(getCountryCode(spelling), 'my', `got for "${spelling}"`);
  }
  assert.equal(getCountryCode('  SPANISH '), 'es');
  assert.equal(getCountryCode('spanish'), 'es');
  // TheMealDB's own odd spellings for these areas.
  assert.equal(getCountryCode('Ni-Vanuatu'), 'vu');
  assert.equal(getCountryCode('Bosnian, Herzegovinian'), 'ba');
  assert.equal(getCountryCode('Salvadoran'), 'sv');
  assert.equal(getCountryCode('Motswana'), 'bw');
  assert.equal(getCountryCode('Cote d\'Ivoire'), 'ci');
});

await check('a missing or unknown area resolves to null, never a default country', () => {
  // The app must not state a provenance TheMealDB did not give it, so these
  // produce no code at all rather than defaulting to a popular country.
  for (const unknown of ['Atlantis', '', '   ', null, undefined, 'Channel Islander']) {
    assert.equal(getCountryCode(unknown), null, `got "${getCountryCode(unknown)}"`);
    assert.equal(getFlagClassName(unknown), null, 'a class name would render a broken flag');
    assert.equal(hasCountryFlag(unknown), false);
  }
  assert.equal(getCountryCode('Malaysian'), 'my');
});

await check('getFlagClassName never emits an unrenderable class', () => {
  // The class is what lands in the DOM, so it is the last place a bad value
  // could escape: `fi fi-null` or `fi fi-` would paint an empty box.
  for (const [area, code] of [
    ['Spanish', 'es'],
    ['Italian', 'it'],
    ['Algerian', 'dz'],
    ['Thai', 'th'],
    ['Portuguese', 'pt'],
    ['American', 'us'],
  ]) {
    assert.equal(getFlagClassName(area), `fi fi-${code}`);
  }
  for (const bad of ['', null, undefined, 'Unknown Cuisine']) {
    const className = getFlagClassName(bad);
    assert.ok(className === null || /^fi fi-[a-z]{2}$/.test(className), `got "${className}"`);
  }
});

await check('the unknown-cuisine label says so instead of naming a country', () => {
  // Guards the copy the placeholder is paired with: it must not drift into
  // implying a country, and it must not be blank.
  assert.ok(UNKNOWN_CUISINE_LABEL.trim().length > 0);
  assert.equal(UNKNOWN_CUISINE_LABEL, 'Cuisine not specified');
});

await check('every live TheMealDB area resolves to a country code', async () => {
  const url = 'https://www.themealdb.com/api/json/v1/1/list.php?a=list';
  const { meals } = await (await fetch(url)).json();
  const areas = [...new Set(meals.map((meal) => meal.strArea))];
  // The Channel Islands are two bailiwicks with no single national flag, so
  // they are documented as expected to take the placeholder instead.
  const expectedFallbacks = UNMAPPED_AREAS;
  const unexpected = areas.filter(
    (area) => !hasCountryFlag(area) && !expectedFallbacks.includes(area),
  );
  assert.deepEqual(unexpected, [], `areas with no code: ${unexpected.join(', ')}`);
  assert.ok(areas.length > 100, `expected the full area list, got ${areas.length}`);
});

await check('flags match real meals from several different countries', async () => {
  // The end-to-end claim behind the feature: a card shows the flag of the
  // country the API actually names, not a globe standing in for all of them.
  // Real records, one per country. The strings are search terms, which the API
  // matches as a substring, so they are trimmed to the distinctive part.
  const recipes = [
    { name: 'Chicken Karaage', code: 'jp' },
    { name: 'Drunken noodles', code: 'th' },
    { name: 'Chicken wings with cumin', code: 'tr' },
    { name: 'Classic Tourti', code: 'ca' },
    { name: 'Moussaka', code: 'gr' },
    { name: 'Spaghetti Bolognese', code: 'it' },
    { name: 'Chicken Couscous', code: 'ma' },
    { name: 'Beef Rendang', code: 'my' },
    { name: 'Beef and Mustard Pie', code: 'gb' },
    { name: 'chorizo rice', code: 'es' },
    { name: 'Braised Beef Chilli', code: 'mx' },
    { name: 'Jamaican Style', code: 'jm' },
    { name: 'Portuguese prego', code: 'pt' },
    { name: 'Egyptian Fatteh', code: 'eg' },
    { name: 'Beef Asado', code: 'ph' },
    { name: 'Banh Mi Bowls', code: 'vn' },
    { name: 'Bigos', code: 'pl' },
    { name: 'Beef stroganoff', code: 'ru' },
    // TheMealDB spells this one out as a country rather than a demonym.
    { name: 'Big Mac', code: 'us' },
  ];

  for (const recipe of recipes) {
    const [meal] = await api.searchMeals(recipe.name);
    assert.ok(meal, `no meal found for ${recipe.name}`);
    // TheMealDB is not consistent about `strArea` — Big Mac says "United
    // States" while the area list says "American" — so the code is what is
    // asserted, not the spelling.
    const code = getCountryCode(meal.strArea);
    assert.equal(code, recipe.code, `${recipe.name} (${meal.strArea}) should show ${recipe.code}`);
    // The card renders the humanised area, so that path must agree too.
    assert.equal(getCountryCode(normalizeMeal(meal).area), recipe.code);
  }
});

await check('a missing area falls back to strCountry, never to a guess', () => {
  // `strArea` is the primary source and `strCountry` is stated by the same
  // response, so falling back to it recovers data rather than inventing it.
  const withBoth = normalizeMeal({ idMeal: '1', strArea: '  spanish ', strCountry: 'Spain' });
  assert.equal(withBoth.area, 'Spanish', 'strArea must win when present');

  const areaOnly = normalizeMeal({ idMeal: '2', strArea: 'Malaysian' });
  assert.equal(areaOnly.area, 'Malaysian');

  const countryOnly = normalizeMeal({ idMeal: '3', strArea: '', strCountry: 'Algeria' });
  assert.equal(countryOnly.area, 'Algeria', 'should fall back to the country');
  assert.equal(getCountryCode(countryOnly.area), 'dz', 'and still resolve a flag');

  const neither = normalizeMeal({ idMeal: '4', strArea: null, strCountry: null });
  assert.equal(neither.area, '', 'with neither field there is nothing to show');
});

await check('every area the API actually serves resolves to a flag', async () => {
  // Walks the free categories end to end, which is what the cards render, and
  // requires both the demonym and the country-name spellings to resolve.
  const categories = ['Beef', 'Chicken', 'Dessert', 'Pasta', 'Seafood', 'Vegan', 'Side', 'Lamb'];
  const seen = new Map();
  let total = 0;

  for (const category of categories) {
    for (const meal of await api.getMealsByCategory(category)) {
      total += 1;
      const { area } = normalizeMeal(meal);
      if (area) seen.set(area, getCountryCode(area));
    }
  }

  assert.ok(total > 400, `expected a few hundred meals, got ${total}`);
  const unresolved = [...seen].filter(([, code]) => !code);
  assert.deepEqual(
    unresolved.map(([area]) => area),
    [],
    'recipes the card would show a placeholder for',
  );
  // Distinct countries must not collapse onto one shared flag.
  assert.equal(new Set(seen.values()).size, seen.size, `codes collided: ${[...seen]}`);
  console.log(
    `        ${seen.size} countries from ${total} meals: ` +
      `${[...seen].map(([area, code]) => `${code} ${area}`).join(', ')}`,
  );
});

await check('a meal with no area yields no flag and no invented country', async () => {
  // TheMealDB leaves both `strArea` and `strCountry` off some records. Whatever
  // it sends, the card has to render the placeholder rather than a wrong flag.
  for (const record of [
    { idMeal: '1', strMeal: 'A', strArea: null, strCountry: null },
    { idMeal: '2', strMeal: 'B', strArea: '', strCountry: '' },
    { idMeal: '3', strMeal: 'C' },
  ]) {
    const meal = normalizeMeal(record);
    assert.equal(meal.area, '', `expected no area, got "${meal.area}"`);
    assert.equal(getCountryCode(record.strArea), null);
    assert.equal(getFlagClassName(record.strArea), null);
  }

  // A cuisine the API names but the mapping does not know keeps its text — it
  // is specified, we simply cannot draw its flag — and still claims no country.
  const unmapped = normalizeMeal({ idMeal: '4', strMeal: 'D', strArea: 'Atlantean' });
  assert.equal(unmapped.area, 'Atlantean', 'the text must survive rather than be blanked');
  assert.equal(getFlagClassName(unmapped.area), null, 'but it must not claim a country');
});

await check('normalizeKey folds the spellings the API actually sends', () => {
  assert.equal(normalizeKey('  Spanish  '), 'spanish');
  assert.equal(normalizeKey('Thai Cuisine'), 'thai');
  assert.equal(normalizeKey('the Netherlands'), 'netherlands');
  assert.equal(normalizeKey(null), '');
});

console.log('\nLive API');

await check('getCategories returns the expected categories', async () => {
  const categories = await api.getCategories();
  assert.ok(categories.length >= 14, `got ${categories.length}`);
  const names = categories.map((category) => category.strCategory);
  for (const expected of ['Beef', 'Chicken', 'Dessert', 'Pasta', 'Vegan', 'Goat']) {
    assert.ok(names.includes(expected), `missing category: ${expected}`);
  }
});

await check('searchMeals("Arrabiata") returns a full record', async () => {
  const meals = await api.searchMeals('Arrabiata');
  assert.ok(meals.length > 0, 'expected at least one match');
  const meal = meals[0];
  assert.ok(meal.strInstructions, 'search.php should include instructions');
  assert.ok(buildIngredients(meal).length > 0, 'should yield ingredients');
});

await check('searchMeals("") returns [] without a request', async () => {
  assert.deepEqual(await api.searchMeals(''), []);
});

await check('getMealsByCategory("Dessert") returns summaries', async () => {
  const meals = await api.getMealsByCategory('Dessert');
  assert.ok(meals.length > 0);
  assert.ok(meals[0].strMealThumb, 'filter.php returns thumbnails');
});

await check('getMealsByIngredient("chicken_breast") returns summaries', async () => {
  const meals = await api.getMealsByIngredient('chicken_breast');
  assert.ok(Array.isArray(meals));
});

await check('getFeaturedMeals returns the requested number of real meals', async () => {
  const meals = await api.getFeaturedMeals(12);
  assert.equal(meals.length, 12, `got ${meals.length}`);
  // Every entry must be a real record with an id and a thumbnail.
  for (const meal of meals) {
    assert.ok(meal.idMeal, 'missing idMeal');
    assert.ok(meal.strMealThumb, `missing thumbnail for ${meal.idMeal}`);
  }
});

await check('getFeaturedMeals serves the second call from cache', async () => {
  const started = Date.now();
  await api.getFeaturedMeals(12);
  assert.ok(Date.now() - started < 50, 'cached response should be instant');
});

await check('getMealDetails upgrades a summary record to a full one', async () => {
  const [summary] = await api.getMealsByCategory('Dessert');
  const detail = await api.getMealDetails(summary.idMeal);
  assert.ok(detail, 'expected a record');
  assert.ok(buildIngredients(detail).length > 0, 'expected ingredients');
  assert.ok(detail.strInstructions, 'expected instructions');
});

await check('getMealDetails("does-not-exist") resolves to null', async () => {
  assert.equal(await api.getMealDetails('does-not-exist'), null);
});

await check('getRandomMeal returns one record with a thumbnail', async () => {
  const meal = await api.getRandomMeal();
  assert.ok(meal, 'expected a meal');
  assert.ok(meal.idMeal && meal.strMealThumb);
});

await check('listIngredients returns a usable list', async () => {
  const ingredients = await api.listIngredients();
  assert.ok(ingredients.length > 50, `got ${ingredients.length}`);
});

await check('listCategories returns the category names', async () => {
  const categories = await api.listCategories();
  assert.ok(categories.includes('Chicken'));
});

console.log(`\n${passed} checks passed.\n`);
