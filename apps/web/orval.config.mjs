export default {
  'x-ear-api': {
    input: {
      target: '../../openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      mock: false,
    },
  },
};
