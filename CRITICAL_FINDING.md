# 🔴 CRITICAL FINDING - Backend Schema Bug

## Problem
Backend router (`admin_plans.py`) `request_data.slug` kullanıyor ama `PlanCreate` schema'sında `slug` field'ı YOK!

## Root Cause
```python
# Router (admin_plans.py line 75)
slug=request_data.slug or Plan.generate_slug(request_data.name)

# Schema (plans.py) - slug field YOK!
class PlanBase(AppBaseModel):
    name: str
    description: Optional[str]
    # slug: MISSING!
```

## Impact
- Plan creation ALWAYS fails with: `'PlanCreate' object has no attribute 'slug'`
- This breaks the entire provisioning chain
- ~150+ tests fail due to null PLAN_ID → null TN_ID → null TENANT_TOKEN

## Fix Applied
Added `slug` field to `PlanBase` schema:
```python
slug: Optional[str] = Field(None, description="Plan slug (auto-generated if not provided)")
```

## Next Step
**BACKEND MUST BE RESTARTED** to load the new schema!

## Test Command
```bash
curl -X POST "http://localhost:5003/api/admin/plans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test" \
  -H "X-Effective-Tenant-Id: system" \
  -d '{"name":"Test","planType":"BASIC","price":100,"billingInterval":"YEARLY","maxUsers":10,"isActive":true,"isPublic":true}'
```

Expected: 200 OK with plan.id
Actual (before restart): 400 "'PlanCreate' object has no attribute 'slug'"
