"""
AI Tools for OCR and Document Processing.

Uses existing TurkishMedicalOCR service for text extraction from images.
"""

import logging
import os
import tempfile
import base64
from typing import Any, Dict

from ai.tools import (
    ToolParameter, ToolCategory, RiskLevel,
    ToolExecutionMode, ToolExecutionResult, register_tool,
)

logger = logging.getLogger(__name__)


@register_tool(
    tool_id="extractTextFromImage",
    name="Extract Text from Image (OCR)",
    description="Extract text from an uploaded image using OCR. Supports medical documents, invoices, prescriptions.",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="image_base64", type="string", description="Base64-encoded image data", required=True),
        ToolParameter(name="document_type", type="string", description="Type of document", required=False,
                      enum=["invoice", "prescription", "receipt", "general"]),
    ],
    returns="Extracted text and structured data",
    requires_approval=False,
    requires_permissions=["documents.view"],
)
def extractTextFromImage(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Extract text from an image using OCR."""
    image_base64 = params.get("image_base64", "")
    doc_type = params.get("document_type", "general")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="extractTextFromImage", success=True, mode=mode,
            simulated_changes={"action": "ocr", "document_type": doc_type},
        )

    if not image_base64:
        return ToolExecutionResult(tool_id="extractTextFromImage", success=False, mode=mode, error="image_base64 is required")

    try:
        # Decode base64 to temp file
        image_data = base64.b64decode(image_base64)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        # Use existing OCR service
        from services.ocr_service import TurkishMedicalOCR
        ocr = TurkishMedicalOCR()
        result = ocr._run_ocr(tmp_path, text=None, auto_crop=True)

        # Cleanup temp file
        os.unlink(tmp_path)

        extracted_text = result.get("text", "") if isinstance(result, dict) else str(result)

        # Try NLP extraction for structured data
        structured = {}
        if doc_type in ("invoice", "prescription", "receipt"):
            try:
                from services.ocr_nlp_service import extract_patient_info_from_text
                structured = extract_patient_info_from_text(extracted_text)
            except Exception:
                pass

        return ToolExecutionResult(
            tool_id="extractTextFromImage", success=True, mode=mode,
            result={
                "extracted_text": extracted_text[:2000],  # Limit output
                "document_type": doc_type,
                "structured_data": structured,
                "confidence": result.get("confidence", 0.0) if isinstance(result, dict) else 0.5,
            },
        )
    except ImportError:
        return ToolExecutionResult(
            tool_id="extractTextFromImage", success=False, mode=mode,
            error="OCR service not available. Install paddleocr or easyocr.",
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="extractTextFromImage", success=False, mode=mode, error=str(e))
