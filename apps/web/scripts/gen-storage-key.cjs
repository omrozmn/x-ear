#!/usr/bin/env node

/**
 * Storage Key Generator CLI
 * 
 * Usage: npm run gen:key CONST_NAME feature [vN]
 * Example: npm run gen:key PATIENT_CACHE patients v2
 * 
 * This script generates new storage keys following the naming convention:
 * x-ear.{feature}.{name}@{version}
 */

const fs = require('fs');
const path = require('path');

function generateStorageKey() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npm run gen:key CONST_NAME feature [vN]');
    console.error('Example: npm run gen:key PATIENT_CACHE patients v2');
    process.exit(1);
  }
  
  const [constName, feature, version = 'v1'] = args;
  
  // Validate inputs
  if (!/^[A-Z][A-Z0-9_]*$/.test(constName)) {
    console.error('Error: CONST_NAME must be uppercase with underscores (e.g., PATIENT_CACHE)');
    process.exit(1);
  }
  
  if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
    console.error('Error: feature must be lowercase with hyphens (e.g., patients, user-preferences)');
    process.exit(1);
  }
  
  if (!/^v\d+$/.test(version)) {
    console.error('Error: version must be in format vN (e.g., v1, v2)');
    process.exit(1);
  }
  
  // Generate the storage key
  const keyName = constName.toLowerCase().replace(/_/g, '-');
  const storageKey = `x-ear.${feature}.${keyName}@${version}`;
  
  // Read the current storage-keys.ts file
  const storageKeysPath = path.join(__dirname, '../src/constants/storage-keys.ts');
  let content = fs.readFileSync(storageKeysPath, 'utf8');
  
  // Check if the constant already exists
  if (content.includes(`export const ${constName} =`)) {
    console.error(`Error: Storage key ${constName} already exists`);
    process.exit(1);
  }
  
  // Find the insertion point (before ALL_STORAGE_KEYS array)
  const insertionPoint = content.indexOf('export const ALL_STORAGE_KEYS = [');
  if (insertionPoint === -1) {
    console.error('Error: Could not find ALL_STORAGE_KEYS array in storage-keys.ts');
    process.exit(1);
  }
  
  // Generate the new constant declaration
  const newConstant = `export const ${constName} = '${storageKey}' // Generated: ${new Date().toISOString()}`;
  
  // Insert the new constant before ALL_STORAGE_KEYS
  const beforeArray = content.substring(0, insertionPoint);
  const afterArray = content.substring(insertionPoint);
  
  // Add the new constant
  const updatedContent = beforeArray + newConstant + '\n\n' + afterArray;
  
  // Also add to the ALL_STORAGE_KEYS array
  const arrayContent = updatedContent.replace(
    'export const ALL_STORAGE_KEYS = [',
    `export const ALL_STORAGE_KEYS = [\n  ${constName},`
  );
  
  // Write the updated file
  fs.writeFileSync(storageKeysPath, arrayContent);
  
  console.log(`✅ Generated storage key: ${constName} = '${storageKey}'`);
  console.log(`📝 Updated ${storageKeysPath}`);
  console.log(`🔧 Remember to run the linter and update any migration scripts if needed`);
}

if (require.main === module) {
  generateStorageKey();
}

module.exports = { generateStorageKey };