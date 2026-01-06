export default {
  'admin-api': {
    input: {
      target: process.env.OPENAPI_SOURCE || 'http://localhost:5003/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api',
      schemas: './src/lib/api/schemas',
      client: 'react-query',
      httpClient: 'axios',
      mock: false,
      clean: true,
      indexFiles: true,
      override: {
        mutator: {
          path: './src/lib/apiMutator.ts',
          name: 'adminApi',
        },
      },
    },
  },
};
