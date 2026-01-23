# OperationId Evidence — Admin Routers (batch 3)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from `admin_integrations.py`, `admin_marketplaces.py`, `admin_campaigns.py`, and `admin_plans.py`.

-- `admin_integrations.py` --
```
router = APIRouter(prefix="/admin/integrations", tags=["Admin Integrations"])

@router.get("", operation_id="listAdminIntegrations", response_model=IntegrationListResponse)
async def get_integrations(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/init-db", operation_id="createAdminIntegrationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("/vatan-sms/config", operation_id="listAdminIntegrationVatanSmConfig", response_model=IntegrationDetailResponse)
async def get_vatan_sms_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
):
```

```
@router.put("/vatan-sms/config", operation_id="updateAdminIntegrationVatanSmConfig", response_model=ResponseEnvelope)
async def update_vatan_sms_config(
    data: VatanSmsConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.manage", admin_only=True))
):
```

```
@router.get("/birfatura/config", operation_id="listAdminIntegrationBirfaturaConfig", response_model=IntegrationDetailResponse)
async def get_birfatura_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
):
```

```
@router.put("/birfatura/config", operation_id="updateAdminIntegrationBirfaturaConfig", response_model=ResponseEnvelope)
async def update_birfatura_config(
    data: BirfaturaConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.manage", admin_only=True))
):
```

-- `admin_marketplaces.py` --
```
router = APIRouter(prefix="/api/admin/marketplaces", tags=["Admin Marketplaces"])

@router.post("/init-db", operation_id="createAdminMarketplaceInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("/integrations", operation_id="listAdminMarketplaceIntegrations", response_model=MarketplaceListResponse)
async def get_integrations(
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.read", admin_only=True))
):
```

```
@router.post("/integrations", operation_id="createAdminMarketplaceIntegrations", response_model=MarketplaceDetailResponse)
async def create_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.manage", admin_only=True))
):
```

```
@router.post("/integrations/{integration_id}/sync", operation_id="createAdminMarketplaceIntegrationSync", response_model=ResponseEnvelope)
async def sync_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.manage", admin_only=True))
):
```

-- `admin_campaigns.py` --
```
router = APIRouter(prefix="/api/admin/campaigns", tags=["Admin-Campaigns"])

@router.get("", response_model=CampaignListResponse, operation_id="adminGetCampaigns")
async def get_campaigns(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.read", admin_only=True))
):
```

```
@router.post("", response_model=CampaignDetailResponse, operation_id="adminCreateCampaign")
async def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
```

```
@router.get("/{campaign_id}", response_model=CampaignDetailResponse, operation_id="getAdminCampaign")
async def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.read", admin_only=True))
):
```

```
@router.put("/{campaign_id}", response_model=CampaignDetailResponse, operation_id="updateAdminCampaign")
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
```

```
@router.delete("/{campaign_id}", response_model=ResponseEnvelope, operation_id="deleteAdminCampaign")
async def delete_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
```

-- `admin_plans.py` --
```
router = APIRouter(prefix="/admin/plans", tags=["Admin Plans"])

@router.get("", operation_id="listAdminPlans", response_model=PlanListResponse)
def list_plans(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    is_public: Optional[str] = Query(None),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("", operation_id="createAdminPlan", response_model=PlanDetailResponse)
def create_plan(
    request_data: PlanCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/{plan_id}", operation_id="getAdminPlan", response_model=PlanDetailResponse)
def get_plan(
    plan_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/{plan_id}", operation_id="updateAdminPlan", response_model=PlanDetailResponse)
def update_plan(
    plan_id: str,
    request_data: PlanUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.delete("/{plan_id}", operation_id="deleteAdminPlan", response_model=ResponseEnvelope)
def delete_plan(
    plan_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

Batch-3 complete: added `operation_id_evidence_admin_batch3.md` with verbatim decorator+signature snippets.
