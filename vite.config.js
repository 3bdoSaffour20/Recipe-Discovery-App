import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `base` supports hosting the app in a subdirectory (GitHub Pages project
 * sites). Set BASE_PATH=/my-repo/ when building for one; the router reads the
 * same value from `import.meta.env.BASE_URL` so links stay correct.
 */
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the framework out of the app bundle so editing app code does
        // not bust the cached vendor chunks. The function form is used because
        // naming modules directly fails for Vite's pre-bundled dependencies.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'router';
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
