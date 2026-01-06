import { defineConfig } from 'orval';

export default defineConfig({
  landing: {
    input: {
      // CI'da statik dosya, development'ta runtime kullan
      // CI: OPENAPI_SOURCE=./openapi.json npx orval
      // Dev: Backend çalışırken npx orval
      target: process.env.OPENAPI_SOURCE || 'http://localhost:5003/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api/generated',
      schemas: './src/lib/api/generated/schemas',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: './src/lib/api/api-mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
