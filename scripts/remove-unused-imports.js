#!/usr/bin/env node
/**
 * Script to automatically remove unused imports from TypeScript files
 * Uses ESLint to detect and fix unused imports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get all TypeScript files with unused imports
const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8', cwd: path.join(__dirname, '..') });

// Parse lint output to find files with unused imports
const unusedImportPattern = /'([^']+)' is defined but never used.*@typescript-eslint\/no-unused-vars/g;
const filePattern = /^(.+\.tsx?)$/gm;

const files = new Set();
let match;

// Extract file paths
const lines = lintOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  // Check if line contains a file path
  if (line.includes('.tsx') || line.includes('.ts')) {
    const fileMatch = line.match(/\/([^\/]+\.(tsx?))$/);
    if (fileMatch) {
      currentFile = line.trim().replace(/:$/, '');
    }
  }
  
  // Check if line contains unused import error
  if (line.includes('is defined but never used') && line.includes('@typescript-eslint/no-unused-vars')) {
    if (currentFile) {
      files.add(currentFile);
    }
  }
}

console.log(`Found ${files.size} files with unused imports`);

// Try to auto-fix each file
let fixed = 0;
for (const file of files) {
  try {
    execSync(`npx eslint "${file}" --fix`, { 
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    fixed++;
  } catch (error) {
    // ESLint returns non-zero exit code if there are still errors after fix
    // This is expected, so we continue
  }
}

console.log(`Attempted to fix ${fixed} files`);
console.log('Run npm run lint to see remaining issues');
