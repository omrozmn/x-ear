# Operation ID Evidence — Admin Analytics

Source file: [x-ear/apps/api/routers/admin_analytics.py](x-ear/apps/api/routers/admin_analytics.py)

## getAdminAnalytics
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="getAdminAnalytics", response_model=ResponseEnvelope[AdminAnalyticsData])
@router.get("/overview", operation_id="listAdminAnalyticOverview", response_model=ResponseEnvelope[AdminAnalyticsData])
def get_admin_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## listAdminAnalyticRevenue
Decorator and function signature (exact lines):

```py
@router.get("/revenue", operation_id="listAdminAnalyticRevenue", response_model=ResponseEnvelope[RevenueAnalytics])
def get_revenue_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## listAdminAnalyticUsers
Decorator and function signature (exact lines):

```py
@router.get("/users", operation_id="listAdminAnalyticUsers", response_model=ResponseEnvelope[UserAnalytics])
def get_user_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## listAdminAnalyticTenants
Decorator and function signature (exact lines):

```py
@router.get("/tenants", operation_id="listAdminAnalyticTenants", response_model=ResponseEnvelope[TenantAnalytics])
def get_tenant_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```
