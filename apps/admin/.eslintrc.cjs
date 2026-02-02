module.exports = {
    extends: ['../../../.eslintrc.cjs'],
    ignorePatterns: ['dist', 'src/api/generated/**/*', 'src/generated/**/*'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'error',
    }
}
