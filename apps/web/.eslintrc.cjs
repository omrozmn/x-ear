module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:boundaries/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'boundaries'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Enforce shared UI components usage
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXElement[openingElement.name.name="button"]:not([openingElement.attributes.0.name.name="data-allow-raw"])',
        message: 'Use Button component from @x-ear/ui-web instead of raw <button> elements. Add data-allow-raw="true" if raw button is intentional.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="input"]:not([openingElement.attributes.0.name.name="data-allow-raw"])',
        message: 'Use Input component from @x-ear/ui-web instead of raw <input> elements. Add data-allow-raw="true" if raw input is intentional.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="select"]:not([openingElement.attributes.0.name.name="data-allow-raw"])',
        message: 'Use Select component from @x-ear/ui-web instead of raw <select> elements. Add data-allow-raw="true" if raw select is intentional.',
      },
      {
        selector: 'JSXElement[openingElement.name.name="textarea"]:not([openingElement.attributes.0.name.name="data-allow-raw"])',
        message: 'Use Textarea component from @x-ear/ui-web instead of raw <textarea> elements. Add data-allow-raw="true" if raw textarea is intentional.',
      }
    ],
    // Prevent direct API calls and external UI libraries
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/fetch', 'node-fetch'],
            message: 'Use generated API client from @x-ear/core instead of direct fetch calls.',
          },
          {
            group: ['@mui/*', 'material-ui/*', 'antd', 'react-bootstrap', 'semantic-ui-react', 'chakra-ui/*'],
            message: 'External UI libraries are not allowed. Use components from @x-ear/ui-web instead.',
          }
        ],
        paths: [
          {
            name: 'axios',
            message: 'Use generated API client from @x-ear/core instead of direct axios calls.',
          },
          {
            name: 'react-router-dom',
            importNames: ['Link'],
            message: 'Use Link component from @x-ear/ui-web instead of react-router-dom Link.',
          }
        ]
      }
    ]
  },
  settings: {
    'boundaries/elements': [
      {
        type: 'shared',
        pattern: 'src/components/shared/**/*',
        mode: 'folder'
      },
      {
        type: 'feature',
        pattern: 'src/components/features/**/*',
        mode: 'folder'
      },
      {
        type: 'page',
        pattern: 'src/pages/**/*',
        mode: 'folder'
      },
      {
        type: 'ui-lib',
        pattern: '@x-ear/ui-web/**/*',
        mode: 'folder'
      }
    ],
    'boundaries/ignore': ['**/*.test.*', '**/*.spec.*', '**/*.stories.*']
  }
}