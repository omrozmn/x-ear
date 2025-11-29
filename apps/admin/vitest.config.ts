/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@x-ear/core': path.resolve(__dirname, '../../packages/core/src'),
            '@x-ear/ui-web': path.resolve(__dirname, '../../packages/ui-web/src'),
        },
    },
});
