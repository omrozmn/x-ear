module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tests/tsconfig.json']
  },
  plugins: ['@typescript-eslint', 'playwright'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:playwright/recommended'
  ],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'playwright-report',
    'test-results',
    'tests/e2e/test-results'
  ],
  overrides: [
    {
      files: ['tests/**/*.ts', 'apps/web/e2e/**/*.ts'],
      rules: {
        'playwright/no-networkidle': 'off',
        'playwright/no-conditional-in-test': 'off',
        'playwright/no-conditional-expect': 'off',
        'playwright/no-wait-for-timeout': 'off',
        'playwright/expect-expect': 'off',
        'playwright/no-skipped-test': 'off',
        'playwright/no-wait-for-selector': 'off',
        'playwright/no-force-option': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    }
  ]
};
