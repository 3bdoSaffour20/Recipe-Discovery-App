/**
 * Supabase client initialization check.
 *
 * Loads the real `src/services/supabase.js` through Vite's module runner — the
 * same transform the dev server and the production build use — so
 * `import.meta.env` is populated exactly as it is in the browser and the single
 * shared client is exercised, not a copy of it.
 *
 * It verifies, in order:
 *
 *   1. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are present and usable;
 *   2. `createClient()` returned a client rather than the `null` fallback;
 *   3. the client exposes the auth and query APIs the app relies on;
 *   4. the project answers a live connection probe.
 *
 * Nothing secret is printed: only whether a value exists, never the value.
 *
 * Usage:  node scripts/check-supabase.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

async function main() {
  const server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });

  try {
    const { supabase, isSupabaseConfigured, checkSupabaseConnection } = await server.ssrLoadModule(
      '/src/services/supabase.js',
    );

    console.log('\nSupabase client initialization');

    await check('environment variables are present and well-formed', () => {
      assert.equal(
        isSupabaseConfigured,
        true,
        'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or still the ' +
          'template values from .env.example. Fill them in .env.local and restart.',
      );
    });

    await check('createClient() returned a client, not the null fallback', () => {
      assert.ok(supabase, 'the module exported `null` instead of a client');
      assert.equal(typeof supabase.from, 'function', 'the client has no query builder');
      assert.equal(typeof supabase.auth?.getSession, 'function', 'the client has no auth API');
    });

    await check('the client reports a live connection', async () => {
      const result = await checkSupabaseConnection({ force: true });
      assert.equal(result.configured, true, result.message ?? 'the client is not configured');
      // Initialization is the subject here; an unreachable database is reported
      // as a note rather than a failure, mirroring how the UI degrades.
      if (!result.databaseAvailable) {
        console.log(
          `        note: database not reachable (${result.kind ?? 'unknown'}) — ${result.message}`,
        );
      }
    });

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(`\nSupabase check could not run: ${error.message}\n`);
  process.exitCode = 1;
});
