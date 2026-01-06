#!/usr/bin/env node
/**
 * API Adapter Generator
 * 
 * Bu script Orval tarafından üretilen API fonksiyonlarını analiz eder ve
 * stabil isimlerle re-export eden adapter dosyası oluşturur.
 * 
 * Kullanım: node scripts/generate-api-adapters.mjs
 * 
 * CI'da: npm run gen:api sonrası otomatik çalışır
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_DIR = path.join(__dirname, '../apps/web/src/api/generated');
const ADAPTERS_FILE = path.join(__dirname, '../apps/web/src/api/adapters/index.ts');

// İsim dönüşüm kuralları
const NAME_MAPPINGS = {
  // Pattern: [regex, replacement]
  // Orval'ın uzun isimlerini kısa, okunabilir isimlere dönüştür
  'useGet(.+)Api(.+)Get$': 'use$1Get',
  'useCreate(.+)Api(.+)Post$': 'use$1Create',
  'useUpdate(.+)Api(.+)Put$': 'use$1Update',
  'useDelete(.+)Api(.+)Delete$': 'use$1Delete',
  'get(.+)Api(.+)Get$': '$1Get',
  'create(.+)Api(.+)Post$': '$1Create',
  'update(.+)Api(.+)Put$': '$1Update',
  'delete(.+)Api(.+)Delete$': '$1Delete',
};

/**
 * Bir dosyadan export edilen fonksiyonları çıkar
 */
function extractExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports = [];
  
  // export const functionName = ... pattern
  const constExportRegex = /export const (\w+)\s*=/g;
  let match;
  while ((match = constExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // export function functionName pattern
  const funcExportRegex = /export function (\w+)/g;
  while ((match = funcExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  return [...new Set(exports)]; // Unique
}

/**
 * Uzun Orval ismini kısa, okunabilir isme dönüştür
 */
function transformName(originalName) {
  // Basit dönüşüm: Api...Get/Post/Put/Delete kısımlarını kaldır
  let transformed = originalName
    .replace(/Api[A-Z][a-zA-Z]+Get$/, 'Get')
    .replace(/Api[A-Z][a-zA-Z]+Post$/, 'Create')
    .replace(/Api[A-Z][a-zA-Z]+Put$/, 'Update')
    .replace(/Api[A-Z][a-zA-Z]+Patch$/, 'Update')
    .replace(/Api[A-Z][a-zA-Z]+Delete$/, 'Delete');
  
  return transformed;
}

/**
 * Adapter dosyasını oluştur
 */
function generateAdapters() {
  const header = `/**
 * API Adapter Layer - Auto-generated
 * 
 * Bu dosya Orval tarafından üretilen API fonksiyonlarını stabil isimlerle re-export eder.
 * Orval isim değişikliklerinden tüketici kodunu korur.
 * 
 * ⚠️ BU DOSYA OTOMATİK ÜRETİLMİŞTİR - MANUEL DÜZENLEME YAPMAYIN!
 * 
 * Yeniden üretmek için: npm run gen:adapters
 * 
 * Generated at: ${new Date().toISOString()}
 */

`;

  let content = header;
  
  // Her generated klasörü için
  const folders = fs.readdirSync(GENERATED_DIR).filter(f => {
    const fullPath = path.join(GENERATED_DIR, f);
    return fs.statSync(fullPath).isDirectory() && f !== 'schemas';
  });
  
  for (const folder of folders) {
    const folderPath = path.join(GENERATED_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.ts'));
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const exports = extractExports(filePath);
      
      if (exports.length === 0) continue;
      
      const sectionName = folder.toUpperCase().replace(/-/g, ' ');
      content += `// ============================================================================\n`;
      content += `// ${sectionName}\n`;
      content += `// ============================================================================\n`;
      
      const reExports = [];
      for (const exp of exports) {
        // Query key fonksiyonlarını atla
        if (exp.includes('QueryKey') || exp.includes('QueryOptions') || exp.includes('MutationOptions')) {
          continue;
        }
        
        const shortName = transformName(exp);
        if (shortName !== exp) {
          reExports.push(`  ${exp} as ${shortName}`);
        } else {
          reExports.push(`  ${exp}`);
        }
      }
      
      if (reExports.length > 0) {
        const relativePath = `../generated/${folder}/${file.replace('.ts', '')}`;
        content += `export {\n${reExports.join(',\n')},\n} from '${relativePath}';\n\n`;
      }
    }
  }
  
  // Adapters klasörünü oluştur
  const adaptersDir = path.dirname(ADAPTERS_FILE);
  if (!fs.existsSync(adaptersDir)) {
    fs.mkdirSync(adaptersDir, { recursive: true });
  }
  
  fs.writeFileSync(ADAPTERS_FILE, content);
  console.log(`✅ API adapters generated: ${ADAPTERS_FILE}`);
  console.log(`   ${folders.length} modules processed`);
}

// Ana fonksiyon
try {
  generateAdapters();
} catch (error) {
  console.error('❌ Error generating API adapters:', error);
  process.exit(1);
}
