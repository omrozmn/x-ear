#!/usr/bin/env node

/**
 * Storage Keys Generator from OpenAPI Specification
 * 
 * This script extracts x-storage-keys extensions from OpenAPI spec
 * and generates TypeScript constants for storage keys.
 * 
 * Usage: node scripts/generate-storage-keys.js
 */

const fs = require('fs');
const path = require('path');

// Simple YAML parser for our specific use case
function parseYaml(content) {
  const lines = content.split('\n');
  const result = { paths: {} };
  let currentPath = null;
  let currentMethod = null;
  let currentOperation = null;
  let inStorageKeys = false;
  let storageKeysIndent = 0;
  let currentKey = null;
  let keyIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    
    // Parse paths
    if (trimmed.startsWith('/api/')) {
      const pathMatch = trimmed.match(/^(\/api\/[^:]+):/);
      if (pathMatch) {
        currentPath = pathMatch[1];
        result.paths[currentPath] = {};
        currentMethod = null;
        currentOperation = null;
        inStorageKeys = false;
      }
    }
    
    // Parse HTTP methods
    if (currentPath && ['get:', 'post:', 'put:', 'patch:', 'delete:'].some(method => trimmed === method)) {
      currentMethod = trimmed.replace(':', '');
      currentOperation = {};
      result.paths[currentPath][currentMethod] = currentOperation;
      inStorageKeys = false;
    }
    
    // Parse operationId
    if (currentOperation && trimmed.startsWith('operationId:')) {
      currentOperation.operationId = trimmed.split('operationId:')[1].trim();
    }
    
    // Parse x-storage-keys
    if (currentOperation && trimmed === 'x-storage-keys:') {
      inStorageKeys = true;
      storageKeysIndent = indent;
      currentOperation['x-storage-keys'] = [];
      currentKey = null;
    }
    
    // Parse storage key items
    if (inStorageKeys && indent > storageKeysIndent) {
      if (trimmed.startsWith('- key:')) {
        currentKey = {
          key: trimmed.split('key:')[1].trim(),
          description: '',
          type: 'string'
        };
        keyIndent = indent;
        currentOperation['x-storage-keys'].push(currentKey);
      } else if (currentKey && indent > keyIndent) {
        if (trimmed.startsWith('description:')) {
          currentKey.description = trimmed.split('description:')[1].trim();
        } else if (trimmed.startsWith('type:')) {
          currentKey.type = trimmed.split('type:')[1].trim();
        }
      }
    }
    
    // Exit storage keys section when we encounter a line at the same or lower indent level
    if (inStorageKeys && indent <= storageKeysIndent && trimmed && trimmed !== 'x-storage-keys:') {
      inStorageKeys = false;
      currentKey = null;
    }
  }
  
  return result;
}

// Paths
const OPENAPI_PATH = path.join(__dirname, '../openapi.yaml');
const OUTPUT_PATH = path.join(__dirname, '../apps/web/src/constants/generated-storage-keys.ts');

/**
 * Extract storage keys from OpenAPI specification
 */
function extractStorageKeys() {
  try {
    // Read and parse OpenAPI spec
    const openapiContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const spec = parseYaml(openapiContent);
    
    const storageKeys = new Map();
    
    // Traverse paths to find x-storage-keys extensions
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (operation['x-storage-keys']) {
            operation['x-storage-keys'].forEach(keyDef => {
              if (!storageKeys.has(keyDef.key)) {
                storageKeys.set(keyDef.key, {
                  key: keyDef.key,
                  description: keyDef.description,
                  type: keyDef.type,
                  endpoints: []
                });
              }
              
              storageKeys.get(keyDef.key).endpoints.push({
                path,
                method: method.toUpperCase(),
                operationId: operation.operationId
              });
            });
          }
        });
      });
    }
    
    return Array.from(storageKeys.values());
  } catch (error) {
    console.error('Error extracting storage keys:', error);
    process.exit(1);
  }
}

/**
 * Generate TypeScript constants file
 */
function generateTypeScriptFile(storageKeys) {
  const timestamp = new Date().toISOString();
  
  let content = `/**
 * Generated Storage Keys from OpenAPI Specification
 * 
 * This file is auto-generated from OpenAPI x-storage-keys extensions.
 * DO NOT EDIT MANUALLY - Run 'npm run gen:storage-keys' to regenerate.
 * 
 * Generated at: ${timestamp}
 */

// Storage Key Constants
`;

  // Generate individual constants
  storageKeys.forEach(keyDef => {
    content += `
/**
 * ${keyDef.description}
 * Type: ${keyDef.type}
 * Used by: ${keyDef.endpoints.map(e => `${e.method} ${e.path}`).join(', ')}
 */
export const ${keyDef.key} = '${keyDef.key.toLowerCase().replace(/_/g, '-')}' as const;
`;
  });

  // Generate types
  content += `
// Storage Key Types
export type StorageKeyType = ${storageKeys.map(k => `'${k.type}'`).join(' | ')};

export interface StorageKeyDefinition {
  key: string;
  description: string;
  type: StorageKeyType;
  endpoints: Array<{
    path: string;
    method: string;
    operationId: string;
  }>;
}

// All Storage Keys Registry
export const ALL_GENERATED_STORAGE_KEYS = [
${storageKeys.map(k => `  ${k.key}`).join(',\n')}
] as const;

// Storage Keys Metadata
export const STORAGE_KEYS_METADATA: Record<string, StorageKeyDefinition> = {
${storageKeys.map(keyDef => `  ${keyDef.key}: {
    key: ${keyDef.key},
    description: '${keyDef.description}',
    type: '${keyDef.type}',
    endpoints: ${JSON.stringify(keyDef.endpoints, null, 6)}
  }`).join(',\n')}
} as const;

// Type-safe storage key union
export type GeneratedStorageKey = typeof ALL_GENERATED_STORAGE_KEYS[number];
`;

  return content;
}

/**
 * Main execution
 */
function main() {
  console.log('🔑 Generating storage keys from OpenAPI specification...');
  
  // Extract storage keys from OpenAPI
  const storageKeys = extractStorageKeys();
  
  if (storageKeys.length === 0) {
    console.log('⚠️  No storage keys found in OpenAPI specification');
    return;
  }
  
  console.log(`📋 Found ${storageKeys.length} storage keys:`);
  storageKeys.forEach(key => {
    console.log(`   - ${key.key} (${key.type}): ${key.description}`);
  });
  
  // Generate TypeScript file
  const content = generateTypeScriptFile(storageKeys);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
  
  console.log(`✅ Generated storage keys file: ${OUTPUT_PATH}`);
  console.log('🎯 Next steps:');
  console.log('   1. Import generated keys in your storage-keys.ts');
  console.log('   2. Update orval.config.mjs to run this script');
  console.log('   3. Run npm run gen:api to regenerate API client');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractStorageKeys, generateTypeScriptFile };