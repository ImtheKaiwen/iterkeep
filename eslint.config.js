import eslint from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '.artifacts/**',
      '**/coverage/**',
      '**/dist/**',
      '**/.vite/**',
      'docs/**',
      'node_modules/**',
      '**/out/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'error',
    },
  },
];
