import { defineConfig } from 'orval';

export default defineConfig({
    admin: {
        input: './openapi.yaml',
        output: {
            mode: 'tags-split',
            target: './src/lib/api/index.ts',
            client: 'react-query',
            override: {
                mutator: {
                    path: './src/lib/apiMutator.ts',
                    name: 'adminApi',
                },
            },
        },
    },
});
