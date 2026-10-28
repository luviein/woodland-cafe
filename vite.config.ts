import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the built game also works when loaded from disk
  // (needed later for the Tauri/Electron desktop build).
  base: './',
  build: {
    // Phaser alone is ~1.2 MB minified, so the default 500 kB warning always
    // fires. That's normal for a game loaded once, so raise the limit.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    // Game logic tests are plain TypeScript; no browser/DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
