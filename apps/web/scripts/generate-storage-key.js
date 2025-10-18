#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// CLI arguments
const [,, constName, feature, version = 'v1'] = process.argv;

if (!constName || !feature) {
  console.error('Usage: npm run gen:key CONST_NAME feature [vN]');
  console.error('Example: npm run gen:key USER_PREFERENCES auth v2');
  process.exit(1);
}

const storageKeysPath = path.join(__dirname, '../src/constants/storage-keys.ts');

// Read current storage keys file
let content = fs.readFileSync(storageKeysPath, 'utf8');

// Generate new key
const keyName = `${constName.toUpperCase()}_${version.toUpperCase()}`;
const keyValue = `x-ear.${feature}.${constName.toLowerCase()}.${version}`;

// Check if key already exists
if (content.includes(keyName)) {
  console.error(`Key ${keyName} already exists!`);
  process.exit(1);
}

// Find the insertion point (before the export statement)
const exportIndex = content.lastIndexOf('export const STORAGE_KEYS');
if (exportIndex === -1) {
  console.error('Could not find STORAGE_KEYS export in file');
  process.exit(1);
}

// Insert new key before export
const beforeExport = content.substring(0, exportIndex);
const afterExport = content.substring(exportIndex);

const newKeyLine = `const ${keyName} = '${keyValue}' as const;\n\n`;
const updatedContent = beforeExport + newKeyLine + afterExport;

// Update the STORAGE_KEYS object
const updatedWithKey = updatedContent.replace(
  /export const STORAGE_KEYS = {([^}]+)}/,
  (match, keys) => {
    const trimmedKeys = keys.trim();
    const newKey = `  ${keyName},`;
    return `export const STORAGE_KEYS = {\n${trimmedKeys}\n${newKey}\n}`;
  }
);

// Write updated content
fs.writeFileSync(storageKeysPath, updatedWithKey);

console.log(`✅ Added storage key: ${keyName} = '${keyValue}'`);
console.log(`📝 Updated ${storageKeysPath}`);