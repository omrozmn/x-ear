export default {
  'x-ear-api': {
    input: {
      target: '../../openapi.yaml',
    },
    output: {
      mode: 'single',
      target: './src/api/generated/api.ts',
      client: 'axios',
      mock: false,
    },
  },
};