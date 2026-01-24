# Lint Error Elimination - Requirements

## 1. Overview

X-Ear web app currently has **1,168 lint problems** (1,149 errors, 19 warnings) that need to be systematically categorized and fixed. This spec defines the requirements for eliminating all lint errors while maintaining code quality and type safety.

## 2. Problem Statement

The codebase has accumulated significant technical debt in the form of:
- TypeScript `any` types (majority of errors)
- Raw HTML elements instead of UI library components
- Unused variables and imports
- React Fast Refresh violations
- Deep imports from generated API code
- Lexical declarations in case blocks

These errors violate project rules and create maintenance burden.

## 3. User Stories

### 3.1 As a Developer
**I want** all lint errors categorized and prioritized
**So that** I can understand the scope and plan fixes systematically

**Acceptance Criteria:**
- All 1,168 lint problems are categorized by type
- Each category has a count and severity level
- Categories are prioritized by impact and effort

### 3.2 As a Tech Lead
**I want** a phased fix plan with clear milestones
**So that** we can track progress and avoid breaking changes

**Acceptance Criteria:**
- Fix plan is divided into phases (Critical, High, Medium, Low)
- Each phase has specific tasks and success criteria
- Phases can be executed independently without blocking development

### 3.3 As a Code Reviewer
**I want** automated checks to prevent new lint errors
**So that** we don't regress after cleanup

**Acceptance Criteria:**
- CI pipeline fails on new lint errors
- Pre-commit hooks catch common violations
- ESLint rules are properly configured

## 4. Functional Requirements

### 4.1 Error Categorization

**FR-1.1:** System MUST categorize all lint errors into the following types:
- `@typescript-eslint/no-explicit-any` - TypeScript any usage
- `no-restricted-syntax` - Raw HTML elements (input, button, select, textarea)
- `@typescript-eslint/no-unused-vars` - Unused variables/imports
- `react-refresh/only-export-components` - Fast Refresh violations
- `no-restricted-imports` - Deep imports from generated API
- `@typescript-eslint/ban-types` - Banned types (e.g., `{}`)
- `@typescript-eslint/ban-ts-comment` - @ts-ignore usage
- `no-case-declarations` - Lexical declarations in case blocks
- Other miscellaneous errors

**FR-1.2:** Each category MUST have:
- Total count of occurrences
- List of affected files
- Severity level (Critical, High, Medium, Low)
- Estimated effort (hours)

### 4.2 Fix Strategy

**FR-2.1:** Fixes MUST follow project architecture rules:
- Use proper TypeScript types (no `any`)
- Use UI library components from `@x-ear/ui-web`
- Remove unused code
- Fix import paths to use barrel exports
- Follow React best practices

**FR-2.2:** Fixes MUST NOT:
- Break existing functionality
- Change public API contracts
- Introduce new dependencies without approval
- Use `@ts-ignore` or `@ts-expect-error` as workarounds

### 4.3 Phased Execution

**FR-3.1:** Phase 1 (Critical) - Type Safety
- Fix all `@typescript-eslint/no-explicit-any` errors
- Fix `@typescript-eslint/ban-types` errors
- Estimated: 400+ errors

**FR-3.2:** Phase 2 (High) - Component Standards
- Replace raw HTML elements with UI components
- Fix `no-restricted-syntax` errors
- Estimated: 200+ errors

**FR-3.3:** Phase 3 (Medium) - Code Cleanup
- Remove unused variables and imports
- Fix Fast Refresh violations
- Fix deep import violations
- Estimated: 400+ errors

**FR-3.4:** Phase 4 (Low) - Polish
- Fix remaining miscellaneous errors
- Update ESLint configuration
- Add pre-commit hooks
- Estimated: 100+ errors

## 5. Non-Functional Requirements

### 5.1 Performance
**NFR-1:** Lint execution time MUST NOT increase by more than 10%

### 5.2 Maintainability
**NFR-2:** All fixes MUST include inline comments explaining complex type definitions

### 5.3 Testing
**NFR-3:** All fixed files MUST pass existing unit/integration tests
**NFR-4:** Type changes MUST be validated with `tsc --noEmit`

### 5.4 Documentation
**NFR-5:** Fix plan MUST document patterns for common error types
**NFR-6:** README MUST be updated with lint guidelines

## 6. Constraints

### 6.1 Technical Constraints
- Cannot modify generated API code in `src/api/generated/`
- Must maintain backward compatibility with existing components
- Must follow existing project structure

### 6.2 Resource Constraints
- Fixes should be completed in 4 phases over 2-3 weeks
- Each phase should take 1-2 days of focused work

### 6.3 Dependency Constraints
- Cannot upgrade major versions of ESLint or TypeScript
- Must use existing UI library components

## 7. Success Metrics

### 7.1 Primary Metrics
- **Lint Error Count:** 0 errors (from 1,149)
- **Lint Warning Count:** ≤ 5 warnings (from 19)
- **Type Coverage:** 100% (no `any` types except in `.d.ts` shims)

### 7.2 Secondary Metrics
- **CI Build Time:** No increase > 10%
- **Test Pass Rate:** 100% (no regressions)
- **Code Review Time:** < 30 min per phase PR

## 8. Out of Scope

The following are explicitly OUT OF SCOPE for this spec:
- Refactoring component logic or business rules
- Adding new features or functionality
- Upgrading dependencies (ESLint, TypeScript, React)
- Fixing runtime bugs (unless caused by type errors)
- Performance optimizations
- UI/UX improvements

## 9. Dependencies

### 9.1 Internal Dependencies
- UI library (`@x-ear/ui-web`) must have all required components
- Generated API types must be up-to-date
- Existing test suite must be passing

### 9.2 External Dependencies
- ESLint configuration
- TypeScript compiler
- React Fast Refresh

## 10. Risks and Mitigations

### 10.1 Risk: Breaking Changes
**Mitigation:** 
- Run full test suite after each phase
- Use TypeScript strict mode to catch type errors
- Review changes in staging environment

### 10.2 Risk: Merge Conflicts
**Mitigation:**
- Complete each phase quickly (1-2 days)
- Coordinate with team on active development areas
- Use feature flags for risky changes

### 10.3 Risk: Type Definition Complexity
**Mitigation:**
- Start with simple cases (primitives, known types)
- Document complex type patterns
- Ask for help on ambiguous cases

## 11. Acceptance Criteria (Overall)

The requirements are considered complete when:

1. ✅ All 1,168 lint problems are categorized by type
2. ✅ A phased fix plan is documented with tasks
3. ✅ Each phase has clear success criteria
4. ✅ Risk mitigation strategies are defined
5. ✅ Success metrics are measurable
6. ✅ Out of scope items are clearly listed
7. ✅ Dependencies and constraints are documented

---

**Status:** Draft  
**Created:** 2026-01-24  
**Last Updated:** 2026-01-24  
**Owner:** Development Team
