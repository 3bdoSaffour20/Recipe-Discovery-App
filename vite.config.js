import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `base` supports hosting the app in a subdirectory (GitHub Pages project
 * sites). The production build keeps `/Recipe-Discovery-App/`, but the dev
 * server serves from the root so `npm run dev` opens the plain
 * `http://localhost:5173/` — no sub-path to remember, and the Supabase OAuth
 * callback is the short `http://localhost:5173/auth/callback`.
 *
 * `server.open` makes Vite launch the default browser once, when the dev
 * server starts. It never re-opens on a hot reload, and nothing in the React
 * code opens a window.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/Recipe-Discovery-App/' : '/',
  server: {
    open: true,
  },
}));
