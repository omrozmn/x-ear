import { defineConfig } from 'orval';

export default defineConfig({
    admin: {
        input: './openapi.yaml',
        output: {
            target: './src/lib/api-client.ts',
            client: 'react-query',
            baseUrl: '/api',
            override: {
                mutator: {
                    path: './src/lib/apiMutator.ts',
                    name: 'adminApi',
                },
            },
        },
    },
});
