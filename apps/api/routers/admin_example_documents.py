"""
Admin Example Documents Router
Manages example documents (contract templates) for SMS integration
"""
import os
import logging
from pathlib import Path
from typing import List, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from schemas.response import ResponseEnvelope
from middleware.unified_access import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/example-documents", tags=["Admin Example Documents"])

# Public documents directory
PUBLIC_DOCS_DIR = Path("../web/public/documents/sms")

# Document types mapping
DOCUMENT_TYPES = {
    "contract": "contract-example.pdf",
    "example": "contract-filled.pdf"
}

# Response models
class ExampleDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    document_type: str
    filename: str
    exists: bool
    url: str


@router.get("", operation_id="listAdminExampleDocuments", response_model=ResponseEnvelope[List[ExampleDocumentRead]])
async def list_example_documents(
    _: Any = Depends(require_admin())
):
    """
    List all example documents with their status
    """
    try:
        documents = []
        
        for doc_type, filename in DOCUMENT_TYPES.items():
            file_path = PUBLIC_DOCS_DIR / filename
            exists = file_path.exists()
            
            documents.append(ExampleDocumentRead(
                document_type=doc_type,
                filename=filename,
                exists=exists,
                url=f"/documents/sms/{filename}"
            ))
        
        return ResponseEnvelope(
            success=True,
            data=documents
        )
    except Exception as e:
        logger.error(f"Failed to list example documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.post("/upload", operation_id="createAdminExampleDocumentUpload", response_model=ResponseEnvelope[ExampleDocumentRead])
async def upload_example_document(
    document_type: str,
    file: UploadFile = File(...),
    _: Any = Depends(require_admin())
):
    """
    Upload an example document (contract template)
    """
    try:
        # Validate document type
        if document_type not in DOCUMENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Must be one of: {', '.join(DOCUMENT_TYPES.keys())}"
            )
        
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Get target filename
        target_filename = DOCUMENT_TYPES[document_type]
        
        # Ensure directory exists
        PUBLIC_DOCS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = PUBLIC_DOCS_DIR / target_filename
        
        # Read and write file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Uploaded example document: {document_type} -> {target_filename}")
        
        return ResponseEnvelope(
            success=True,
            data=ExampleDocumentRead(
                document_type=document_type,
                filename=target_filename,
                exists=True,
                url=f"/documents/sms/{target_filename}"
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload example document: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")


@router.delete("/{document_type}", operation_id="deleteAdminExampleDocument", response_model=ResponseEnvelope)
async def delete_example_document(
    document_type: str,
    _: Any = Depends(require_admin())
):
    """
    Delete an example document
    """
    try:
        # Validate document type
        if document_type not in DOCUMENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Must be one of: {', '.join(DOCUMENT_TYPES.keys())}"
            )
        
        # Get target filename
        target_filename = DOCUMENT_TYPES[document_type]
        file_path = PUBLIC_DOCS_DIR / target_filename
        
        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file
        file_path.unlink()
        
        logger.info(f"Deleted example document: {document_type} -> {target_filename}")
        
        return ResponseEnvelope(
            success=True,
            data={"message": "Document deleted successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete example document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/{document_type}/download", operation_id="getAdminExampleDocumentDownload", response_class=FileResponse)
async def download_example_document(
    document_type: str,
    _: Any = Depends(require_admin())
):
    """
    Download an example document
    """
    try:
        # Validate document type
        if document_type not in DOCUMENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Must be one of: {', '.join(DOCUMENT_TYPES.keys())}"
            )
        
        # Get target filename
        target_filename = DOCUMENT_TYPES[document_type]
        file_path = PUBLIC_DOCS_DIR / target_filename
        
        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        return FileResponse(
            path=str(file_path),
            filename=target_filename,
            media_type="application/pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download example document: {e}")
        raise HTTPException(status_code=500, detail="Failed to download document")
