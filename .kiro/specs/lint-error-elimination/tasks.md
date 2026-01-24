# Lint Error Elimination - Tasks

## Overview
This task list implements the systematic elimination of 1,168 lint problems across 4 phases.

**Total Errors:** 1,149 errors + 19 warnings = 1,168 problems
**Estimated Duration:** 8-10 days
**Target:** 0 errors, ≤5 warnings

---

## Phase 1: Type Safety (Critical) - 538 errors

### 1.1 Setup & Preparation
- [ ] 1.1.1 Create type utilities file (`src/types/utils.ts`)
  - Common event handler types
  - Form data type helpers
  - Generic utility types
- [ ] 1.1.2 Document type replacement patterns in README
- [ ] 1.1.3 Create baseline: run `npm run lint > lint-baseline.txt`

### 1.2 Fix Event Handler Types (~150 errors)
- [ ] 1.2.1 Fix event handlers in form components
  - `DynamicInvoiceForm.tsx` (7 errors)
  - `PartyNoteForm.tsx` (1 error)
  - `DeviceAssignmentForm.tsx` (0 errors, check sub-components)
  - `AssignmentDetailsForm.tsx` (5 errors)
  - `PricingForm.tsx` (1 error)
- [ ] 1.2.2 Fix event handlers in page components
  - `MobileInvoicesPage.tsx` (2 errors)
  - `MobilePartiesPage.tsx` (2 errors)
  - `Integration.tsx` (7 errors)
  - `SGKDownloadsPage.tsx` (2 errors)
  - `SGKPage.tsx` (4 errors)
- [ ] 1.2.3 Fix event handlers in inventory components
  - `AdvancedFilters.tsx` (1 error)
  - `InventoryForm.tsx` (1 error)
  - `InventoryList.tsx` (10 errors)
- [ ] 1.2.4 Validate: Run `tsc --noEmit` and fix type errors

### 1.3 Fix API Response Types (~200 errors)
- [ ] 1.3.1 Fix service layer types
  - `birfatura.service.ts` (15 errors)
  - `party.service.ts` (1 error)
  - `inventory.service.ts` (2 errors)
  - `sgk/sgk.service.ts` (8 errors)
  - `InvoiceValidationService.ts` (3 errors)
- [ ] 1.3.2 Fix hook types
  - `usePendingActions.ts` (1 error)
  - `useDeviceAssignment.ts` (4 errors)
- [ ] 1.3.3 Fix component API call types
  - `InvoiceBulkOperations.tsx` (6 errors)
  - `CustomerSection.tsx` (2 errors)
  - `CustomerSectionCompact.tsx` (1 error)
  - `UniversalImporter.tsx` (4 errors)
- [ ] 1.3.4 Validate: Run unit tests for affected services

### 1.4 Fix Form Data Types (~100 errors)
- [ ] 1.4.1 Define form interfaces for device assignment
  - Create `DeviceAssignmentFormData` interface
  - Create `PricingFormData` interface
  - Create `SerialNumberFormData` interface
- [ ] 1.4.2 Define form interfaces for invoices
  - Create `InvoiceFormData` interface
  - Create `AdditionalInfoFormData` interface
- [ ] 1.4.3 Apply form types to components
  - `DynamicInvoiceForm.tsx`
  - `DeviceAssignmentForm.tsx` and sub-components
  - `PartyNoteForm.tsx`
- [ ] 1.4.4 Validate: Test form submissions in dev mode

### 1.5 Fix Party/Adapter Types (~50 errors)
- [ ] 1.5.1 Fix party adapter types
  - `party-adapter.ts` (10 errors)
  - `party-base.types.ts` (7 errors)
  - `party-communication.types.ts` (3 errors)
  - `party-search.types.ts` (2 errors)
- [ ] 1.5.2 Fix offline sync types
  - `partyOfflineSync.ts` (2 errors)
- [ ] 1.5.3 Validate: Run party-related tests

### 1.6 Fix Utility & Generic Types (~36 errors)
- [ ] 1.6.1 Fix route types
  - `routes/index.tsx` (6 errors)
- [ ] 1.6.2 Fix settings page types
  - `BranchesTab.tsx` (3 errors)
  - `RolePermissionsTab.tsx` (3 errors)
  - `Roles.tsx` (3 errors)
  - `TeamMembersTab.tsx` (4 errors)
- [ ] 1.6.3 Fix utility types
  - `fuzzy-search.ts` (2 errors)
  - `vite.config.ts` (1 error)
- [ ] 1.6.4 Validate: Run `npm run build` to check for build errors

### 1.7 Fix Storybook & Test Types (~36 errors)
- [ ] 1.7.1 Fix Storybook story types
  - `DeviceSelector.stories.tsx` (1 error)
  - `FormField.stories.tsx` (1 error)
  - `PriceInput.stories.tsx` (1 error)
- [ ] 1.7.2 Fix test utility types
  - `__tests__/offlineGuard.test.ts` (2 errors)
- [ ] 1.7.3 Validate: Run Storybook and verify stories load

### 1.8 Fix Type Definition Files (~30 errors)
- [ ] 1.8.1 Fix global type definitions
  - `types/global.d.ts` (9 errors)
  - `types/invoice.ts` (2 errors)
  - `types/shims-orval.d.ts` (10 errors)
  - `types/shims-ui-web.d.ts` (5 errors)
- [ ] 1.8.2 Document why certain `any` types are necessary in shims
- [ ] 1.8.3 Validate: Run `tsc --noEmit` for full type check

### 1.9 Fix Banned Types (2 errors)
- [ ] 1.9.1 Replace `{}` with `Record<string, unknown>` in `party-base.types.ts`
- [ ] 1.9.2 Validate: Ensure no `@typescript-eslint/ban-types` errors remain

### 1.10 Phase 1 Validation
- [ ] 1.10.1 Run full lint check: `npm run lint`
- [ ] 1.10.2 Verify `@typescript-eslint/no-explicit-any` errors = 0 (except shims)
- [ ] 1.10.3 Run full test suite: `npm test`
- [ ] 1.10.4 Manual smoke test in dev mode
- [ ] 1.10.5 Create PR: `fix/lint-phase-1-type-safety`

---

## Phase 2: Component Standards (High) - 326 errors

### 2.1 Verify UI Component Library
- [ ] 2.1.1 Check `@x-ear/ui-web` exports (Input, Button, Select, Textarea)
- [ ] 2.1.2 Document component API and props
- [ ] 2.1.3 Create component replacement guide

### 2.2 Replace Raw Input Elements (~180 errors)
- [ ] 2.2.1 Replace in form components
  - `DocumentUploadForm.tsx` (1 input)
  - `PartyNoteForm.tsx` (2 inputs)
  - `DeviceAssignmentForm.tsx` (2 inputs)
  - `AssignmentDetailsForm.tsx` (9 inputs)
  - `PricingForm.tsx` (7 inputs)
  - `SerialNumberForm.tsx` (1 input)
- [ ] 2.2.2 Replace in page components
  - `MobileInvoicesPage.tsx` (1 input)
  - `MobilePartiesPage.tsx` (1 input)
  - `Integration.tsx` (2 inputs)
  - `PosSettings.tsx` (1 input)
  - `SGKDownloadsPage.tsx` (5 inputs)
  - `MobileSuppliersPage.tsx` (1 input)
- [ ] 2.2.3 Replace in inventory components
  - `InventoryForm.tsx` (2 inputs)
  - `UniversalImporter.tsx` (1 input)
- [ ] 2.2.4 Validate: Test all forms for functionality

### 2.3 Replace Raw Button Elements (~80 errors)
- [ ] 2.3.1 Replace in invoice components
  - `AdditionalInfoSection.tsx` (5 buttons)
  - `CustomerSection.tsx` (1 button)
  - `CustomerSectionCompact.tsx` (2 buttons)
- [ ] 2.3.2 Replace in page components
  - `MobileInvoicesPage.tsx` (1 button)
  - `MobilePartiesPage.tsx` (1 button)
  - `MobilePartyDetailPage.tsx` (4 buttons)
  - `Team.tsx` (1 button)
  - `SGKDownloadsPage.tsx` (1 button)
  - `MobileSuppliersPage.tsx` (1 button)
- [ ] 2.3.3 Replace in inventory components
  - `AdvancedFilters.tsx` (1 button)
  - `FeaturesTagManager.tsx` (1 button)
  - `InventoryForm.tsx` (2 buttons)
  - `SerialNumberModal.tsx` (1 button)
- [ ] 2.3.4 Replace in device assignment
  - `DeviceAssignmentForm.tsx` (1 button)
- [ ] 2.3.5 Validate: Test all button interactions

### 2.4 Replace Raw Select Elements (~50 errors)
- [ ] 2.4.1 Replace in form components
  - `DocumentUploadForm.tsx` (1 select)
  - `PartyNoteForm.tsx` (1 select)
  - `AssignmentDetailsForm.tsx` (3 selects)
  - `PricingForm.tsx` (4 selects)
- [ ] 2.4.2 Replace in page components
  - `SGKDownloadsPage.tsx` (1 select)
- [ ] 2.4.3 Validate: Test all dropdowns for options and selection

### 2.5 Replace Raw Textarea Elements (~16 errors)
- [ ] 2.5.1 Replace in form components
  - `PartyNoteForm.tsx` (1 textarea)
  - `DeviceAssignmentForm.tsx` (1 textarea)
  - `CustomerSectionCompact.tsx` (1 textarea)
- [ ] 2.5.2 Validate: Test all text areas for multi-line input

### 2.6 Phase 2 Validation
- [ ] 2.6.1 Run full lint check: `npm run lint`
- [ ] 2.6.2 Verify `no-restricted-syntax` errors = 0
- [ ] 2.6.3 Visual regression testing in Storybook
- [ ] 2.6.4 Manual QA of all forms and buttons
- [ ] 2.6.5 Create PR: `fix/lint-phase-2-components`

---

## Phase 3: Code Cleanup (Medium) - 280 errors

### 3.1 Remove Unused Variables & Imports (252 errors)
- [ ] 3.1.1 Fix unused imports in components
  - `DynamicInvoiceForm.tsx` (2 unused)
  - `PartyNoteForm.tsx` (3 unused)
  - `AssignmentDetailsForm.tsx` (3 unused)
  - `UniversalImporter.tsx` (2 unused)
  - `InventoryForm.tsx` (2 unused)
  - `InventoryList.tsx` (2 unused)
  - `SerialNumberModal.tsx` (1 unused)
  - `InvoiceBulkOperations.tsx` (2 unused)
  - `CustomerSectionCompact.tsx` (2 unused)
  - `ExportDetailsCard.tsx` (1 unused)
- [ ] 3.1.2 Fix unused imports in pages
  - `MobileInvoicesPage.tsx` (1 unused)
  - `MobilePartiesPage.tsx` (1 unused)
  - `MobilePartyDetailPage.tsx` (1 unused)
  - `ActivityLogs.tsx` (1 unused)
  - `Integration.tsx` (1 unused)
  - `RolePermissionsTab.tsx` (2 unused)
  - `SGKDownloadsPage.tsx` (1 unused)
  - `SGKPage.tsx` (1 unused)
  - `MobileSuppliersPage.tsx` (2 unused)
- [ ] 3.1.3 Fix unused imports in services
  - `EFaturaXMLService.ts` (2 unused)
  - `appointment.service.ts` (1 unused)
  - `birfatura.service.ts` (2 unused)
  - `communicationOfflineSync.ts` (1 unused)
  - `device-replacement.service.ts` (1 unused)
  - `inventory.service.ts` (1 unused)
  - `party.service.ts` (1 unused)
  - `party-analytics.service.ts` (1 unused)
  - `party-sync.service.ts` (1 unused)
  - `party-validation.service.ts` (1 unused)
  - `purchase.service.ts` (2 unused)
- [ ] 3.1.4 Fix unused imports in types
  - `party-communication.types.ts` (2 unused)
  - `party-sgk.types.ts` (2 unused)
  - `lucide-react.d.ts` (1 unused)
- [ ] 3.1.5 Fix unused imports in stories
  - `Alert.stories.tsx` (1 unused)
- [ ] 3.1.6 Fix unused variables (prefix with _ or remove)
  - `DynamicInvoiceForm.tsx` (1 variable)
  - `InventoryForm.tsx` (1 variable)
  - `InventoryList.tsx` (1 variable)
  - `SerialNumberForm.tsx` (1 variable)
  - `AdvancedFilters.tsx` (1 variable)
  - `MobilePartiesPage.tsx` (1 variable)
  - `offlineGuard.ts` (1 variable)
  - `partyOfflineSync.ts` (2 variables)
  - `party-analytics.service.ts` (1 variable)
- [ ] 3.1.7 Validate: Ensure no functionality is broken

### 3.2 Fix Fast Refresh Violations (19 warnings)
- [ ] 3.2.1 Extract constants from component files
  - `AIFeatureExample.tsx` - Move constants to `ai/constants.ts`
  - `AIFeatureWrapper.tsx` - Move utility functions to `ai/utils.ts`
  - `AIStatusIndicator.tsx` - Move type definitions to `ai/types.ts`
  - `PendingActionBadge.tsx` - Move helper functions to `ai/helpers.ts`
  - `PhaseABanner.tsx` - Move constants to `ai/constants.ts`
- [ ] 3.2.2 Extract error utilities
  - `GlobalErrorHandler.tsx` - Move error utilities to `utils/error-handler.ts`
  - `ErrorBoundary.tsx` - Move error types to `types/error.types.ts`
- [ ] 3.2.3 Update imports in affected components
- [ ] 3.2.4 Validate: Test Fast Refresh in dev mode

### 3.3 Fix Deep Import Violations (9 errors)
- [ ] 3.3.1 Fix party service imports
  - `party-analytics.service.ts` - Replace deep import with barrel export
  - `party-base.types.ts` - Replace 3 deep imports with barrel exports
- [ ] 3.3.2 Update barrel exports if needed
  - Verify `@/api/generated/index.ts` exports all schemas
- [ ] 3.3.3 Add ESLint rule to prevent future violations
- [ ] 3.3.4 Validate: Ensure imports resolve correctly

### 3.4 Phase 3 Validation
- [ ] 3.4.1 Run full lint check: `npm run lint`
- [ ] 3.4.2 Verify unused-vars errors = 0
- [ ] 3.4.3 Verify Fast Refresh warnings = 0
- [ ] 3.4.4 Verify deep import errors = 0
- [ ] 3.4.5 Run full test suite: `npm test`
- [ ] 3.4.6 Create PR: `fix/lint-phase-3-cleanup`

---

## Phase 4: Polish (Low) - 35 errors

### 4.1 Fix Case Declarations (13 errors)
- [ ] 4.1.1 Add braces to case blocks in `sgk.service.ts`
  - Fix 3 case statements with lexical declarations
- [ ] 4.1.2 Validate: Test SGK service functionality

### 4.2 Fix Exhaustive Deps (8 errors)
- [ ] 4.2.1 Remove unnecessary eslint-disable comments
  - `useDeviceAssignment.ts` (1 comment)
  - `invoice.service.ts` (1 comment)
- [ ] 4.2.2 Validate: Ensure hooks work correctly

### 4.3 Fix Remaining Errors (14 errors)
- [ ] 4.3.1 Replace `@ts-ignore` with `@ts-expect-error` in `Integration.tsx`
- [ ] 4.3.2 Fix empty pattern in relevant file
- [ ] 4.3.3 Validate: Run full lint check

### 4.4 Update ESLint Configuration
- [ ] 4.4.1 Add stricter rules to `.eslintrc.cjs`
  - Enforce `@typescript-eslint/no-explicit-any: error`
  - Enforce `no-restricted-syntax` for raw HTML elements
  - Enforce `no-restricted-imports` for deep API imports
- [ ] 4.4.2 Document ESLint rules in README
- [ ] 4.4.3 Add examples of correct patterns

### 4.5 Setup Pre-commit Hooks
- [ ] 4.5.1 Install husky: `npm install -D husky`
- [ ] 4.5.2 Install lint-staged: `npm install -D lint-staged`
- [ ] 4.5.3 Configure husky pre-commit hook
- [ ] 4.5.4 Configure lint-staged in package.json
- [ ] 4.5.5 Test pre-commit hook with intentional error

### 4.6 Update CI Configuration
- [ ] 4.6.1 Add lint check to CI pipeline
- [ ] 4.6.2 Configure CI to fail on lint errors
- [ ] 4.6.3 Add lint error count to CI output
- [ ] 4.6.4 Test CI with intentional lint error

### 4.7 Documentation Updates
- [ ] 4.7.1 Update README with lint guidelines
- [ ] 4.7.2 Document common type patterns
- [ ] 4.7.3 Document component replacement patterns
- [ ] 4.7.4 Add troubleshooting section for common lint errors

### 4.8 Phase 4 Validation
- [ ] 4.8.1 Run full lint check: `npm run lint`
- [ ] 4.8.2 Verify total errors = 0
- [ ] 4.8.3 Verify total warnings ≤ 5
- [ ] 4.8.4 Run full test suite: `npm test`
- [ ] 4.8.5 Test pre-commit hooks
- [ ] 4.8.6 Test CI pipeline
- [ ] 4.8.7 Create PR: `fix/lint-phase-4-polish`

---

## Final Validation & Cleanup

### 5.1 Comprehensive Testing
- [ ] 5.1.1 Run full lint check: `npm run lint` (expect 0 errors, ≤5 warnings)
- [ ] 5.1.2 Run type check: `tsc --noEmit` (expect 0 errors)
- [ ] 5.1.3 Run full test suite: `npm test` (expect 100% pass)
- [ ] 5.1.4 Run build: `npm run build` (expect success)
- [ ] 5.1.5 Manual smoke testing in dev mode
- [ ] 5.1.6 Visual regression testing in Storybook

### 5.2 Performance Validation
- [ ] 5.2.1 Measure lint execution time (should not increase >10%)
- [ ] 5.2.2 Measure build time (should not increase >10%)
- [ ] 5.2.3 Check bundle size (should not increase significantly)

### 5.3 Documentation
- [ ] 5.3.1 Create migration guide for team
- [ ] 5.3.2 Document lessons learned
- [ ] 5.3.3 Update CONTRIBUTING.md with lint guidelines
- [ ] 5.3.4 Create before/after comparison report

### 5.4 Cleanup
- [ ] 5.4.1 Remove temporary files and scripts
- [ ] 5.4.2 Archive lint baseline files
- [ ] 5.4.3 Update spec status to "Completed"

---

## Success Metrics

### Quantitative
- [ ] Lint errors: 0 (from 1,149)
- [ ] Lint warnings: ≤5 (from 19)
- [ ] Type coverage: 100% (no `any` except shims)
- [ ] Test pass rate: 100%
- [ ] Build time: No increase >10%

### Qualitative
- [ ] Code is more maintainable
- [ ] Type safety prevents bugs
- [ ] UI components are consistent
- [ ] Developer experience improved
- [ ] CI prevents regressions

---

**Status:** Ready for execution  
**Created:** 2026-01-24  
**Estimated Duration:** 8-10 days  
**Owner:** Development Team
