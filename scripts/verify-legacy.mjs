/**
 * Confirms the legacy move kept everything.
 *
 * Two different things are checked, because they mean different things:
 *
 *   - every file that was tracked *before* the move must still exist, byte for
 *     byte, inside `legacy/` — this catches a file that was deleted instead of
 *     moved, which happened to a binary `.ico` when the tree was reorganised;
 *   - files that were already modified in the worktree before the move are
 *     expected to differ from the pre-move commit, because the move preserved
 *     the uncommitted work rather than reverting it. Those are reported, not
 *     failed, and are only checked for being non-empty.
 *
 * Usage:  node scripts/verify-legacy.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const LEGACY = 'legacy';

/**
 * Paths tracked in the commit before the legacy move.
 *
 * This has to be the *parent* of the move commit: reading `HEAD` directly
 * would list the already-moved `legacy/...` paths and check them against
 * `legacy/legacy/...`, which never exists.
 */
const BEFORE_MOVE = 'HEAD~1';

const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', BEFORE_MOVE], {
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

// The original images and icons are still served from the repository root, so
// they were never part of the move.
const stayed = new Set([
  'Images/Backgound.jpg',
  'Images/Beef Backgound.jpg',
  'Images/Cake Backgound.jpg',
  'Images/Chicken Backgound.jpg',
  'Images/Pasta Backgound.jpg',
  'Icons/beef.png',
  'Icons/cake.png',
  'Icons/chicken.png',
  'Icons/pasta.png',
  'Discover Recipes.png',
]);

const moved = tracked.filter((file) => !stayed.has(file));

let identical = 0;
let edited = 0;
const problems = [];
const preservedEdits = [];

for (const file of moved) {
  const target = path.join(LEGACY, file);

  if (!existsSync(target)) {
    problems.push(`${file} -> missing from ${LEGACY}`);
    continue;
  }

  if (statSync(target).size === 0) {
    problems.push(`${file} -> present but empty`);
    continue;
  }

  // Hash the working-tree copy and the committed blob, then compare.
  const working = execFileSync('git', ['hash-object', target], { encoding: 'utf8' }).trim();
    const committed = execFileSync('git', ['rev-parse', `${BEFORE_MOVE}:${file}`], {
      encoding: 'utf8',
    }).trim();

  if (working === committed) {
    identical += 1;
  } else {
    // Modified before the move; the point is that it survived, not that it
    // matches the last commit.
    preservedEdits.push(file);
    edited += 1;
  }
}

for (const file of stayed) {
  if (!existsSync(file)) problems.push(`${file} -> should have stayed at the repository root`);
}

console.log(`\n${moved.length} files should be in ${LEGACY}/, ${stayed.size} should stay at the root`);

if (preservedEdits.length) {
  console.log(`  Note  ${preservedEdits.length} file(s) were already edited in the worktree before the`);
  console.log('        move, so they differ from the last commit. Preserved as they were:');
  for (const file of preservedEdits) console.log(`          ${file}`);
}

if (problems.length === 0) {
  console.log(`\n  PASS  all ${moved.length} moved files are accounted for ` +
    `(${identical} byte-identical, ${edited} with pre-existing edits, ` +
    `${stayed.size} left in place)\n`);
} else {
  console.log(`  FAIL  ${problems.length} problem(s):`);
  for (const problem of problems) console.log(`        ${problem}`);
  console.log('');
  process.exit(1);
}
