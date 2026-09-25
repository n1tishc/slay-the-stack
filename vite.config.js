import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the built game can be hosted from any sub-path.
  base: './',
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
