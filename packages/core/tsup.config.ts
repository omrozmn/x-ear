import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    entry: './src/index.ts'
  },
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ['react', 'react-dom'],
  tsconfig: './tsconfig.json',
  skipNodeModulesBundle: true
})