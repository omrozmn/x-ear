# Operation ID Evidence — Payments Router

Source: x-ear/apps/api/routers/payments.py

Each entry below includes the exact FastAPI route decorator line and the function signature snippet (2–4 lines) from the source file, proving the implementation of the OpenAPI `operationId`.

---

- operation_id: `createPaymentRecords`

  ```python
  @router.post("/payment-records", operation_id="createPaymentRecords", status_code=201, response_model=ResponseEnvelope[PaymentRecordRead])
  def create_payment_record(
      payment_in: PaymentRecordCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `listPartyPaymentRecords`

  ```python
  @router.get("/parties/{party_id}/payment-records", operation_id="listPartyPaymentRecords", response_model=ResponseEnvelope[List[PaymentRecordRead]])
  def get_party_payment_records(
      party_id: str,
      page: int = Query(1, ge=1),
  ):
  ```

- operation_id: `updatePaymentRecord`

  ```python
  @router.patch("/payment-records/{record_id}", operation_id="updatePaymentRecord", response_model=ResponseEnvelope[PaymentRecordRead])
  def update_payment_record(
      record_id: str,
      payment_in: PaymentRecordUpdate,
  ):
  ```

- operation_id: `listPartyPromissoryNotes`

  ```python
  @router.get("/parties/{party_id}/promissory-notes", operation_id="listPartyPromissoryNotes", response_model=ResponseEnvelope[List[PromissoryNoteRead]])
  def get_party_promissory_notes(
      party_id: str,
      sale_id: Optional[str] = Query(None, alias="sale_id"),
  ):
  ```

- operation_id: `createPromissoryNotes`

  ```python
  @router.post("/promissory-notes", operation_id="createPromissoryNotes", status_code=201, response_model=ResponseEnvelope[List[PromissoryNoteRead]])
  def create_promissory_notes(
      notes_in: PromissoryNotesCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `updatePromissoryNote`

  ```python
  @router.patch("/promissory-notes/{note_id}", operation_id="updatePromissoryNote", response_model=ResponseEnvelope[PromissoryNoteRead])
  def update_promissory_note(
      note_id: str,
      note_in: PromissoryNoteUpdate,
  ):
  ```

- operation_id: `createPromissoryNoteCollect`

  ```python
  @router.post("/promissory-notes/{note_id}/collect", operation_id="createPromissoryNoteCollect", status_code=201, response_model=ResponseEnvelope[PromissoryNoteCollectionResponse])
  def collect_promissory_note(
      note_id: str,
      collect_in: CollectPaymentRequest,
  ):
  ```

- operation_id: `listSalePromissoryNotes`

  ```python
  @router.get("/sales/{sale_id}/promissory-notes", operation_id="listSalePromissoryNotes", response_model=ResponseEnvelope[List[PromissoryNoteRead]])
  def get_sale_promissory_notes(
      sale_id: str,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

---

File reference: [x-ear/apps/api/routers/payments.py](x-ear/apps/api/routers/payments.py)
