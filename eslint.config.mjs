import velis from 'eslint-config-velis';

export default [
  ...velis,
  {
    ignores: ['dist/*', 'coverage/*', 'node_modules/*', 'docs/*', 'vite.config.ts', 'eslint.config.mjs'],
  },
  {
    // velis's own globals list omits these browser APIs, used here for animation timing
    languageOptions: {
      globals: {
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
  },
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      // velis's test globals cover jest; this project runs on vitest, whose `vi` jest replaces
      globals: {
        vi: 'readonly',
      },
    },
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },
];
