# Operation ID Evidence — Invoices Actions

Source file: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)

## createInvoiceIssue
Decorator and function signature (exact lines):

```py
@router.post("/{invoice_id}/issue", operation_id="createInvoiceIssue", response_model=ResponseEnvelope[InvoiceIssueResponse])
async def issue_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## createInvoiceCopy
Decorator and function signature (exact lines):

```py
@router.post("/{invoice_id}/copy", operation_id="createInvoiceCopy", response_model=ResponseEnvelope[InvoiceRead])
async def copy_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## createInvoiceCopyCancel
Decorator and function signature (exact lines):

```py
@router.post("/{invoice_id}/copy-cancel", operation_id="createInvoiceCopyCancel", response_model=ResponseEnvelope[InvoiceCopyCancelResponse])
async def copy_invoice_cancel(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
```

## listInvoicePdf
Decorator and function signature (exact lines):

```py
@router.get("/{invoice_id}/pdf", operation_id="listInvoicePdf")
async def serve_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
```

## listInvoiceShippingPdf
Decorator and function signature (exact lines):

```py
@router.get("/{invoice_id}/shipping-pdf", operation_id="listInvoiceShippingPdf")
async def serve_shipping_pdf(invoice_id: int, db: Session = Depends(get_db)):
```
