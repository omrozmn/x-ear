# Lint Error Elimination - Design Document

## 1. Executive Summary

This document provides a comprehensive design for eliminating **1,168 lint problems** (1,149 errors, 19 warnings) in the X-Ear web application. The approach is systematic, phased, and follows project architecture rules.

### Error Distribution
```
@typescript-eslint/no-explicit-any:        536 errors (46.6%)
no-restricted-syntax:                      326 errors (28.4%)
@typescript-eslint/no-unused-vars:         252 errors (21.9%)
react-refresh/only-export-components:       19 warnings (1.7%)
no-case-declarations:                       13 errors (1.1%)
no-restricted-imports:                       9 errors (0.8%)
Other:                                      13 errors (1.1%)
```

## 2. Architecture Overview

### 2.1 Design Principles

1. **Type Safety First**: Eliminate all `any` types with proper TypeScript types
2. **Component Standards**: Use UI library components consistently
3. **Code Hygiene**: Remove dead code and unused imports
4. **Non-Breaking**: All changes must maintain existing functionality
5. **Incremental**: Fix in phases to avoid massive PRs

### 2.2 Phased Approach

```
Phase 1: Type Safety (Critical)
  ├─ Fix @typescript-eslint/no-explicit-any (536 errors)
  ├─ Fix @typescript-eslint/ban-types (2 errors)
  └─ Estimated: 3-4 days

Phase 2: Component Standards (High)
  ├─ Replace raw <input> with Input component
  ├─ Replace raw <button> with Button component
  ├─ Replace raw <select> with Select component
  ├─ Replace raw <textarea> with Textarea component
  └─ Estimated: 2-3 days

Phase 3: Code Cleanup (Medium)
  ├─ Remove unused variables (252 errors)
  ├─ Fix Fast Refresh violations (19 warnings)
  ├─ Fix deep import violations (9 errors)
  └─ Estimated: 2 days

Phase 4: Polish (Low)
  ├─ Fix case declarations (13 errors)
  ├─ Fix exhaustive-deps (8 errors)
  ├─ Update ESLint config
  └─ Estimated: 1 day
```

## 3. Detailed Design

### 3.1 Phase 1: Type Safety (Critical)

#### 3.1.1 Problem Analysis

**536 `any` type usages** across the codebase violate type safety rules. Common patterns:

```typescript
// ❌ WRONG - Current pattern
const handleChange = (e: any) => { ... }
const data: any = response.data;
const items: any[] = [];

// ✅ CORRECT - Target pattern
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
const data: PartyRead = response.data;
const items: InventoryItem[] = [];
```

#### 3.1.2 Type Replacement Strategy

**Category A: Event Handlers (Est. 150 errors)**
```typescript
// Pattern: (e: any) => void
// Fix: Use proper React event types

// Input events
onChange={(e: React.ChangeEvent<HTMLInputElement>) => ...}

// Form events
onSubmit={(e: React.FormEvent<HTMLFormElement>) => ...}

// Button events
onClick={(e: React.MouseEvent<HTMLButtonElement>) => ...}

// Select events
onChange={(e: React.ChangeEvent<HTMLSelectElement>) => ...}
```

**Category B: API Response Data (Est. 200 errors)**
```typescript
// Pattern: response.data as any
// Fix: Use generated Orval types

import type { PartyRead, SaleRead, InvoiceRead } from '@/api/generated';

const party: PartyRead = response.data;
const sales: SaleRead[] = response.data;
```

**Category C: Form Data (Est. 100 errors)**
```typescript
// Pattern: formData: any
// Fix: Define proper interfaces

interface DeviceAssignmentFormData {
  partyId: string;
  deviceId: string;
  serialNumber: string;
  assignmentDate: string;
  price: number;
  currency: string;
}

const formData: DeviceAssignmentFormData = { ... };
```

**Category D: Generic Utilities (Est. 50 errors)**
```typescript
// Pattern: (item: any) => any
// Fix: Use generics

// Before
function mapItems(items: any[]): any[] { ... }

// After
function mapItems<T, R>(items: T[], mapper: (item: T) => R): R[] { ... }
```

**Category E: Third-party Library Types (Est. 36 errors)**
```typescript
// Pattern: Storybook args, test utils
// Fix: Use library-provided types

// Storybook
import type { Meta, StoryObj } from '@storybook/react';
const meta: Meta<typeof Component> = { ... };

// Vitest
import type { Mock } from 'vitest';
const mockFn = vi.fn() as Mock<[string], void>;
```

#### 3.1.3 Banned Types Fix

**2 `{}` type usages** in `party-base.types.ts`:

```typescript
// ❌ WRONG
export type PartyMetadata = {} | Record<string, unknown>;

// ✅ CORRECT
export type PartyMetadata = Record<string, unknown>;
```

#### 3.1.4 Implementation Plan

1. **Create Type Utilities** (`src/types/utils.ts`)
   - Common event handler types
   - Form data type helpers
   - Generic utility types

2. **Fix by File Category**
   - Start with services (isolated, no UI dependencies)
   - Then hooks (depend on services)
   - Then components (depend on hooks)
   - Finally pages (depend on components)

3. **Validation**
   - Run `tsc --noEmit` after each batch
   - Run unit tests for affected files
   - Check for runtime errors in dev mode

### 3.2 Phase 2: Component Standards (High)

#### 3.2.1 Problem Analysis

**326 raw HTML element usages** violate UI component standards:

```
Raw <input>:    ~180 errors
Raw <button>:   ~80 errors
Raw <select>:   ~50 errors
Raw <textarea>: ~16 errors
```

#### 3.2.2 Component Replacement Strategy

**Pattern 1: Raw Input → Input Component**
```tsx
// ❌ WRONG
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="border rounded px-2 py-1"
/>

// ✅ CORRECT
<Input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Pattern 2: Raw Button → Button Component**
```tsx
// ❌ WRONG
<button
  onClick={handleClick}
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Submit
</button>

// ✅ CORRECT
<Button onClick={handleClick} variant="primary">
  Submit
</Button>
```

**Pattern 3: Raw Select → Select Component**
```tsx
// ❌ WRONG
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</select>

// ✅ CORRECT
<Select
  value={value}
  onValueChange={setValue}
  options={[
    { value: '', label: 'Select...' },
    { value: '1', label: 'Option 1' }
  ]}
/>
```

**Pattern 4: Raw Textarea → Textarea Component**
```tsx
// ❌ WRONG
<textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  rows={4}
/>

// ✅ CORRECT
<Textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  rows={4}
/>
```

#### 3.2.3 Special Cases

**Intentional Raw Elements** (if needed):
```tsx
// Add data-allow-raw="true" to suppress lint error
<input data-allow-raw="true" type="hidden" name="csrf" value={token} />
```

#### 3.2.4 Implementation Plan

1. **Verify UI Component API**
   - Check `@x-ear/ui-web` exports
   - Ensure all needed props are supported
   - Document any missing features

2. **Fix by Component Type**
   - Input fields (highest count)
   - Buttons (second highest)
   - Selects (third)
   - Textareas (lowest)

3. **Test Each Replacement**
   - Visual regression (Storybook)
   - Functional testing (user interactions)
   - Accessibility (keyboard navigation)

### 3.3 Phase 3: Code Cleanup (Medium)

#### 3.3.1 Unused Variables (252 errors)

**Strategy:**
1. **Safe Removals** - Truly unused imports/variables
2. **Prefix with Underscore** - Intentionally unused (e.g., destructuring)
3. **Fix Logic** - Variables that should be used

```typescript
// Pattern 1: Unused imports
// ❌ WRONG
import { Button, Input, Select } from '@x-ear/ui-web';
// Only Button is used

// ✅ CORRECT
import { Button } from '@x-ear/ui-web';

// Pattern 2: Intentionally unused
// ❌ WRONG
const { data, error } = useQuery(); // error not used

// ✅ CORRECT
const { data, error: _error } = useQuery();

// Pattern 3: Should be used
// ❌ WRONG
const calculatedPrice = price * 1.18; // Defined but never used
return <div>{price}</div>;

// ✅ CORRECT
const calculatedPrice = price * 1.18;
return <div>{calculatedPrice}</div>;
```

#### 3.3.2 Fast Refresh Violations (19 warnings)

**Problem:** Files export both components and non-component values.

```typescript
// ❌ WRONG - Single file
export const API_URL = 'https://api.example.com';
export const MyComponent = () => { ... };

// ✅ CORRECT - Split files
// constants.ts
export const API_URL = 'https://api.example.com';

// MyComponent.tsx
import { API_URL } from './constants';
export const MyComponent = () => { ... };
```

**Affected Files:**
- `AIFeatureExample.tsx` - Move constants to separate file
- `AIFeatureWrapper.tsx` - Move utility functions
- `AIStatusIndicator.tsx` - Move type definitions
- `PendingActionBadge.tsx` - Move helper functions
- `PhaseABanner.tsx` - Move constants
- `GlobalErrorHandler.tsx` - Move error utilities
- `ErrorBoundary.tsx` - Move error types
- `test/utils.tsx` - Already test utility, can ignore

#### 3.3.3 Deep Import Violations (9 errors)

**Problem:** Direct imports from `@/api/generated/schemas/*` instead of barrel exports.

```typescript
// ❌ WRONG
import { PartyRead } from '@/api/generated/schemas/partyRead';
import { DeviceRead } from '@/api/generated/schemas/deviceRead';

// ✅ CORRECT
import type { PartyRead, DeviceRead } from '@/api/generated';
// OR use client adapters
import type { PartyRead, DeviceRead } from '@/api/client/party.client';
```

**Affected Files:**
- `party-analytics.service.ts`
- `party-base.types.ts` (3 imports)

**Fix Strategy:**
1. Update imports to use barrel export
2. Verify generated `index.ts` includes all schemas
3. Add ESLint rule to prevent future violations

### 3.4 Phase 4: Polish (Low)

#### 3.4.1 Case Declarations (13 errors)

**Problem:** Lexical declarations in case blocks without braces.

```typescript
// ❌ WRONG
switch (type) {
  case 'A':
    const result = processA();
    return result;
  case 'B':
    const result = processB(); // Error: 'result' already declared
    return result;
}

// ✅ CORRECT
switch (type) {
  case 'A': {
    const result = processA();
    return result;
  }
  case 'B': {
    const result = processB();
    return result;
  }
}
```

**Affected File:** `sgk.service.ts` (3 cases)

#### 3.4.2 Exhaustive Deps (8 errors)

**Problem:** Unused `eslint-disable` directives.

```typescript
// ❌ WRONG
useEffect(() => {
  // ... code that doesn't violate exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ✅ CORRECT
useEffect(() => {
  // ... code
}, []);
```

**Strategy:** Remove unnecessary disable comments.

#### 3.4.3 Other Errors

- `@typescript-eslint/ban-ts-comment` (1 error) - Replace `@ts-ignore` with `@ts-expect-error`
- `no-empty-pattern` (1 error) - Fix empty destructuring pattern

### 3.5 ESLint Configuration Updates

#### 3.5.1 Stricter Rules

```javascript
// .eslintrc.cjs additions
module.exports = {
  rules: {
    // Enforce type safety
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-types': 'error',
    
    // Enforce component standards
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXElement[openingElement.name.name="input"]:not([data-allow-raw])',
        message: 'Use Input component from @x-ear/ui-web instead of raw <input> elements. Add data-allow-raw="true" if raw input is intentional',
      },
      // ... similar for button, select, textarea
    ],
    
    // Enforce import patterns
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/api/generated/schemas/*'],
            message: 'Deep imports from generated API are forbidden. Import from @/api/client/ instead',
          },
        ],
      },
    ],
  },
};
```

#### 3.5.2 Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "tsc --noEmit"
    ]
  }
}
```

## 4. Implementation Strategy

### 4.1 Execution Order

```
Week 1:
  Day 1-2: Phase 1 - Services & Hooks (type safety)
  Day 3-4: Phase 1 - Components & Pages (type safety)
  Day 5:   Phase 1 - Validation & Testing

Week 2:
  Day 1-2: Phase 2 - Component replacements
  Day 3:   Phase 2 - Testing & visual regression
  Day 4:   Phase 3 - Code cleanup
  Day 5:   Phase 4 - Polish & ESLint config
```

### 4.2 Git Strategy

**Branch Naming:**
- `fix/lint-phase-1-type-safety`
- `fix/lint-phase-2-components`
- `fix/lint-phase-3-cleanup`
- `fix/lint-phase-4-polish`

**Commit Strategy:**
```bash
# Small, focused commits
git commit -m "fix(types): replace any with proper types in party services"
git commit -m "fix(types): add event handler types for forms"
git commit -m "fix(ui): replace raw inputs in DeviceAssignmentForm"
```

**PR Strategy:**
- One PR per phase
- Include before/after lint counts
- Link to this design doc
- Request review from 2+ team members

### 4.3 Testing Strategy

**Per Phase:**
1. Run `npm run lint` - verify error count reduction
2. Run `tsc --noEmit` - verify no type errors
3. Run `npm test` - verify no test failures
4. Run `npm run dev` - manual smoke testing
5. Check Storybook - visual regression

**Regression Prevention:**
- Update CI to fail on new lint errors
- Add pre-commit hooks
- Document patterns in README

## 5. Risk Mitigation

### 5.1 Breaking Changes

**Risk:** Type changes break existing code  
**Mitigation:**
- Use TypeScript compiler to catch breaks
- Run full test suite after each batch
- Test in staging before merging

### 5.2 Merge Conflicts

**Risk:** Long-running branches cause conflicts  
**Mitigation:**
- Complete each phase quickly (1-2 days)
- Rebase frequently
- Coordinate with team on active areas

### 5.3 Performance Impact

**Risk:** Component replacements affect performance  
**Mitigation:**
- Benchmark critical paths before/after
- Use React DevTools Profiler
- Monitor bundle size

### 5.4 UI Regressions

**Risk:** Component replacements change appearance  
**Mitigation:**
- Visual regression testing (Storybook)
- Manual QA of all forms
- Screenshot comparison

## 6. Success Criteria

### 6.1 Quantitative Metrics

- ✅ Lint errors: 0 (from 1,149)
- ✅ Lint warnings: ≤ 5 (from 19)
- ✅ Type coverage: 100% (no `any` except shims)
- ✅ Test pass rate: 100%
- ✅ Build time: No increase > 10%

### 6.2 Qualitative Metrics

- ✅ Code is more maintainable
- ✅ Type safety prevents bugs
- ✅ UI components are consistent
- ✅ Developer experience improved

## 7. Correctness Properties

### 7.1 Type Safety Properties

**Property 1.1: No Explicit Any**
```typescript
// For all TypeScript files (excluding .d.ts shims):
// ∀ file ∈ src/**/*.{ts,tsx} \ src/types/shims-*.d.ts
// ∄ usage of ': any' or 'as any'
```

**Property 1.2: Event Handler Type Correctness**
```typescript
// For all event handlers:
// ∀ handler: (e: T) => void
// T must be a proper React event type (ChangeEvent, MouseEvent, etc.)
```

**Property 1.3: API Response Type Correctness**
```typescript
// For all API responses:
// ∀ response from Orval hooks
// response.data must be typed with generated schema
```

### 7.2 Component Standards Properties

**Property 2.1: No Raw Form Elements**
```typescript
// For all JSX:
// ∄ <input> without data-allow-raw="true"
// ∄ <button> without data-allow-raw="true"
// ∄ <select> without data-allow-raw="true"
// ∄ <textarea> without data-allow-raw="true"
```

**Property 2.2: UI Component Usage**
```typescript
// For all form elements:
// ∀ form input → uses Input from @x-ear/ui-web
// ∀ button → uses Button from @x-ear/ui-web
// ∀ select → uses Select from @x-ear/ui-web
// ∀ textarea → uses Textarea from @x-ear/ui-web
```

### 7.3 Code Hygiene Properties

**Property 3.1: No Unused Code**
```typescript
// For all files:
// ∄ unused imports
// ∄ unused variables (except prefixed with _)
// ∄ unused function parameters (except prefixed with _)
```

**Property 3.2: Fast Refresh Compliance**
```typescript
// For all component files:
// ∀ file exporting React components
// file exports ONLY components OR has proper separation
```

**Property 3.3: Import Path Correctness**
```typescript
// For all imports:
// ∄ imports from @/api/generated/schemas/*
// ∀ API type imports → from @/api/generated or @/api/client/*
```

### 7.4 Validation Strategy

**Unit Tests:**
- Test type utilities with various inputs
- Test component replacements maintain behavior
- Test form submissions with new types

**Integration Tests:**
- Test API calls with typed responses
- Test form flows end-to-end
- Test error handling with typed errors

**Property-Based Tests:**
- Generate random form data, verify type safety
- Generate random API responses, verify parsing
- Generate random event objects, verify handler types

## 8. File Organization

```
.kiro/specs/lint-error-elimination/
├── requirements.md          (requirements document)
├── design.md               (this file)
├── tasks.md                (to be created)
└── analysis/
    ├── error-breakdown.md  (detailed error list)
    ├── type-patterns.md    (common type patterns)
    └── component-map.md    (UI component mapping)
```

## 9. Dependencies

### 9.1 Internal Dependencies
- `@x-ear/ui-web` - UI component library
- Generated API types - Must be up-to-date
- Existing test suite - Must be passing

### 9.2 External Dependencies
- ESLint v8.x
- TypeScript v5.x
- React v18.x
- Vite v5.x

## 10. Future Improvements

After completing this spec:

1. **Automated Type Generation**
   - Generate form types from schemas
   - Generate event handler types from components

2. **Stricter ESLint Rules**
   - Enforce explicit return types
   - Enforce explicit function parameter types
   - Ban `as` type assertions

3. **Type Coverage Metrics**
   - Track type coverage over time
   - Set up type coverage CI checks
   - Generate type coverage reports

4. **Developer Tooling**
   - VS Code snippets for common patterns
   - ESLint auto-fix for simple cases
   - Codemod scripts for bulk changes

---

**Status:** Draft  
**Created:** 2026-01-24  
**Last Updated:** 2026-01-24  
**Owner:** Development Team  
**Reviewers:** Tech Lead, Senior Developers
