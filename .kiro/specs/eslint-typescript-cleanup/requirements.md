# ESLint & TypeScript Error Cleanup - Requirements

## 1. Overview

This spec addresses the systematic cleanup of ESLint and TypeScript errors across the entire X-Ear CRM project. The codebase currently has **1,680 ESLint errors** (1,172 in web app + 508 in admin app) and needs TypeScript type checking improvements.

## 2. Problem Statement

The project has accumulated significant technical debt in the form of:
- Extensive use of `any` types (violates type safety)
- Unused variables and imports
- Raw HTML elements instead of UI library components
- Direct axios imports bypassing the API client
- Deep imports from generated API code
- Inconsistent use of `@ts-ignore` vs `@ts-expect-error`
- Missing type definitions

This technical debt:
- Reduces code quality and maintainability
- Increases bug risk
- Violates project architecture rules
- Makes refactoring dangerous
- Slows down development

## 3. User Stories

### 3.1 As a Developer
**I want** all ESLint errors to be fixed
**So that** I can trust the linting system to catch real issues

**Acceptance Criteria:**
- ESLint runs with 0 errors in both web and admin apps
- All warnings are reviewed and either fixed or explicitly suppressed with justification
- CI/CD pipeline enforces zero ESLint errors

### 3.2 As a Developer
**I want** proper TypeScript types throughout the codebase
**So that** I get accurate IDE autocomplete and catch type errors at compile time

**Acceptance Criteria:**
- No use of `any` type except where explicitly justified
- All function parameters and return types are properly typed
- TypeScript strict mode passes without errors
- Generic types are used appropriately

### 3.3 As a Developer
**I want** consistent use of UI components
**So that** the application has a uniform look and feel

**Acceptance Criteria:**
- All raw HTML form elements (`<input>`, `<select>`, `<textarea>`, `<button>`) are replaced with UI library components
- Only intentional raw elements have `data-allow-raw="true"` attribute
- Component usage follows project standards

### 3.4 As a Developer
**I want** proper API client usage
**So that** all API calls go through the centralized client with proper error handling

**Acceptance Criteria:**
- No direct axios imports
- All API calls use Orval-generated hooks or apiClient
- No deep imports from generated API code
- Adapter layer is used for API access

## 4. Functional Requirements

### 4.1 Type Safety (Priority: CRITICAL)
- **FR-4.1.1**: Replace all `any` types with proper types
- **FR-4.1.2**: Add explicit return types to all functions
- **FR-4.1.3**: Type all function parameters
- **FR-4.1.4**: Use proper generic types for collections
- **FR-4.1.5**: Define interfaces for complex objects

### 4.2 Code Cleanliness (Priority: HIGH)
- **FR-4.2.1**: Remove all unused imports
- **FR-4.2.2**: Remove all unused variables
- **FR-4.2.3**: Remove all unused functions
- **FR-4.2.4**: Fix all unused eslint-disable directives

### 4.3 Component Usage (Priority: HIGH)
- **FR-4.3.1**: Replace raw `<input>` with `Input` component from `@x-ear/ui-web`
- **FR-4.3.2**: Replace raw `<select>` with `Select` component
- **FR-4.3.3**: Replace raw `<textarea>` with `Textarea` component
- **FR-4.3.4**: Replace raw `<button>` with `Button` component
- **FR-4.3.5**: Add `data-allow-raw="true"` to intentional raw elements

### 4.4 API Client Usage (Priority: CRITICAL)
- **FR-4.4.1**: Remove all direct axios imports
- **FR-4.4.2**: Replace axios calls with Orval hooks or apiClient
- **FR-4.4.3**: Fix deep imports from generated API code
- **FR-4.4.4**: Use adapter layer for API access

### 4.5 TypeScript Directives (Priority: MEDIUM)
- **FR-4.5.1**: Replace `@ts-ignore` with `@ts-expect-error`
- **FR-4.5.2**: Add comments explaining why type assertions are needed
- **FR-4.5.3**: Remove unnecessary type assertions

### 4.6 React Best Practices (Priority: MEDIUM)
- **FR-4.6.1**: Fix fast-refresh warnings by separating components from constants
- **FR-4.6.2**: Ensure proper component export patterns
- **FR-4.6.3**: Fix case block declarations

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-5.1.1**: Cleanup should not impact runtime performance
- **NFR-5.1.2**: Build time should not increase significantly

### 5.2 Maintainability
- **NFR-5.2.1**: Code should be more maintainable after cleanup
- **NFR-5.2.2**: Type definitions should be reusable
- **NFR-5.2.3**: Follow project architecture rules

### 5.3 Testing
- **NFR-5.3.1**: All existing tests must pass after cleanup
- **NFR-5.3.2**: No functional changes should be introduced
- **NFR-5.3.3**: Type safety improvements should catch potential bugs

## 6. Error Categories

### 6.1 Web App (1,172 errors)
- **@typescript-eslint/no-explicit-any**: ~600 errors
- **no-restricted-syntax** (raw HTML elements): ~200 errors
- **@typescript-eslint/no-unused-vars**: ~150 errors
- **no-restricted-imports** (axios, deep imports): ~50 errors
- **react-refresh/only-export-components**: ~12 warnings
- **@typescript-eslint/ban-ts-comment**: ~10 errors
- **@typescript-eslint/ban-types**: ~5 errors
- **no-case-declarations**: ~3 errors
- **Other**: ~142 errors

### 6.2 Admin App (508 errors)
- **@typescript-eslint/no-explicit-any**: ~350 errors
- **@typescript-eslint/no-unused-vars**: ~80 errors
- **@typescript-eslint/ban-ts-comment**: ~15 errors
- **no-restricted-imports** (axios): ~5 errors
- **Other**: ~58 errors

## 7. Constraints

### 7.1 Technical Constraints
- Must maintain backward compatibility
- Cannot change API contracts
- Must preserve existing functionality
- Cannot introduce breaking changes

### 7.2 Process Constraints
- Changes must be reviewable (not too large)
- Must be done incrementally
- Must not block other development
- Must maintain CI/CD pipeline

## 8. Dependencies

### 8.1 Internal Dependencies
- UI component library (`@x-ear/ui-web`)
- API client (`apiClient`)
- Orval-generated types and hooks
- Project architecture rules

### 8.2 External Dependencies
- ESLint configuration
- TypeScript configuration
- React and React DOM
- Vite build system

## 9. Success Criteria

### 9.1 Quantitative Metrics
- ESLint errors: 1,680 → 0
- TypeScript errors: TBD → 0
- `any` type usage: ~950 → <50 (justified cases only)
- Raw HTML elements: ~200 → 0 (or explicitly allowed)
- Direct axios imports: ~55 → 0

### 9.2 Qualitative Metrics
- Code is more maintainable
- IDE autocomplete works better
- Type errors are caught at compile time
- Code follows project standards
- CI/CD pipeline is green

## 10. Out of Scope

- Refactoring business logic
- Adding new features
- Changing API contracts
- Updating dependencies
- Performance optimizations (unless directly related to cleanup)
- UI/UX changes

## 11. Risks and Mitigations

### 11.1 Risk: Breaking Changes
**Mitigation**: 
- Comprehensive testing after each change
- Incremental approach
- Code review process

### 11.2 Risk: Large Scope
**Mitigation**:
- Break into smaller tasks
- Prioritize critical issues
- Use automated tools where possible

### 11.3 Risk: Merge Conflicts
**Mitigation**:
- Coordinate with team
- Work on isolated areas
- Frequent merges

## 12. Approval

This requirements document must be approved before proceeding to design phase.

**Stakeholders:**
- Development Team Lead
- Tech Lead
- QA Lead

**Approval Date:** _____________

**Approved By:** _____________
