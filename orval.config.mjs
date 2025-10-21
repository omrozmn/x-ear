export default {
  'x-ear-api': {
    input: {
      target: './openapi.yaml'
    },
    output: {
      mode: 'split',
      target: './apps/web/src/api/generated',
      client: 'axios',
      prettier: true,
      clean: true,
      mock: false
    }
  }
};