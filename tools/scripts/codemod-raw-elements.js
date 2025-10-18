#!/usr/bin/env node

/**
 * JSCodeshift codemod to convert raw HTML elements to shared UI components
 * Usage: npx jscodeshift -t tools/scripts/codemod-raw-elements.js apps/web/src --parser=tsx
 */

const { execSync } = require('child_process');

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  let hasChanges = false;
  let needsButtonImport = false;
  let needsInputImport = false;
  let needsSelectImport = false;
  let needsTextareaImport = false;

  // Helper function to check if element has data-allow-raw attribute
  function hasAllowRawAttribute(element) {
    return element.openingElement.attributes.some(attr => 
      attr.type === 'JSXAttribute' && 
      attr.name && 
      attr.name.name === 'data-allow-raw'
    );
  }

  // Helper function to get existing imports from @x-ear/ui-web
  function getExistingUIImports() {
    const imports = new Set();
    root.find(j.ImportDeclaration, {
      source: { value: '@x-ear/ui-web' }
    }).forEach(path => {
      if (path.value.specifiers) {
        path.value.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier') {
            imports.add(spec.imported.name);
          }
        });
      }
    });
    return imports;
  }

  // Transform button elements
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'button' } }
  }).forEach(path => {
    if (!hasAllowRawAttribute(path.value)) {
      // Convert to Button component
      path.value.openingElement.name.name = 'Button';
      if (path.value.closingElement) {
        path.value.closingElement.name.name = 'Button';
      }
      
      // Add default variant if not present
      const hasVariant = path.value.openingElement.attributes.some(attr => 
        attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'variant'
      );
      
      if (!hasVariant) {
        path.value.openingElement.attributes.push(
          j.jsxAttribute(j.jsxIdentifier('variant'), j.literal('default'))
        );
      }
      
      needsButtonImport = true;
      hasChanges = true;
    }
  });

  // Transform input elements
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'input' } }
  }).forEach(path => {
    if (!hasAllowRawAttribute(path.value)) {
      path.value.openingElement.name.name = 'Input';
      if (path.value.closingElement) {
        path.value.closingElement.name.name = 'Input';
      }
      needsInputImport = true;
      hasChanges = true;
    }
  });

  // Transform select elements
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'select' } }
  }).forEach(path => {
    if (!hasAllowRawAttribute(path.value)) {
      path.value.openingElement.name.name = 'Select';
      if (path.value.closingElement) {
        path.value.closingElement.name.name = 'Select';
      }
      needsSelectImport = true;
      hasChanges = true;
    }
  });

  // Transform textarea elements
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'textarea' } }
  }).forEach(path => {
    if (!hasAllowRawAttribute(path.value)) {
      path.value.openingElement.name.name = 'Textarea';
      if (path.value.closingElement) {
        path.value.closingElement.name.name = 'Textarea';
      }
      needsTextareaImport = true;
      hasChanges = true;
    }
  });

  // Add imports if needed
  if (hasChanges) {
    const existingImports = getExistingUIImports();
    const newImports = [];
    
    if (needsButtonImport && !existingImports.has('Button')) {
      newImports.push('Button');
    }
    if (needsInputImport && !existingImports.has('Input')) {
      newImports.push('Input');
    }
    if (needsSelectImport && !existingImports.has('Select')) {
      newImports.push('Select');
    }
    if (needsTextareaImport && !existingImports.has('Textarea')) {
      newImports.push('Textarea');
    }

    if (newImports.length > 0) {
      // Check if @x-ear/ui-web import already exists
      const existingImport = root.find(j.ImportDeclaration, {
        source: { value: '@x-ear/ui-web' }
      });

      if (existingImport.length > 0) {
        // Add to existing import
        existingImport.forEach(path => {
          if (path.value.specifiers) {
            newImports.forEach(importName => {
              path.value.specifiers.push(
                j.importSpecifier(j.identifier(importName))
              );
            });
          }
        });
      } else {
        // Create new import
        const importDeclaration = j.importDeclaration(
          newImports.map(name => j.importSpecifier(j.identifier(name))),
          j.literal('@x-ear/ui-web')
        );

        // Add import at the top
        const body = root.get().node.program.body;
        body.unshift(importDeclaration);
      }
    }
  }

  return hasChanges ? root.toSource({ quote: 'single' }) : null;
};

// CLI runner
if (require.main === module) {
  const path = require('path');
  const fs = require('fs');
  
  const targetDir = process.argv[2] || 'apps/web/src';
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory ${targetDir} does not exist`);
    process.exit(1);
  }

  console.log(`Running codemod on ${targetDir}...`);
  
  try {
    execSync(`npx jscodeshift -t ${__filename} ${targetDir} --parser=tsx --extensions=tsx,ts`, {
      stdio: 'inherit'
    });
    console.log('Codemod completed successfully!');
  } catch (error) {
    console.error('Codemod failed:', error.message);
    process.exit(1);
  }
}