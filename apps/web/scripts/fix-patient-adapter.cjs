#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Patient Adapter Type Fix Script');
console.log('===================================\n');

function fixPatientAdapterTypes() {
  const filePath = 'src/utils/patient-adapter.ts';
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  console.log(`🔄 Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix missing properties by making them optional or providing defaults
  const fixes = [
    // Fix addressFull property
    {
      pattern: /addressFull: formData\.addressFull,/g,
      replacement: "addressFull: formData.addressFull || '',",
      description: "Fixed addressFull property"
    },
    // Fix conversionStep property
    {
      pattern: /conversionStep: formData\.conversionStep,/g,
      replacement: "conversionStep: formData.conversionStep || 'initial',",
      description: "Fixed conversionStep property"
    },
    // Fix referredBy property
    {
      pattern: /referredBy: formData\.referredBy,/g,
      replacement: "referredBy: formData.referredBy || null,",
      description: "Fixed referredBy property"
    },
    // Fix customData property
    {
      pattern: /customData: formData\.customData/g,
      replacement: "customData: formData.customData || {}",
      description: "Fixed customData property"
    }
  ];

  let changed = false;
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      console.log(`  ✅ ${fix.description}`);
      changed = true;
    }
  });

  // Add type assertion if needed
  if (content.includes('Partial<Patient>') && !content.includes('as Patient')) {
    // Add proper typing for the adapter function
    const typeAssertion = `
// Type assertion helper for patient adapter
type PatientFormData = Partial<Patient> & {
  addressFull?: string;
  conversionStep?: string;
  referredBy?: string | null;
  customData?: Record<string, any>;
};`;

    // Insert type definition at the top after imports
    const importRegex = /(import.*from.*['"];?\n)/g;
    const matches = content.match(importRegex);
    if (matches) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + typeAssertion + '\n');
      console.log('  ✅ Added PatientFormData type definition');
      changed = true;
    }

    // Update function signature
    content = content.replace(
      /export function.*\(formData: Partial<Patient>\)/g,
      'export function adaptPatientFormData(formData: PatientFormData)'
    );
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully fixed ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed in ${filePath}`);
    return true;
  }
}

function fixPatientTypes() {
  console.log('\n🔄 Checking patient type definitions...');
  
  const typeFiles = [
    'src/types/patient.ts',
    'src/types/patient-base.types.ts'
  ];

  typeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if Patient interface needs additional properties
      if (content.includes('interface Patient') && !content.includes('addressFull?')) {
        console.log(`  📝 Adding missing properties to ${filePath}...`);
        
        // Add missing optional properties to Patient interface
        const additionalProps = `
  // Additional optional properties for form handling
  addressFull?: string;
  conversionStep?: string;
  referredBy?: string | null;
  customData?: Record<string, any>;`;

        // Find the Patient interface and add properties before the closing brace
        content = content.replace(
          /(interface Patient\s*{[^}]*)(})/,
          `$1${additionalProps}\n$2`
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ Updated ${filePath} with missing properties`);
      }
    }
  });
}

// Main execution
function main() {
  try {
    console.log('Starting patient adapter type fixes...\n');
    
    const success1 = fixPatientAdapterTypes();
    fixPatientTypes();
    
    if (success1) {
      console.log('\n🎉 Patient adapter type fixes completed!');
    } else {
      console.log('\n⚠️  Some issues encountered during fixes.');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  fixPatientAdapterTypes,
  fixPatientTypes
};