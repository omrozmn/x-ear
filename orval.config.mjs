import { defineConfig } from 'orval';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  'x-ear-api': {
    input: './openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './apps/web/src/api/generated',
      schemas: './apps/web/src/api/generated/schemas',
      client: 'react-query',
      httpClient: 'axios',
      prettier: true,
      clean: true,
      mock: false,
      override: {
        mutator: {
          path: './apps/web/src/api/orval-mutator.ts',
          name: 'customInstance'
        }
      }
    },
    hooks: {
      afterAllFilesWrite: (outputPath) => {
        const generatedDir = path.join(process.cwd(), './apps/web/src/api/generated');
        const dirs = fs.readdirSync(generatedDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
          .filter(name => name !== 'schemas');

        const exports = dirs.map(dir => `export * from './${dir}/${dir}';`).join('\n');
        const indexContent = `// Auto-generated barrel export file
// Export all from tag-based modules

${exports}
`;

        fs.writeFileSync(path.join(generatedDir, 'index.ts'), indexContent);
      }
    }
  },
  'x-ear-admin': {
    input: './openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './apps/admin/src/api/generated',
      schemas: './apps/admin/src/api/generated/schemas',
      client: 'react-query',
      httpClient: 'axios',
      prettier: true,
      clean: true,
      mock: false,
      override: {
        mutator: {
          path: './apps/admin/src/api/orval-mutator.ts',
          name: 'adminApi'
        }
      }
    },
    hooks: {
      afterAllFilesWrite: (outputPath) => {
        const generatedDir = path.join(process.cwd(), './apps/admin/src/api/generated');
        const dirs = fs.readdirSync(generatedDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
          .filter(name => name !== 'schemas');

        const exports = dirs.map(dir => `export * from './${dir}/${dir}';`).join('\n');
        const indexContent = `// Auto-generated barrel export file
// Export all from tag-based modules

${exports}
`;

        fs.writeFileSync(path.join(generatedDir, 'index.ts'), indexContent);
      }
    }
  }
});