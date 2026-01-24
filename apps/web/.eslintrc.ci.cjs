// CI-specific ESLint config - only critical errors
// Used in CI pipeline to block truly breaking issues

module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true,
    node: true,  // for vite.config, vitest.config
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist', 
    '.eslintrc.cjs', 
    '.eslintrc.ci.cjs', 
    'src/api/generated/**/*', 
    'src/generated/**/*', 
    'src/api/orval-mutator.ts',
    'vite.config.ts',
    'vitest.config.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.stories.ts',
    '**/*.stories.tsx',
    '**/*.d.ts',
    'src/types/**/*',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  globals: {
    process: 'readonly',
    __dirname: 'readonly',
    global: 'readonly',
    React: 'readonly',
    JSX: 'readonly',
    NodeJS: 'readonly',
    RequestInit: 'readonly',
    EventListener: 'readonly',
    NotificationPermission: 'readonly',
    NotificationOptions: 'readonly',
    MediaTrackCapabilities: 'readonly',
    MediaTrackConstraintSet: 'readonly',
    // Test globals
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    vi: 'readonly',
    jest: 'readonly',
  },
  rules: {
    // ============================================
    // CRITICAL - Will break at runtime
    // ============================================
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty-pattern': 'error',
    'no-func-assign': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-obj-calls': 'error',
    'no-self-assign': 'error',
    'no-setter-return': 'error',
    'no-sparse-arrays': 'error',
    'no-this-before-super': 'error',
    'no-unexpected-multiline': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    
    // React hooks - can cause bugs
    'react-hooks/rules-of-hooks': 'error',  // Critical: hooks must follow rules
    'react-hooks/exhaustive-deps': 'warn',
    
    // ============================================
    // DOWNGRADED - Code quality, not runtime
    // ============================================
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'off',
    'no-empty': 'warn',
    'no-constant-condition': 'warn',
    'no-debugger': 'warn',
    'no-case-declarations': 'off',  // Style preference, not a bug
    'no-useless-catch': 'warn',
    'no-var': 'warn',
    'prefer-const': 'warn',
    'no-dupe-else-if': 'warn',
    'no-useless-escape': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
    
    // ============================================
    // DISABLED for CI - Style/preference
    // ============================================
    'react-refresh/only-export-components': 'off',
    'no-restricted-syntax': 'off',
    'no-restricted-imports': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  }
}
