#!/usr/bin/env node
/**
 * Admin Panel - API Alias Generator Wrapper
 * 
 * Shared script'i çağırır.
 * 
 * Kullanım:
 *   node scripts/generate-api-aliases.mjs          # Generate
 *   node scripts/generate-api-aliases.mjs --check  # CI validation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedScript = path.join(__dirname, '../../../scripts/generate-api-aliases.mjs');
const args = ['--app=admin', ...process.argv.slice(2)];

const child = spawn('node', [sharedScript, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

child.on('close', (code) => {
  process.exit(code);
});
