# Operation ID Evidence — Payment Integrations (POS / PayTR)

Source file: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py)

## listPaymentPoPaytrConfig
Decorator and function signature (exact lines):

```py
@router.get("/paytr/config", operation_id="listPaymentPoPaytrConfig", response_model=ResponseEnvelope[PayTRConfigRead])
def get_paytr_config(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## updatePaymentPoPaytrConfig
Decorator and function signature (exact lines):

```py
@router.put("/paytr/config", operation_id="updatePaymentPoPaytrConfig")
def update_paytr_config(
    request_data: PayTRConfigUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## createPaymentPoPaytrInitiate
Decorator and function signature (exact lines):

```py
@router.post("/paytr/initiate", operation_id="createPaymentPoPaytrInitiate", response_model=ResponseEnvelope[PayTRInitiateResponse])
def initiate_paytr_payment(
    request_data: PayTRInitiateRequest,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## createPaymentPoPaytrCallback
Decorator and function signature (exact lines):

```py
@router.post("/paytr/callback", operation_id="createPaymentPoPaytrCallback", response_class=PlainTextResponse)
async def paytr_callback(
    merchant_oid: str = Form(...),
    status: str = Form(...),
    total_amount: Optional[str] = Form(None),
    failed_reason_msg: Optional[str] = Form(None),
    hash: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
```

## listPaymentPoTransactions
Decorator and function signature (exact lines):

```py
@router.get("/transactions", operation_id="listPaymentPoTransactions", response_model=ResponseEnvelope[List[PaymentRecordRead]])
def get_pos_transactions(
    provider: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```
