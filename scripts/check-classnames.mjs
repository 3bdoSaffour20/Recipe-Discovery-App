/**
 * Cross-checks the class names used in JSX against the selectors defined in
 * CSS.
 *
 * A typo in either place silently removes a style — there is no error, just a
 * layout that quietly stops applying. This catches that class of bug.
 *
 * Usage:  node scripts/check-classnames.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = path.resolve('src');

/** Recursively collects files with the given extensions. */
async function collect(dir, extensions, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, extensions, files);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(full);
  }
  return files;
}

/**
 * Reads the value of a `className` attribute, handling all three forms:
 *   className="a b"
 *   className={'a b'}
 *   className={`a ${cond ? 'b' : 'c'}`}
 *
 * Returns the raw value text, or null when the attribute is absent.
 */
function readAttributeValue(source, startIndex) {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) index += 1;

  const quote = source[index];
  if (quote === '"' || quote === "'") {
    const end = source.indexOf(quote, index + 1);
    if (end === -1) return null;
    // Quotes already stripped, so the value is entirely static.
    return { text: source.slice(index + 1, end), isStatic: true };
  }

  if (source[index] !== '{') return null;

  // Walk to the matching brace, ignoring braces inside strings.
  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === '"' || char === "'" || char === '`') {
      const end = source.indexOf(char, cursor + 1);
      if (end === -1) return null;
      cursor = end;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { text: source.slice(index + 1, cursor), isStatic: false };
    }
  }
  return null;
}

/** Class names written in `className` attributes. */
function extractJsxClasses(source) {
  const names = new Set();

  for (const match of source.matchAll(/className\s*=/g)) {
    const value = readAttributeValue(source, match.index + match[0].length);
    if (!value) continue;

    const segments = value.isStatic
      ? [value.text]
      : [...staticSegments(dropComparisonOperands(value.text))];

    for (const segment of segments) {
      for (const token of segment.split(/\s+/)) {
        if (token && /^[a-z][\w-]*$/.test(token)) names.add(token);
      }
    }
  }

  // Classes toggled imperatively, e.g. `classList.add('scroll-locked')`.
  for (const match of source.matchAll(/\bclassList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    for (const literal of match[1].matchAll(/['"`]([^'"`]*)['"`]/g)) {
      for (const token of literal[1].split(/\s+/)) {
        if (token && /^[a-z][\w-]*$/.test(token)) names.add(token);
      }
    }
  }

  return names;
}

/**
 * Drops strings that are operands of a comparison rather than class names.
 *
 *   variant === 'category' ? 'grid--categories' : 'grid--recipes'
 *                               ^^^^^^^^^^ a value, not a class
 */
function dropComparisonOperands(expression) {
  return expression.replace(/[=!]==?\s*(['"`])(?:(?!\1).)*\1/g, ' ');
}

/** Finds the index of the `}` matching the `{` at `openIndex`. */
function findMatchingBrace(value, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"' || char === "'" || char === '`') {
      const end = value.indexOf(char, index + 1);
      if (end === -1) return -1;
      index = end;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Finds the closing backtick of a template literal, skipping interpolations. */
function findClosingBacktick(value, fromIndex) {
  for (let index = fromIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === '$' && value[index + 1] === '{') {
      const end = findMatchingBrace(value, index + 1);
      if (end === -1) return -1;
      index = end;
      continue;
    }
    if (char === '`') return index;
  }
  return -1;
}

/**
 * Yields the static text of a template literal. Unlike a bare expression, the
 * text between quotes and `${...}` is itself part of the class list.
 */
function* templateSegments(content) {
  let buffer = '';
  let index = 0;

  while (index < content.length) {
    if (content[index] === '$' && content[index + 1] === '{') {
      const end = findMatchingBrace(content, index + 1);
      if (end === -1) break;
      if (buffer) {
        yield buffer;
        buffer = '';
      }
      // A ternary inside the interpolation can still hold static strings.
      yield* staticSegments(content.slice(index + 2, end));
      index = end + 1;
      continue;
    }
    buffer += content[index];
    index += 1;
  }

  if (buffer) yield buffer;
}

/** Splits a JSX attribute expression into its static string segments. */
function* staticSegments(value) {
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (char === '$' && value[index + 1] === '{') {
      const end = findMatchingBrace(value, index + 1);
      if (end === -1) return;
      yield* staticSegments(value.slice(index + 2, end));
      index = end + 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = value.indexOf(char, index + 1);
      if (end === -1) return;
      yield value.slice(index + 1, end);
      index = end + 1;
      continue;
    }

    if (char === '`') {
      const end = findClosingBacktick(value, index + 1);
      if (end === -1) return;
      yield* templateSegments(value.slice(index + 1, end));
      index = end + 1;
      continue;
    }

    index += 1;
  }
}

/** Class selectors defined in CSS. */
function extractCssClasses(source) {
  const names = new Set();
  // `.className` in a selector position. Requires a preceding start-of-line,
  // whitespace, combinator, comma, or `:` so file names like `index.css` and
  // decimal fractions are not mistaken for selectors.
  for (const match of source.matchAll(/(?:^|[\s,>+~(])(?:\.[\w-]*)*\.(-?[_a-zA-Z][\w-]*)/gm)) {
    names.add(match[1]);
  }
  return names;
}

// `.js` is included because hooks toggle classes imperatively via classList.
const jsxFiles = await collect(SRC, ['.jsx', '.js']);
const cssFiles = await collect(SRC, ['.css']);

const jsxClasses = new Set();
for (const file of jsxFiles) {
  for (const name of extractJsxClasses(await readFile(file, 'utf8'))) jsxClasses.add(name);
}

const cssClasses = new Set();
for (const file of cssFiles) {
  for (const name of extractCssClasses(await readFile(file, 'utf8'))) cssClasses.add(name);
}

const missing = [...jsxClasses].filter((name) => !cssClasses.has(name)).sort();

console.log(`\n${jsxFiles.length} JSX/JS files, ${cssFiles.length} CSS files`);
console.log(`${jsxClasses.size} class names used in JSX, ${cssClasses.size} defined in CSS\n`);

if (missing.length === 0) {
  console.log('  PASS  every className used in JSX has a matching CSS rule\n');
} else {
  console.log(`  FAIL  ${missing.length} className(s) used in JSX have no CSS rule:`);
  for (const name of missing) console.log(`        .${name}`);
  console.log('');
  process.exitCode = 1;
}

const orphans = [...cssClasses].filter((name) => !jsxClasses.has(name)).sort();
if (orphans.length) {
  console.log(`  Note  ${orphans.length} CSS class(es) never used in JSX:`);
  console.log(`        ${orphans.join(', ')}\n`);
}
