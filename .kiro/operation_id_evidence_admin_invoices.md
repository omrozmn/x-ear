# Operation ID Evidence — Admin Invoices

Source file: [x-ear/apps/api/routers/admin_invoices.py](x-ear/apps/api/routers/admin_invoices.py)

## listAdminInvoices
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminInvoices", response_model=InvoiceListResponse)
async def get_admin_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## createAdminInvoice
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="createAdminInvoice", response_model=InvoiceDetailResponse)
async def create_admin_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## getAdminInvoice
Decorator and function signature (exact lines):

```py
@router.get("/{invoice_id}", operation_id="getAdminInvoice", response_model=InvoiceDetailResponse)
async def get_admin_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## createAdminInvoicePayment
Decorator and function signature (exact lines):

```py
@router.post("/{invoice_id}/payment", operation_id="createAdminInvoicePayment", response_model=InvoiceDetailResponse)
async def record_payment(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## listAdminInvoicePdf
Decorator and function signature (exact lines):

```py
@router.get("/{invoice_id}/pdf", operation_id="listAdminInvoicePdf", response_model=ResponseEnvelope)
async def get_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```
