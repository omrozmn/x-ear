# Operation ID Evidence — Invoices

Source file: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)

## listInvoices
Decorator and function signature (exact lines):

```py
@router.get("/invoices", operation_id="listInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
def get_invoices(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    party_id: Optional[str] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## listInvoicePrintQueue
Decorator and function signature (exact lines):

```py
@router.get("/invoices/print-queue", operation_id="listInvoicePrintQueue", response_model=ResponseEnvelope[InvoicePrintQueueResponse])
def get_print_queue(
    access: UnifiedAccess = Depends(require_access("invoices.read")),
    db_session: Session = Depends(get_db)
):
```

## createInvoicePrintQueue
Decorator and function signature (exact lines):

```py
@router.post("/invoices/print-queue", operation_id="createInvoicePrintQueue")
def add_to_print_queue(
    payload: InvoiceAddToQueueRequest,
    access: UnifiedAccess = Depends(require_access("invoices.write")),
    db_session: Session = Depends(get_db)
):
```

## listInvoiceTemplates
Decorator and function signature (exact lines):

```py
@router.get("/invoices/templates", operation_id="listInvoiceTemplates", response_model=ResponseEnvelope[List[InvoiceTemplate]])
def get_invoice_templates(
    access: UnifiedAccess = Depends(require_access("invoices.read"))
):
```

## createInvoiceTemplates
Decorator and function signature (exact lines):

```py
@router.post("/invoices/templates", operation_id="createInvoiceTemplates", response_model=ResponseEnvelope[InvoiceTemplate], status_code=201)
def create_invoice_template(
    template: InvoiceTemplate,
    access: UnifiedAccess = Depends(require_access("invoices.write"))
):
```

## createInvoiceBatchGenerate
Decorator and function signature (exact lines):

```py
@router.post("/invoices/batch-generate", operation_id="createInvoiceBatchGenerate")
def batch_generate_invoices(
    request_data: BatchInvoiceGenerateRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.write"))
):
```

## getInvoice
Decorator and function signature (exact lines):

```py
@router.get("/invoices/{invoice_id}", operation_id="getInvoice", response_model=ResponseEnvelope[InvoiceRead])
def get_invoice(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## createInvoices
Decorator and function signature (exact lines):

```py
@router.post("/invoices", operation_id="createInvoices", response_model=ResponseEnvelope[InvoiceRead], status_code=201)
def create_invoice(
    request_data: InvoiceCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## updateInvoice
Decorator and function signature (exact lines):

```py
@router.put("/invoices/{invoice_id}", operation_id="updateInvoice", response_model=ResponseEnvelope[InvoiceRead])
def update_invoice(
    invoice_id: int,
    request_data: InvoiceUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## deleteInvoice
Decorator and function signature (exact lines):

```py
@router.delete("/invoices/{invoice_id}", operation_id="deleteInvoice", response_model=ResponseEnvelope[None])
def delete_invoice(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## listPartyInvoices
Decorator and function signature (exact lines):

```py
@router.get("/parties/{party_id}/invoices", operation_id="listPartyInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
def get_party_invoices(
    party_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## createInvoiceSendToGib
Decorator and function signature (exact lines):

```py
@router.post("/invoices/{invoice_id}/send-to-gib", operation_id="createInvoiceSendToGib", response_model=ResponseEnvelope[dict])
def send_to_gib(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## createInvoiceBulkUpload
Decorator and function signature (exact lines):

```py
@router.post("/invoices/bulk-upload", operation_id="createInvoiceBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
async def bulk_upload_invoices(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access("invoices.write")),
    db_session: Session = Depends(get_db)
):
```
