export default {
  'x-ear-api': {
    input: {
      target: '../../openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/api.ts',
      schemas: './src/api/generated/model',
      client: 'axios',
      mock: false,
    },
  },
  'x-ear-types': {
    input: {
      target: '../../openapi.yaml',
    },
    output: {
      mode: 'types',
      target: './src/types/generated/api.ts',
      client: false,
    },
  },
};