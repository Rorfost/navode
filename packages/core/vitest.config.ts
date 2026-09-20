import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@navode/integrations': fileURLToPath(
        new URL('../integrations/src/index.ts', import.meta.url),
      ),
    },
  },
});
