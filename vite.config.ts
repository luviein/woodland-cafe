import { defineConfig } from 'vitest/config';
import { textEditorApi } from './tools/textEditorApi.mjs';
import { layoutApi } from './tools/layoutApi.mjs';

export default defineConfig({
  // Relative asset paths so the built game also works when loaded from disk
  // (needed later for the Tauri/Electron desktop build).
  base: './',
  // Save routes for the text editor (GAME_DESIGN.md §9.1) and Arrange mode
  // (§9.3), under `npm run dev` only.
  plugins: [textEditorApi(), layoutApi()],
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
