# Multi-Sector Platform Guide

## Overview

X-EAR supports multiple business sectors from a single codebase using an "Additive Gating" strategy. Hearing center functionality is never removed — it's conditionally shown based on the tenant's sector.

## Architecture

```
Tenant (sector: "hearing" | "pharmacy" | "hospital" | "hotel" | "beauty" | "general")
  ↓
Module Registry (which modules are enabled for this sector)
  ↓
Frontend: SectorContext → ModuleGate, Sidebar filtering, Tab gating
Backend:  require_module() → API endpoint gating, FeatureGate sector-awareness
```

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `apps/api/schemas/enums.py` → `SectorCode` | Enum definition |
| `apps/api/core/models/tenant.py` | `sector` column |
| `apps/api/config/module_registry.py` | Module definitions & sector mappings |
| `apps/api/config/sector_terminology.py` | Backend term translations |
| `apps/api/config/role_templates.py` | Default roles per sector |
| `apps/api/config/permission_catalog.py` | Sector-filtered permissions |
| `apps/api/core/features.py` | Sector-aware FeatureGate |
| `apps/api/middleware/require_module.py` | API endpoint module gating |

### Frontend
| File | Purpose |
|------|---------|
| `packages/ui-web/src/config/sectorConfig.ts` | Sector config & module mappings |
| `apps/web/src/contexts/SectorContext.tsx` | React context + `useSector()` hook |
| `apps/web/src/components/common/ModuleGate.tsx` | Conditional rendering by module |
| `apps/web/src/hooks/useSectorTerminology.ts` | Sector-aware i18n hook |
| `apps/web/src/locales/*/sectors/*.json` | Sector terminology overlays |

## How to Add a New Sector

### Step 1: Backend Enum
Add to `apps/api/schemas/enums.py` → `SectorCode`:
```python
class SectorCode(str, Enum):
    ...
    MY_SECTOR = "my_sector"
```

### Step 2: Module Registry
In `apps/api/config/module_registry.py`, add sector-specific modules or update `applicable_sectors` on existing modules.

### Step 3: Frontend Config
In `packages/ui-web/src/config/sectorConfig.ts`, add a new entry to `SECTOR_CONFIGS`.

### Step 4: Terminology
Create `apps/web/src/locales/tr/sectors/my_sector.json` and `en/sectors/my_sector.json`.

Update `apps/web/src/i18n.ts` to import the new files.

Update `apps/api/config/sector_terminology.py` for backend terms.

### Step 5: Role Templates
Add default roles in `apps/api/config/role_templates.py`.

### Step 6: Admin Registry
Add product entry in `apps/admin/src/config/productRegistry.ts`.

### Step 7: Permission Catalog
If the sector has unique permissions, add them to `apps/api/config/permission_catalog.py` and update `_HEARING_ONLY_PREFIXES` if needed.

## Module Gating

### Frontend (React)
```tsx
import { ModuleGate } from '../components/common/ModuleGate';

// Renders children only if 'sgk' module is enabled
<ModuleGate module="sgk">
  <SGKPanel />
</ModuleGate>
```

### Backend (FastAPI)
```python
from middleware.require_module import require_module

# Router-level: all endpoints gated
router = APIRouter(dependencies=[Depends(require_module("sgk"))])

# Or per-endpoint:
@router.get("/sgk/docs")
def list_docs(_module=Depends(require_module("sgk"))):
    ...
```

### Sidebar
Add `requiredModule: 'module_id'` to any `MenuItem` in `Sidebar.tsx`.

### Party Tabs
`PartyTabs.tsx` checks `useSector().isModuleEnabled()` for hearing-specific tabs.

## Terminology

Use `useSectorTerminology()` hook:
```tsx
const { st } = useSectorTerminology();
// st('party') → "Hasta" (hearing) / "Müşteri" (pharmacy) / "Misafir" (hotel)
```

Backend: `get_term(sector, key)` from `config.sector_terminology`.

## Safety Rules

1. **Default = hearing**: If sector is null/unknown, everything defaults to hearing behavior
2. **Env-var overrides win**: `FEATURE_SGK=true` forces SGK on regardless of sector
3. **Backward compatible**: Existing tenants automatically get `sector: 'hearing'`
4. **No data deletion**: Hearing data is never deleted, only hidden via UI/API gating

## Test Checklist (per sector)

- [ ] Login + correct branding
- [ ] Sidebar shows correct items (no hearing-only items for non-hearing)
- [ ] Hidden routes redirect to dashboard
- [ ] Party CRUD works without hearing fields
- [ ] Terminology is correct throughout
- [ ] Hearing modules fully work for hearing sector
- [ ] Permission scope matches sector
