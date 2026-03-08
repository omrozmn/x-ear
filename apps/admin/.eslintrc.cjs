module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended'
    ],
    ignorePatterns: ['dist', 'src/api/generated/**/*', 'src/generated/**/*', 'node_modules'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
}
