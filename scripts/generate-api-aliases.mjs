#!/usr/bin/env node
/**
 * Shared API Alias Generator - Enterprise Grade (App-Agnostic)
 * 
 * Tüm frontend app'ler için tek kaynak.
 * Script app'i bilmez, sadece path'leri bilir.
 * 
 * Özellikler:
 * - Orval output'unu tarar (tek doğru kaynak)
 * - api-aliases.json'dan manuel override'ları uygular
 * - Kural tabanlı alias üretimi (deterministik)
 * - --check modu (CI validation)
 * - Çakışma tespiti ve fail
 * 
 * Kullanım:
 *   node generate-api-aliases.mjs \
 *     --generated-dir=src/api/generated \
 *     --output=src/api/generated/aliases.ts \
 *     --config=api-aliases.json \
 *     [--check] [--verbose]
 * 
 * Veya preset ile:
 *   node generate-api-aliases.mjs --app=web [--check]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CLI Arguments
// ============================================================================
const args = process.argv.slice(2);
const isCheckMode = args.includes('--check');
const isVerbose = args.includes('--verbose');

// Parse arguments
function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}

// App presets (convenience)
const APP_PRESETS = {
  web: {
    generatedDir: path.join(__dirname, '../apps/web/src/api/generated'),
    aliasesOutput: path.join(__dirname, '../apps/web/src/api/generated/aliases.ts'),
    aliasesConfig: path.join(__dirname, '../apps/web/api-aliases.json'),
    schemasPath: './schemas',
  },
  admin: {
    generatedDir: path.join(__dirname, '../apps/admin/src/api/generated'),
    aliasesOutput: path.join(__dirname, '../apps/admin/src/api/generated/aliases.ts'),
    aliasesConfig: path.join(__dirname, '../apps/admin/api-aliases.json'),
    schemasPath: './schemas',
  },
  landing: {
    generatedDir: path.join(__dirname, '../apps/landing/src/api/generated'),
    aliasesOutput: path.join(__dirname, '../apps/landing/src/api/generated/aliases.ts'),
    aliasesConfig: path.join(__dirname, '../apps/landing/api-aliases.json'),
    schemasPath: './schemas',
  },
};

// Resolve config from args or preset
let config;
const appPreset = getArg('app');
const generatedDirArg = getArg('generated-dir');
const outputArg = getArg('output');
const configArg = getArg('config');

if (appPreset) {
  if (!APP_PRESETS[appPreset]) {
    console.error(`❌ Invalid app preset: ${appPreset}`);
    console.error(`Valid presets: ${Object.keys(APP_PRESETS).join(', ')}`);
    process.exit(1);
  }
  config = APP_PRESETS[appPreset];
} else if (generatedDirArg && outputArg) {
  // Full path mode - resolve from cwd
  const cwd = process.cwd();
  config = {
    generatedDir: path.resolve(cwd, generatedDirArg),
    aliasesOutput: path.resolve(cwd, outputArg),
    aliasesConfig: configArg ? path.resolve(cwd, configArg) : path.resolve(cwd, 'api-aliases.json'),
    schemasPath: './schemas',
  };
} else {
  console.error('❌ Missing arguments');
  console.error('Usage:');
  console.error('  --app=web|admin|landing                    (preset mode)');
  console.error('  --generated-dir=... --output=... [--config=...]  (path mode)');
  process.exit(1);
}

const APP_NAME = appPreset || 'custom';

// ============================================================================
// 1. Orval Output'unu Tara (Tek Kaynak)
// ============================================================================
function collectOrvalExports() {
  const exports = {
    hooks: new Map(),     // name -> { path }
    types: new Map(),     // name -> { path }
    functions: new Map(), // name -> { path }
  };

  if (!fs.existsSync(config.generatedDir)) {
    console.error(`❌ Orval output directory not found: ${config.generatedDir}`);
    console.error('   Run "npx orval" first.');
    process.exit(1);
  }

  const walkDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = './' + path.relative(path.dirname(config.aliasesOutput), fullPath)
          .replace(/\\/g, '/')
          .replace('.ts', '');

        // Hooks (use*) - both const and function exports
        for (const match of content.matchAll(/export (?:const|function) (use\w+)/g)) {
          exports.hooks.set(match[1], { path: relativePath });
        }

        // Types & Interfaces
        for (const match of content.matchAll(/export (?:type|interface) (\w+)/g)) {
          exports.types.set(match[1], { path: relativePath });
        }

        // Regular functions (non-hooks, lowercase start)
        for (const match of content.matchAll(/export (?:const|function) ([a-z]\w+)/g)) {
          if (!match[1].startsWith('use') && !match[1].startsWith('get')) {
            exports.functions.set(match[1], { path: relativePath });
          }
        }
      }
    }
  };

  walkDir(config.generatedDir);
  return exports;
}

// ============================================================================
// 2. Alias Config'i Yükle ve Doğrula
// ============================================================================
function loadAndValidateAliases(orvalExports) {
  let configData = { aliases: {}, typeAliases: {} };
  const errors = [];
  const warnings = [];

  if (fs.existsSync(config.aliasesConfig)) {
    try {
      configData = JSON.parse(fs.readFileSync(config.aliasesConfig, 'utf-8'));
    } catch (e) {
      errors.push(`Invalid JSON in api-aliases.json: ${e.message}`);
    }
  }

  const aliases = configData.aliases || {};
  const typeAliases = configData.typeAliases || {};
  const validAliases = {};
  const validTypeAliases = {};

  // Validate hook aliases
  for (const [orvalName, aliasName] of Object.entries(aliases)) {
    const existsInHooks = orvalExports.hooks.has(orvalName);
    const existsInTypes = orvalExports.types.has(orvalName);
    const existsInFunctions = orvalExports.functions.has(orvalName);

    if (!existsInHooks && !existsInTypes && !existsInFunctions) {
      // Source doesn't exist - skip with warning (Orval may have renamed it)
      warnings.push(`Alias source "${orvalName}" not found in Orval output - skipping`);
      continue;
    }

    // CRITICAL: Check if alias target already exists in Orval output
    // This would cause duplicate identifier error
    const targetExistsInHooks = orvalExports.hooks.has(aliasName);
    const targetExistsInTypes = orvalExports.types.has(aliasName);
    const targetExistsInFunctions = orvalExports.functions.has(aliasName);

    if (targetExistsInHooks || targetExistsInTypes || targetExistsInFunctions) {
      // Alias target already exists - this would cause duplicate!
      warnings.push(`Alias target "${aliasName}" already exists in Orval output - skipping "${orvalName}" -> "${aliasName}"`);
      continue;
    }

    validAliases[orvalName] = aliasName;
  }

  // Validate type aliases
  for (const [orvalType, aliasType] of Object.entries(typeAliases)) {
    if (!orvalExports.types.has(orvalType)) {
      warnings.push(`Type alias source "${orvalType}" not found in Orval output - skipping`);
      continue;
    }

    // Check if alias target already exists
    if (orvalExports.types.has(aliasType)) {
      warnings.push(`Type alias target "${aliasType}" already exists in Orval output - skipping "${orvalType}" -> "${aliasType}"`);
      continue;
    }

    validTypeAliases[orvalType] = aliasType;
  }

  // Check for duplicate alias targets within valid aliases
  const aliasTargets = Object.values(validAliases);
  const duplicates = aliasTargets.filter((v, i) => aliasTargets.indexOf(v) !== i);
  for (const dup of [...new Set(duplicates)]) {
    errors.push(`Duplicate alias target "${dup}" in api-aliases.json`);
  }

  return { aliases: validAliases, typeAliases: validTypeAliases, errors, warnings };
}

// ============================================================================
// 3. Kural Tabanlı Alias Üretimi (Deterministik)
// ============================================================================
function generateShortName(originalName, manualAliases) {
  // Manuel override varsa kullan
  if (manualAliases[originalName]) {
    return manualAliases[originalName];
  }

  // Otomatik dönüşüm kuralları - deterministik
  // NOT: Sadece belirli pattern'leri dönüştür, tahmin yapma
  const patterns = [
    // useXxxApiYyyZzzGet -> useXxxYyyZzzGet (Api kısmını kaldır)
    { regex: /^(use)([A-Z][a-zA-Z]+)(Api)([A-Z][a-zA-Z]+)(Get|Post|Put|Patch|Delete)$/, replace: '$1$2$4$5' },
    // xxxApiYyyZzzGet -> xxxYyyZzzGet
    { regex: /^([a-z][a-zA-Z]+)(Api)([A-Z][a-zA-Z]+)(Get|Post|Put|Patch|Delete)$/, replace: '$1$3$4' },
  ];

  for (const { regex, replace } of patterns) {
    if (regex.test(originalName)) {
      return originalName.replace(regex, replace);
    }
  }

  // Kural eşleşmezse orijinal ismi koru
  return originalName;
}

// ============================================================================
// 4. api-aliases.ts Üret
// ============================================================================
function generateAliasesFile(orvalExports, aliases, typeAliases) {
  const header = `/**
 * API Aliases - Auto-generated by shared script
 * App: ${APP_NAME}
 * 
 * Bu dosya otomatik üretilmiştir - manuel düzenleme yapmayın!
 * Alias eklemek için: api-aliases.json dosyasını düzenleyin
 * Yeniden üretmek için: npm run gen:aliases
 * 
 * Generated: ${new Date().toISOString()}
 */

`;

  // Group exports by file path
  const exportsByPath = new Map();
  const aliasCollisions = new Map(); // alias -> [original names]

  // Process hooks
  for (const [name, info] of orvalExports.hooks) {
    // Skip internal/helper exports
    if (name.includes('QueryKey') || name.includes('QueryOptions') ||
        name.includes('MutationOptions') || name.includes('MutationResult') ||
        name.includes('MutationBody') || name.includes('MutationError') ||
        name.includes('QueryResult') || name.includes('QueryError')) {
      continue;
    }

    if (!exportsByPath.has(info.path)) {
      exportsByPath.set(info.path, []);
    }

    const alias = generateShortName(name, aliases);
    
    // Track collisions
    if (alias !== name) {
      if (!aliasCollisions.has(alias)) {
        aliasCollisions.set(alias, []);
      }
      aliasCollisions.get(alias).push(name);
    }

    exportsByPath.get(info.path).push({
      original: name,
      alias: alias !== name ? alias : null,
    });
  }

  // Check for collisions
  const collisionErrors = [];
  for (const [alias, originals] of aliasCollisions) {
    if (originals.length > 1) {
      collisionErrors.push(`Alias collision: "${alias}" maps to multiple: ${originals.join(', ')}`);
    }
  }

  // Build content
  let content = header;
  let stats = { total: 0, aliased: 0, typeAliases: 0 };

  for (const [filePath, items] of [...exportsByPath.entries()].sort()) {
    if (items.length === 0) continue;

    const pathParts = filePath.split('/');
    const sectionName = pathParts[pathParts.length - 2]?.toUpperCase().replace(/-/g, '_') || 'API';

    const exports = items.map(item => {
      stats.total++;
      if (item.alias) {
        stats.aliased++;
        return `  ${item.original} as ${item.alias}`;
      }
      return `  ${item.original}`;
    });

    content += `// ${sectionName}\n`;
    content += `export {\n${exports.join(',\n')},\n} from '${filePath}';\n\n`;
  }

  // Re-export schemas
  content += `// SCHEMAS - All types and interfaces\nexport * from '${config.schemasPath}';\n`;

  // Add type aliases
  if (Object.keys(typeAliases).length > 0) {
    content += `\n// TYPE ALIASES - Frontend compatibility\n`;
    for (const [orvalType, aliasType] of Object.entries(typeAliases)) {
      content += `export type { ${orvalType} as ${aliasType} } from '${config.schemasPath}';\n`;
      stats.typeAliases++;
    }
  }

  return { content, stats, collisionErrors };
}

// ============================================================================
// Main
// ============================================================================
function main() {
  console.log(`🔄 API Alias Generator [${APP_NAME}] ${isCheckMode ? '(check mode)' : ''}`);
  console.log('');

  // 1. Collect Orval exports
  console.log('📦 Scanning Orval output...');
  const orvalExports = collectOrvalExports();
  console.log(`   Found: ${orvalExports.hooks.size} hooks, ${orvalExports.types.size} types`);

  // 2. Load and validate aliases
  console.log('📋 Loading api-aliases.json...');
  const { aliases, typeAliases, errors: configErrors, warnings } = loadAndValidateAliases(orvalExports);
  console.log(`   Loaded: ${Object.keys(aliases).length} hook aliases, ${Object.keys(typeAliases).length} type aliases`);

  // 3. Generate content
  console.log('📝 Generating api-aliases.ts...');
  const { content, stats, collisionErrors } = generateAliasesFile(orvalExports, aliases, typeAliases);

  // Collect all errors
  const allErrors = [...configErrors, ...collisionErrors];

  // Report errors
  if (allErrors.length > 0) {
    console.log('');
    console.log('❌ Errors:');
    for (const err of allErrors) {
      console.log(`   - ${err}`);
    }
    process.exit(1);
  }

  // Report warnings
  if (warnings.length > 0) {
    console.log('');
    console.log('⚠️  Warnings:');
    for (const warn of warnings) {
      console.log(`   - ${warn}`);
    }
  }

  // 4. Check mode or write
  if (isCheckMode) {
    if (fs.existsSync(config.aliasesOutput)) {
      const existing = fs.readFileSync(config.aliasesOutput, 'utf-8');
      // Compare without timestamp line
      const normalize = (s) => s.replace(/Generated:.*\n/, '');
      if (normalize(existing) !== normalize(content)) {
        console.log('');
        console.log('❌ api-aliases.ts is out of date!');
        console.log('   Run "npm run gen:aliases" locally and commit the changes.');
        process.exit(1);
      }
    } else {
      console.log('');
      console.log('❌ api-aliases.ts does not exist!');
      console.log('   Run "npm run gen:aliases" locally and commit the changes.');
      process.exit(1);
    }
    console.log('✅ api-aliases.ts is up to date');
  } else {
    fs.writeFileSync(config.aliasesOutput, content);
    console.log(`   Written: ${config.aliasesOutput}`);
  }

  console.log(`   Stats: ${stats.total} exports, ${stats.aliased} hook aliases, ${stats.typeAliases} type aliases`);
  console.log('');
  console.log('✅ Done!');

  return true;
}

try {
  main();
} catch (error) {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}
