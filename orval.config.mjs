export default {
  'x-ear-api': {
    input: './openapi.yaml',
    output: {
      mode: 'single',
      target: './apps/web/src/generated/orval-api.ts',
      client: 'axios',
      prettier: false,
      clean: false,
      override: {
        mutator: {
          path: './apps/web/src/api/orval-mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
  'x-ear-types': {
    input: './openapi.yaml',
    output: {
      mode: 'single',
      target: './apps/web/src/generated/orval-types.ts',
      client: 'axios',
      prettier: false,
      clean: false,
      mock: false,
    },
  },
};