import { defineConfig } from 'orval';

export default defineConfig({
  landing: {
    input: {
      target: '../../openapi.yaml',
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
