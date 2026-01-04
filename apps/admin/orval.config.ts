export default {
  'admin-api': {
    input: {
      target: '../../openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api',
      schemas: './src/lib/api/schemas',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: './src/lib/apiMutator.ts',
          name: 'adminApi'
        },
        tsconfig: './tsconfig.json'
      },
    },
  },
};
