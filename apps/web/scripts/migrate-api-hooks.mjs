#!/usr/bin/env node
/**
 * Automatic API Hook Migration Script
 * Migrates old hook names to new auto-generated names
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const MIGRATIONS = {
  // Hook names - old → new
  'useAdminTenantsListTenants': 'useAdminTenantsGetTenants',
  'appointmentsListAppointments': 'appointmentsGetAppointments',
  'salesGetPatientSales': 'patientsGetPatientSales',
  'useSalesGetPatientSales': 'usePatientsGetPatientSales',
  'communicationsListTemplates': 'communicationsGetTemplates',
  'invoicesDeleteInvoice': 'invoicesGetInvoice', // Check if DELETE exists
  'usersGetCurrentUser': 'usersGetMe',
  'sgkProcessOcr': 'ocrProcessDocument',
  
  // Schema names - old → new
  'SalesUpdateSaleBody': 'SalesUpdateSale1Body',
  'AppointmentsGetAppointments200': 'AppointmentsGetAppointments1200',
};

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('generated')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function migrateFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let changed = false;
  
  for (const [oldName, newName] of Object.entries(MIGRATIONS)) {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newName);
      changed = true;
      console.log(`  ✓ ${filePath.replace(process.cwd() + '/', '')}: ${oldName} → ${newName}`);
    }
  }
  
  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
  }
  
  return changed;
}

console.log('🔄 Migrating API hooks...\n');

const files = getAllFiles('src');
let totalChanged = 0;

for (const file of files) {
  const changed = migrateFile(file);
  if (changed) totalChanged++;
}

console.log(`\n✅ Migration complete!`);
console.log(`   ${totalChanged} files updated`);

