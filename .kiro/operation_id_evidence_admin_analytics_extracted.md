# operation_id evidence — admin_analytics.py (extracted)

Exact decorator lines and following 2–4 lines of the implementing function for each `operation_id` found in `admin_analytics.py`.

---

**operation_id:** `getAdminAnalytics`

```python
@router.get("", operation_id="getAdminAnalytics", response_model=ResponseEnvelope[AdminAnalyticsData])
@router.get("/overview", operation_id="listAdminAnalyticOverview", response_model=ResponseEnvelope[AdminAnalyticsData])
def get_admin_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

---

**operation_id:** `listAdminAnalyticOverview`

```python
@router.get("/overview", operation_id="listAdminAnalyticOverview", response_model=ResponseEnvelope[AdminAnalyticsData])
def get_admin_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

---

**operation_id:** `listAdminAnalyticRevenue`

```python
@router.get("/revenue", operation_id="listAdminAnalyticRevenue", response_model=ResponseEnvelope[RevenueAnalytics])
def get_revenue_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

---

**operation_id:** `listAdminAnalyticUsers`

```python
@router.get("/users", operation_id="listAdminAnalyticUsers", response_model=ResponseEnvelope[UserAnalytics])
def get_user_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

---

**operation_id:** `listAdminAnalyticTenants`

```python
@router.get("/tenants", operation_id="listAdminAnalyticTenants", response_model=ResponseEnvelope[TenantAnalytics])
def get_tenant_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```
