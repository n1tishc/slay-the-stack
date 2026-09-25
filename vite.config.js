import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the built game can be hosted from any sub-path.
  base: './',
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    // three.js gets its own chunk: it only changes on upgrades, so it stays cached across deploys.
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three/ }] } },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
