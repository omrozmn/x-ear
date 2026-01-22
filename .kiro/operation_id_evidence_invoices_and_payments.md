# OperationId Evidence — Invoices & Payment Integrations

Files processed:
- [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
- [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
- [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)

Each entry below contains the router decorator line and the start of the function signature (exact snippet copied from the file).

---

## Invoices Router (`x-ear/apps/api/routers/invoices.py`)

- **listInvoices**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.get("/invoices", operation_id="listInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
    def get_invoices(
        page: int = 1,
    ```

- **listInvoicePrintQueue**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.get("/invoices/print-queue", operation_id="listInvoicePrintQueue", response_model=ResponseEnvelope[InvoicePrintQueueResponse])
    def get_print_queue(
        access: UnifiedAccess = Depends(require_access("invoices.read")),
    ```

- **createInvoicePrintQueue**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices/print-queue", operation_id="createInvoicePrintQueue")
    def add_to_print_queue(
        payload: InvoiceAddToQueueRequest,
    ```

- **listInvoiceTemplates**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.get("/invoices/templates", operation_id="listInvoiceTemplates", response_model=ResponseEnvelope[List[InvoiceTemplate]])
    def get_invoice_templates(
        access: UnifiedAccess = Depends(require_access("invoices.read"))
    ```

- **createInvoiceTemplates**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices/templates", operation_id="createInvoiceTemplates", response_model=ResponseEnvelope[InvoiceTemplate], status_code=201)
    def create_invoice_template(
        template: InvoiceTemplate,
    ```

- **createInvoiceBatchGenerate**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices/batch-generate", operation_id="createInvoiceBatchGenerate")
    def batch_generate_invoices(
        request_data: BatchInvoiceGenerateRequest,
    ```

- **getInvoice**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.get("/invoices/{invoice_id}", operation_id="getInvoice", response_model=ResponseEnvelope[InvoiceRead])
    def get_invoice(
        invoice_id: int,
    ```

- **createInvoices**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices", operation_id="createInvoices", response_model=ResponseEnvelope[InvoiceRead], status_code=201)
    def create_invoice(
        request_data: InvoiceCreate,
    ```

- **updateInvoice**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.put("/invoices/{invoice_id}", operation_id="updateInvoice", response_model=ResponseEnvelope[InvoiceRead])
    def update_invoice(
        invoice_id: int,
    ```

- **deleteInvoice**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.delete("/invoices/{invoice_id}", operation_id="deleteInvoice", response_model=ResponseEnvelope[None])
    def delete_invoice(
        invoice_id: int,
    ```

- **listPartyInvoices**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.get("/parties/{party_id}/invoices", operation_id="listPartyInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
    def get_party_invoices(
        party_id: str,
    ```

- **createInvoiceSendToGib**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices/{invoice_id}/send-to-gib", operation_id="createInvoiceSendToGib", response_model=ResponseEnvelope[dict])
    def send_to_gib(
        invoice_id: int,
    ```

- **createInvoiceBulkUpload**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py)
  - Snippet:
    ```py
    @router.post("/invoices/bulk-upload", operation_id="createInvoiceBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
    async def bulk_upload_invoices(
        file: UploadFile = File(...),
    ```

---

## Invoice Actions Router (`x-ear/apps/api/routers/invoices_actions.py`)

- **createInvoiceIssue**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
  - Snippet:
    ```py
    @router.post("/{invoice_id}/issue", operation_id="createInvoiceIssue", response_model=ResponseEnvelope[InvoiceIssueResponse])
    async def issue_invoice(
        invoice_id: int,
    ```

- **createInvoiceCopy**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
  - Snippet:
    ```py
    @router.post("/{invoice_id}/copy", operation_id="createInvoiceCopy", response_model=ResponseEnvelope[InvoiceRead])
    async def copy_invoice(
        invoice_id: int,
    ```

- **createInvoiceCopyCancel**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
  - Snippet:
    ```py
    @router.post("/{invoice_id}/copy-cancel", operation_id="createInvoiceCopyCancel", response_model=ResponseEnvelope[InvoiceCopyCancelResponse])
    async def copy_invoice_cancel(
        invoice_id: int,
    ```

- **listInvoicePdf**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
  - Snippet:
    ```py
    @router.get("/{invoice_id}/pdf", operation_id="listInvoicePdf")
    async def serve_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    ```

- **listInvoiceShippingPdf**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py)
  - Snippet:
    ```py
    @router.get("/{invoice_id}/shipping-pdf", operation_id="listInvoiceShippingPdf")
    async def serve_shipping_pdf(invoice_id: int, db: Session = Depends(get_db)):
    ```

---

## Payment Integrations Router (`x-ear/apps/api/routers/payment_integrations.py`)

- **listPaymentPoPaytrConfig**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)
  - Snippet:
    ```py
    @router.get("/paytr/config", operation_id="listPaymentPoPaytrConfig", response_model=ResponseEnvelope[PayTRConfigRead])
    def get_paytr_config(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **updatePaymentPoPaytrConfig**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)
  - Snippet:
    ```py
    @router.put("/paytr/config", operation_id="updatePaymentPoPaytrConfig")
    def update_paytr_config(
        request_data: PayTRConfigUpdate,
    ```

- **createPaymentPoPaytrInitiate**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)
  - Snippet:
    ```py
    @router.post("/paytr/initiate", operation_id="createPaymentPoPaytrInitiate", response_model=ResponseEnvelope[PayTRInitiateResponse])
    def initiate_paytr_payment(
        request_data: PayTRInitiateRequest,
    ```

- **createPaymentPoPaytrCallback**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)
  - Snippet:
    ```py
    @router.post("/paytr/callback", operation_id="createPaymentPoPaytrCallback", response_class=PlainTextResponse)
    async def paytr_callback(
        merchant_oid: str = Form(...),
    ```

- **listPaymentPoTransactions**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)
  - Snippet:
    ```py
    @router.get("/transactions", operation_id="listPaymentPoTransactions", response_model=ResponseEnvelope[List[PaymentRecordRead]])
    def get_pos_transactions(
        provider: Optional[str] = None,
    ```

---

Next steps: I'll continue with the next router batch (sales, parties, inventory) and append their operationId evidence to a consolidated evidence file. If you prefer a single consolidated file instead of per-router files, I can merge these into `x-ear/.kiro/operation_id_evidence.md` on the next pass.
