# Shared Components Migration Guide
## Ortak UI Bileşenleri Migration Rehberi

### Mevcut Durum Analizi

Migration raporlarını inceledikten sonra, React uygulamasında **kritik bir UI tutarsızlığı** tespit edildi:

#### 🚨 Tespit Edilen Problemler

1. **200+ Raw HTML Button Kullanımı**: React uygulamasında `<button>` elementleri doğrudan kullanılıyor
2. **Shared UI Library Eksikliği**: `@x-ear/ui-web` dependency'si package.json'da mevcut değildi
3. **Inconsistent Imports**: Sadece 2 dosyada relative path ile shared component kullanımı
4. **Code Duplication**: Her component kendi button stillerini tanımlıyor

#### 📊 Analiz Sonuçları

```bash
# Raw HTML Elements (React App)
<button>: 200+ instances across 35+ files
<input>: 150+ instances  
<select>: 50+ instances
<form>: 80+ instances

# Shared Component Usage
@x-ear/ui-web imports: 2 files only (relative paths)
Proper shared components: <5% usage
```

### ✅ Çözüm Stratejisi

#### 1. Dependency Management
```json
// apps/web/package.json
{
  "dependencies": {
    "@x-ear/ui-web": "workspace:*"  // ✅ ADDED
  }
}
```

#### 2. TypeScript Configuration
```json
// apps/web/tsconfig.json
{
  "include": [
    "src", 
    "../../packages/ui-web/src",    // ✅ ADDED
    "../../packages/core/src"       // ✅ ADDED
  ],
  "paths": {
    "@x-ear/ui-web": ["../../packages/ui-web/src"]  // ✅ EXISTS
  }
}
```

#### 3. ESLint Rules (Code Quality Enforcement)
```javascript
// apps/web/.eslintrc.cjs
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'JSXElement[openingElement.name.name="button"]:not([openingElement.attributes.0.name.name="data-allow-raw"])',
      message: 'Use Button component from @x-ear/ui-web instead of raw <button> elements.'
    }
    // Similar rules for input, select, textarea
  ]
}
```

### 🔄 Migration Execution Plan

#### Phase 1: Critical Components (Week 1)
**Priority: HIGH** - Most used components

```typescript
// Before (Raw HTML)
<button 
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 text-white rounded"
>
  Save
</button>

// After (Shared Component)
import { Button } from '@x-ear/ui-web';

<Button 
  variant="primary" 
  onClick={handleClick}
>
  Save
</Button>
```

**Target Files (Week 1):**
- `pages/SGKPage.tsx` ✅ (Example completed)
- `pages/InvoicesPage.tsx`
- `pages/PatientsPage.tsx`
- `pages/InventoryPage.tsx`
- `components/layout/MainLayout.tsx`

#### Phase 2: Form Components (Week 2)
**Priority: HIGH** - Form consistency

```typescript
// Before
<input 
  type="text"
  className="border rounded px-3 py-2"
  value={value}
  onChange={onChange}
/>

// After
import { Input } from '@x-ear/ui-web';

<Input 
  value={value}
  onChange={onChange}
  placeholder="Enter text"
/>
```

**Target Files:**
- `components/forms/DynamicInvoiceForm.tsx`
- `components/patients/PatientForm.tsx`
- `components/inventory/InventoryForm.tsx`
- `components/invoices/InvoiceForm.tsx`

#### Phase 3: Modal & Dialog Components (Week 3)
**Priority: MEDIUM** - Modal consistency

```typescript
// Before (Custom Modal)
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="bg-white rounded-lg p-6">
    {/* content */}
  </div>
</div>

// After (Shared Modal)
import { Modal } from '@x-ear/ui-web';

<Modal isOpen={isOpen} onClose={onClose} title="Modal Title">
  {/* content */}
</Modal>
```

#### Phase 4: Data Display Components (Week 4)
**Priority: MEDIUM** - Table & list consistency

```typescript
// Before (Custom Table)
<table className="min-w-full">
  {/* custom table implementation */}
</table>

// After (Shared DataTable)
import { DataTable } from '@x-ear/ui-web';

<DataTable 
  columns={columns}
  data={data}
  onSort={handleSort}
/>
```

### 📋 Component Mapping Strategy

#### Available Shared Components (`@x-ear/ui-web`)

| Component | Usage | Migration Priority |
|-----------|-------|-------------------|
| `Button` | Replace all `<button>` | **HIGH** |
| `Input` | Replace all `<input>` | **HIGH** |
| `Select` | Replace all `<select>` | **HIGH** |
| `Textarea` | Replace all `<textarea>` | **HIGH** |
| `Modal` | Replace custom modals | **MEDIUM** |
| `DataTable` | Replace custom tables | **MEDIUM** |
| `DatePicker` | Replace date inputs | **MEDIUM** |
| `FileUpload` | Replace file inputs | **MEDIUM** |
| `Autocomplete` | Replace search inputs | **LOW** |
| `MultiSelect` | Replace multi-select | **LOW** |

#### Legacy Component Mapping

Based on `legacy-ui-elements-per-page.md` analysis:

```typescript
// Legacy → React Shared Component Mapping

// Buttons
"Yeni hasta ekle" → <Button variant="primary">Yeni Hasta Ekle</Button>
"Bulk actions" → <Button variant="secondary">Bulk Actions</Button>
"Edit/Delete" → <Button variant="outline" size="sm">Edit</Button>

// Forms  
"#searchInput" → <Input placeholder="Ara..." />
"#categoryFilter" → <Select options={categories} />
"#dateRangeSelector" → <DatePicker range />

// Modals
"InventoryModal" → <Modal><InventoryForm /></Modal>
"PatientModal" → <Modal><PatientForm /></Modal>
"InvoiceModal" → <Modal><InvoiceForm /></Modal>
```

### 🛠 Implementation Guidelines

#### 1. Import Strategy
```typescript
// ✅ Correct - Named imports
import { Button, Input, Modal } from '@x-ear/ui-web';

// ❌ Avoid - Relative paths
import { Button } from '../../../../../packages/ui-web/src/components/ui/Button';
```

#### 2. Prop Mapping
```typescript
// Raw HTML props → Shared component props
className → variant + size + className (for custom styles)
onClick → onClick (same)
disabled → disabled (same)
type → variant (for buttons)
```

#### 3. Styling Strategy
```typescript
// ✅ Use component variants
<Button variant="primary" size="lg">Large Primary</Button>

// ✅ Extend with custom classes when needed
<Button variant="outline" className="w-full mt-4">Custom Width</Button>

// ❌ Avoid overriding core styles
<Button className="bg-red-500">Don't override variant colors</Button>
```

### 🧪 Testing Strategy

#### 1. Component Tests
```typescript
// Test shared component integration
import { render, screen } from '@testing-library/react';
import { Button } from '@x-ear/ui-web';

test('Button renders with correct variant', () => {
  render(<Button variant="primary">Test</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
});
```

#### 2. ESLint Validation
```bash
# Run ESLint to catch raw HTML usage
npm run lint

# Expected errors for unmigrated files:
# "Use Button component from @x-ear/ui-web instead of raw <button> elements"
```

#### 3. Visual Regression Testing
- Before/after screenshots for each migrated page
- Ensure UI consistency across components
- Test responsive behavior

### 📈 Success Metrics

#### Code Quality Metrics
- **Raw HTML Elements**: 200+ → 0 (target)
- **Shared Component Usage**: 5% → 95% (target)
- **Code Duplication**: High → Low
- **Bundle Size**: Monitor for increases

#### Developer Experience Metrics
- **Import Consistency**: 100% use `@x-ear/ui-web`
- **ESLint Compliance**: 0 raw HTML violations
- **TypeScript Errors**: 0 import/path errors

### 🚀 Next Steps

#### Immediate Actions (This Week)
1. ✅ Add `@x-ear/ui-web` dependency
2. ✅ Update tsconfig.json includes
3. ✅ Add ESLint rules for enforcement
4. ✅ Create migration example (SGKPage.tsx)
5. 🔄 Continue with high-priority files

#### Ongoing Actions (Next 4 Weeks)
1. **Week 1**: Migrate all button elements
2. **Week 2**: Migrate all form elements  
3. **Week 3**: Migrate all modal components
4. **Week 4**: Migrate data display components

#### Quality Assurance
1. **Daily**: Run ESLint checks
2. **Weekly**: Visual regression testing
3. **End of migration**: Full E2E testing

### 🔗 Related Documentation

- [COMPLETE_MIGRATION_PLAN.md](./COMPLETE_MIGRATION_PLAN.md) - Overall migration strategy
- [legacy-ui-elements-per-page.md](./docs/reports/legacy-ui-elements-per-page.md) - Legacy component analysis
- [packages/ui-web/README.md](./packages/ui-web/README.md) - Shared component documentation

---

**Migration Status**: 🟡 **IN PROGRESS**
- ✅ Foundation setup completed
- 🔄 Component migration started (SGKPage example)
- ⏳ Remaining: 35+ files to migrate

**Next Priority**: Complete button migration in high-traffic pages (Invoices, Patients, Inventory)