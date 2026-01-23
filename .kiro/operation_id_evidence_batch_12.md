## x-ear/apps/api/routers/documents.py

- Source: [x-ear/apps/api/routers/documents.py](x-ear/apps/api/routers/documents.py)

### Evidence snippets

```py
@router.get("/parties/{party_id}/documents", operation_id="listPatientDocuments", response_model=ResponseEnvelope[List[DocumentRead]])
def get_patient_documents(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

```py
@router.post("/parties/{party_id}/documents", operation_id="createPatientDocuments", status_code=201, response_model=ResponseEnvelope[DocumentRead])
def add_patient_document(
    party_id: str,
    request_data: DocumentCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

```py
@router.get("/parties/{party_id}/documents/{document_id}", operation_id="getPatientDocument")
def get_patient_document(
    party_id: str,
    document_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

```py
@router.delete("/parties/{party_id}/documents/{document_id}", operation_id="deletePatientDocument")
def delete_patient_document(
    party_id: str,
    document_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```
