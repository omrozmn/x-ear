#!/usr/bin/env node

/**
 * Auto-generate exports section for Admin Panel api-client.ts
 * 
 * Admin panel has a different structure:
 * - No 'generated' folder
 * - Modules directly in src/lib/api/
 * - Manual overrides and aliases in api-client.ts
 * 
 * This script only updates the "Export generated hooks" section
 * 
 * Usage: node scripts/generate-admin-api-exports.mjs
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_DIR = join(__dirname, '../src/lib/api');
const API_CLIENT_FILE = join(__dirname, '../src/lib/api-client.ts');

console.log('🔍 Scanning Admin API modules...');

// Get all directories in api folder
const entries = readdirSync(API_DIR);
const apiDirs = entries.filter(entry => {
  const fullPath = join(API_DIR, entry);
  return statSync(fullPath).isDirectory();
}).sort();

console.log(`📁 Found ${apiDirs.length} API modules`);

// Read current api-client.ts
const currentContent = readFileSync(API_CLIENT_FILE, 'utf-8');

// Find the markers
const EXPORT_START = '// Export generated hooks';
const EXPORT_END = '// ============================================================================';

const startIndex = currentContent.indexOf(EXPORT_START);
const endIndex = currentContent.indexOf(EXPORT_END, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('❌ Could not find export markers in api-client.ts');
  console.error('   Looking for: "// Export generated hooks" and "// ============================================================================"');
  process.exit(1);
}

// Generate new exports
const exports = [];
exports.push(EXPORT_START);

apiDirs.forEach(dir => {
  // Convert directory name to proper format
  // e.g., 'add-ons' -> 'add-ons/add-ons'
  exports.push(`export * from './api/${dir}/${dir}';`);
});

// Always export schemas
exports.push(`export * from './api/index.schemas';`);
exports.push('');

const newExportsSection = exports.join('\n');

// Reconstruct file
const beforeExports = currentContent.substring(0, startIndex);
const afterExports = currentContent.substring(endIndex);

const newContent = beforeExports + newExportsSection + afterExports;

// Write back
writeFileSync(API_CLIENT_FILE, newContent, 'utf-8');

console.log('✅ Updated api-client.ts successfully!');
console.log(`📝 Exported ${apiDirs.length} API modules + schemas`);
console.log(`📄 File: ${API_CLIENT_FILE}`);
console.log('');
console.log('⚠️  Note: Manual overrides and aliases section preserved');
