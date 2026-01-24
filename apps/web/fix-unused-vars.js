#!/usr/bin/env node

/**
 * Script to automatically fix unused variable errors
 * Strategy:
 * 1. For unused imports - remove them
 * 2. For unused destructured variables - prefix with _
 * 3. For unused function parameters - prefix with _
 * 4. For unused variables that are assigned - prefix with _
 */

const fs = require('fs');
const path = require('path');

// Files with unused variables and what to fix
const fixes = [
  // DynamicInvoiceForm.tsx - _key already prefixed, just needs to stay
  {
    file: 'src/components/forms/DynamicInvoiceForm.tsx',
    fixes: [
      { type: 'keep', line: 508, variable: '_key' }
    ]
  },
  // PartyNoteForm.tsx - tagInput is assigned but never used
  {
    file: 'src/components/forms/PartyNoteForm.tsx',
    fixes: [
      { type: 'rename', from: 'tagInput', to: '_tagInput', line: 49 }
    ]
  },
  // DeviceAssignmentForm - _errors already prefixed
  {
    file: 'src/components/forms/device-assignment-form/DeviceAssignmentForm.tsx',
    fixes: [
      { type: 'keep', line: 114, variable: '_errors' }
    ]
  },
  // AdvancedFilters - brands unused
  {
    file: 'src/components/inventory/AdvancedFilters.tsx',
    fixes: [
      { type: 'remove-line', line: 79, variable: 'brands' }
    ]
  },
  // InventoryList - _onItemSelect already prefixed
  {
    file: 'src/components/inventory/InventoryList.tsx',
    fixes: [
      { type: 'keep', line: 52, variable: '_onItemSelect' }
    ]
  },
  // CustomerSectionCompact - _customerId already prefixed
  {
    file: 'src/components/invoices/CustomerSectionCompact.tsx',
    fixes: [
      { type: 'keep', line: 32, variable: '_customerId' }
    ]
  },
  // InboxModal - _selectedParty already prefixed
  {
    file: 'src/components/invoices/InboxModal.tsx',
    fixes: [
      { type: 'keep', line: 45, variable: '_selectedParty' }
    ]
  },
  // InvoiceList - _selected, setSelected, _compact already prefixed
  {
    file: 'src/components/invoices/InvoiceList.tsx',
    fixes: [
      { type: 'keep', line: 10, variable: '_selected' },
      { type: 'rename', from: 'setSelected', to: '_setSelected', line: 10 },
      { type: 'keep', line: 24, variable: '_compact' }
    ]
  }
];

console.log('This script is a placeholder. Manual fixes are more reliable for unused variables.');
console.log('Use ESLint auto-fix where possible: npm run lint -- --fix');
console.log('For remaining issues, manually prefix with _ or remove unused code.');
