import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    // Card/enemy hooks share one signature (c, v, t) / (c, e); not every hook uses every argument.
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.browser },
  },
  {
    // Game logic must stay DOM-free so it runs in Node (tests, balance sim).
    files: ['src/game/**/*.js'],
    languageOptions: { globals: {} },
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
  {
    files: ['tests/e2e/**/*.js'],
    // Code inside page.evaluate() runs in the browser, where the game exposes a debug handle `SS`.
    languageOptions: { globals: { ...globals.node, ...globals.browser, SS: 'readonly' } },
  },
];
