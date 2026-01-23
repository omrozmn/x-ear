export default {
    landing: {
        input: {
            target: process.env.OPENAPI_SOURCE || '../../openapi.yaml',
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
