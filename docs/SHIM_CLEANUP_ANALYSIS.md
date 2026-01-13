# Shim Cleanup Analysis
> Generated: 2026-01-13
> Status: REVIEW_REQUIRED

## 1. Shim Usage Analysis

| Shim File | Importing File | Import Path Used | Status | Risk |
|-----------|----------------|------------------|--------|------|
| `database.py` | `core/dependencies.py` | `from database import get_db` | ❌ **CRITICAL** | HIGH (Core dep on shim) |
| `database.py` | `main.py` | `from database import engine` | ⚠️ Legacy Root | LOW |
| `database.py` | `tests/*` | `from database import ...` | ⚠️ Test Code | LOW |
| `dependencies.py` | `tests/*` | `from dependencies import ...` | ⚠️ Test Code | LOW |
| `models/*.py` | `routers/*.py` | `from models.X import Y` | ⚠️ Router Legacy | MEDIUM |

## 2. Classification & Action Plan

### A. SAFE_TO_REMOVE (0)
*None. All shims are currently active.*

### B. REFACTOR_REQUIRED (Priority)
**1. core/dependencies.py**
- **Issue:** Core module imports from legacy shim `apps/api/database.py`.
- **Fix:** Update to `from core.database import get_db`.
- **Risk:** Low (internal import fix).

**2. main.py**
- **Issue:** Root app imports from shim.
- **Fix:** Update to `from core.database import engine`.

**3. Test Suite**
- **Issue:** Tests rely on legacy paths.
- **Fix:** Batch update tests or keep for strict "shim verification".

### C. TEMPORARY_KEEP (Legacy Routers)
- **Scope:** All files in `docs/LEGACY_EXCEPTIONS.md`.
- **Plan:** Remove only when router is refactored to Service Layer.

## 3. Shim Sunset Enforcement

### Actions Applied:
1.  **Sunset Date:** 2026-04-01 added to all shims.
2.  **Deprecation Warning:** Added execution-time warning.

## 4. Final Checklist
- [ ] Refactor `core/dependencies.py` (Must not depend on shim)
- [ ] Refactor `main.py`
- [ ] Add Sunset Date headers to `database.py` and `dependencies.py` (Doing now)
