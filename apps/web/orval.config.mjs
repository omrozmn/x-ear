export default {
  'x-ear-api': {
    input: {
      // CI'da statik dosya, development'ta runtime kullan
      // CI: OPENAPI_SOURCE=./openapi.json npx orval
      // Dev: Backend çalışırken npx orval
      target: process.env.OPENAPI_SOURCE || 'http://localhost:5003/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      httpClient: 'axios',
      mock: false,
      clean: true,
      indexFiles: true,
      override: {
        mutator: {
          path: './src/api/orval-mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
};
