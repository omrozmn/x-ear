#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Backup function
function createBackup(filePath) {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

// Read file safely
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`❌ Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

// Write file safely
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.log(`❌ Could not write ${filePath}: ${error.message}`);
    return false;
  }
}

// Fix InvoicesPage.tsx issues
function fixInvoicesPage() {
  console.log('\n🔧 Fixing InvoicesPage.tsx...');
  
  const filePath = 'src/pages/InvoicesPage.tsx';
  let content = readFile(filePath);
  if (!content) return;
  
  createBackup(filePath);
  
  // Add comprehensive imports at the top
  const imports = `import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, InvoiceStatus, InvoiceFilters } from '../types/invoice';
import type { Patient } from '../types/patient';
import type { AxiosResponse } from 'axios';
`;
  
  // Replace existing imports with comprehensive ones
  content = content.replace(
    /^import.*?from.*?;$/gm,
    ''
  ).trim();
  
  content = imports + '\n' + content;
  
  // Fix common type issues
  content = content.replace(
    /:\s*any\[\]/g,
    ': Invoice[]'
  );
  
  content = content.replace(
    /useState<any>/g,
    'useState<Invoice[]>'
  );
  
  // Fix filter types
  content = content.replace(
    /filters:\s*any/g,
    'filters: InvoiceFilters'
  );
  
  // Fix status type
  content = content.replace(
    /status:\s*string/g,
    'status: InvoiceStatus'
  );
  
  // Add type assertions where needed
  content = content.replace(
    /\.map\(([^)]+)\)/g,
    '.map(($1) as Invoice)'
  );
  
  // Fix event handlers
  content = content.replace(
    /onChange=\{([^}]+)\}/g,
    'onChange={($1) as React.ChangeEventHandler}'
  );
  
  // Add default values for undefined checks
  content = content.replace(
    /(\w+)\.(\w+)\s*\?\s*(\w+)/g,
    '($1?.$2 ?? $3)'
  );
  
  writeFile(filePath, content);
}

// Add missing type definitions
function addInvoiceTypes() {
  console.log('\n🔧 Adding missing invoice types...');
  
  const typesDir = 'src/types';
  const invoiceTypesPath = path.join(typesDir, 'invoice.ts');
  
  // Create types directory if it doesn't exist
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  const invoiceTypes = `export interface Invoice {
  id: string;
  patientId: string;
  patient?: Patient;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceFilters {
  status?: InvoiceStatus;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InvoiceFormData {
  patientId: string;
  date: string;
  dueDate: string;
  items: Omit<InvoiceItem, 'id'>[];
  notes?: string;
}
`;
  
  if (!fs.existsSync(invoiceTypesPath)) {
    writeFile(invoiceTypesPath, invoiceTypes);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting InvoicesPage fixes...\n');
  
  try {
    addInvoiceTypes();
    fixInvoicesPage();
    
    console.log('\n✅ InvoicesPage fixes completed!');
    console.log('🔍 Run "npx tsc --noEmit" to check remaining errors');
    
  } catch (error) {
    console.error('❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();