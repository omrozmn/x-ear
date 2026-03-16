"""
FastAPI OCR Router - Migrated from Flask routes/ocr.py
Handles OCR processing, NLP entity extraction, and document analysis
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from typing import Optional, List
from datetime import datetime, timezone
import ipaddress
import logging
import os
import socket
import uuid
import urllib.parse

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access
from schemas.ocr import (
    OcrJobRead, OcrProcessRequest, SimilarityRequest, EntityExtractionRequest,
    PatientExtractionRequest, DebugNERRequest, CreateJobRequest,
    OcrHealthResponse, OcrInitResponse, OcrProcessResponse, OcrSimilarityResponse,
    OcrEntitiesResponse, OcrPatientResponse, OcrDebugResponse,
    AudiogramThresholdResponse, AudiogramDetectionDetails,
)
from utils.file_validation import validate_upload_mime
from utils.temp_file import secure_temp_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# User-facing error messages (never expose internal details)
ERR_OCR_UNAVAILABLE = "OCR servisi su anda kullanilamiyor. Lutfen daha sonra tekrar deneyin."
ERR_OCR_INIT_FAILED = "OCR servisi baslatilirken hata olustu."
ERR_PROCESSING = "Belge isleme sirasinda hata olustu. Lutfen tekrar deneyin."
ERR_INVALID_INPUT = "Gorsel yolu veya metin saglanmadi."
ERR_DOWNLOAD_FAILED = "Gorsel indirilemedi. Lutfen URL'yi kontrol edin."
ERR_TABULAR_PARSE = "Tablo verisi ayristirilamadi. Lutfen dosya formatini kontrol edin."
ERR_AUDIOGRAM = "Odyogram isleme sirasinda hata olustu."

# SSRF protection: blocked IP ranges
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fd00::/8"),
    ipaddress.ip_network("fe80::/10"),
]

MAX_DOWNLOAD_SIZE = 20 * 1024 * 1024  # 20 MB


# --- Helper Functions ---

def _get_ocr_service():
    """Get initialized NLP/OCR service instance. Raises HTTPException on failure."""
    try:
        from services.ocr_service import get_nlp_service as _get_nlp_service
        svc = _get_nlp_service()
    except Exception as e:
        logger.error(f"Failed to get NLP service: {e}")
        svc = None

    if not svc:
        raise HTTPException(status_code=503, detail=ERR_OCR_UNAVAILABLE)

    if not svc.initialized:
        try:
            svc.initialize()
        except Exception as e:
            logger.exception("OCR service initialization failed")
            raise HTTPException(status_code=503, detail=ERR_OCR_INIT_FAILED)

    return svc


def _validate_url_ssrf(url: str) -> None:
    """Validate URL against SSRF attacks by checking resolved IPs."""
    parsed = urllib.parse.urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Sadece HTTP/HTTPS URL desteklenmektedir.")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Gecersiz URL.")

    try:
        addr_infos = socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="URL cozumlenemedi.")

    for family, _, _, _, sockaddr in addr_infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if any(ip in network for network in _BLOCKED_NETWORKS):
            logger.warning(f"SSRF attempt blocked: {url} resolved to {ip}")
            raise HTTPException(status_code=400, detail="Bu URL'ye erisim engellenmistir.")


def download_image_from_url(url: str, dest_path: str) -> None:
    """Download image from URL to dest_path with SSRF protection and size limit."""
    import requests

    _validate_url_ssrf(url)

    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()

    downloaded = 0
    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            downloaded += len(chunk)
            if downloaded > MAX_DOWNLOAD_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Dosya boyutu cok buyuk (max {MAX_DOWNLOAD_SIZE // (1024 * 1024)} MB).",
                )
            f.write(chunk)


# --- Routes ---

@router.post("/upload", operation_id="uploadOcrDocument", response_model=ResponseEnvelope[OcrProcessResponse])
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "medical",
    auto_crop: bool = True,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Upload and process a document (PDF/Image) for OCR"""
    content = await file.read()

    # Validate MIME type via magic bytes
    validated_mime = validate_upload_mime(content, file.filename)
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".tmp"

    with secure_temp_file(suffix=file_ext, prefix="ocr_upload_") as temp_file_path:
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)

        # Tabular data handling
        if file_ext in (".csv", ".xls", ".xlsx"):
            return _process_tabular_upload(temp_file_path, file_ext, file.filename)

        # OCR processing
        try:
            svc = _get_ocr_service()

            result = svc.process_document(
                image_path=temp_file_path,
                doc_type=doc_type,
                auto_crop=auto_crop,
            )

            try:
                patient_info = svc.extract_patient_name(image_path=temp_file_path)
                result["patient_info"] = patient_info
            except Exception:
                result["patient_info"] = None

            return ResponseEnvelope(data=OcrProcessResponse(
                result=result,
                timestamp=datetime.now(timezone.utc).isoformat(),
            ))

        except HTTPException:
            raise
        except Exception:
            logger.exception("OCR Upload error")
            raise HTTPException(status_code=500, detail=ERR_PROCESSING)


def _process_tabular_upload(temp_file_path: str, file_ext: str, filename: str | None):
    """Process CSV/Excel uploads separately."""
    import pandas as pd
    import json

    try:
        if file_ext == ".csv":
            df = pd.read_csv(temp_file_path)
        else:
            df = pd.read_excel(temp_file_path)

        records = df.head(5).to_dict(orient="records")
        extracted_text = (
            f"Tabular Data from {filename} (showing up to 5 rows). "
            f"Total rows: {len(df)}.\n"
            + json.dumps(records, ensure_ascii=False, indent=2)
        )

        result = {
            "text": extracted_text,
            "entities": [],
            "classification": {"type": "tabular_data", "confidence": 1.0},
            "patient_info": None,
        }

        return ResponseEnvelope(data=OcrProcessResponse(
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
    except Exception:
        logger.exception("Failed to parse tabular data")
        raise HTTPException(status_code=400, detail=ERR_TABULAR_PARSE)


@router.get("/health", operation_id="listOcrHealth", response_model=ResponseEnvelope[OcrHealthResponse])
def health_check():
    """Health check endpoint (Public)"""
    try:
        from services.ocr_service import get_nlp_service as _get_nlp_service
        svc = _get_nlp_service()
        ocr_available = svc.paddleocr_available if svc and hasattr(svc, "paddleocr_available") else False
        spacy_available = bool(getattr(svc, "nlp", None)) if svc else False
        hf_ner_available = bool(getattr(svc, "hf_ner", None)) if svc else False

        return ResponseEnvelope(data=OcrHealthResponse(
            status="healthy",
            ocr_available=ocr_available,
            spacy_available=spacy_available,
            hf_ner_available=hf_ner_available,
            database_connected=True,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
    except Exception:
        logger.exception("Health check error")
        raise HTTPException(status_code=500, detail="Saglik kontrolu basarisiz.")


@router.post("/init-db", operation_id="createOcrInitDb", response_model=ResponseEnvelope[OcrInitResponse])
def init_database(
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db),
):
    """Initialize database and create tables (System Admin)"""
    if not access.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can initialize database")
    try:
        from core.database import engine
        from core.models.ocr_job import OCRJob

        OCRJob.__table__.create(bind=engine, checkfirst=True)

        return ResponseEnvelope(data=OcrInitResponse(
            message="OCR database tables initialized successfully",
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Init DB error")
        raise HTTPException(status_code=500, detail="Veritabani baslatma hatasi.")


@router.post("/initialize", operation_id="createOcrInitialize", response_model=ResponseEnvelope[OcrInitResponse])
def initialize_nlp_endpoint(
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Initialize NLP/OCR service (System Admin)"""
    if not access.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can initialize NLP service")
    try:
        def init_background():
            try:
                from services.ocr_service import initialize_nlp_service
                initialize_nlp_service()
                logger.info("NLP service initialized in background")
            except Exception:
                logger.exception("Background NLP initialization failed")

        background_tasks.add_task(init_background)

        return ResponseEnvelope(data=OcrInitResponse(
            message="NLP service initialization started (background)",
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Initialize NLP error")
        raise HTTPException(status_code=500, detail=ERR_OCR_INIT_FAILED)


@router.post("/process", operation_id="createOcrProcess", response_model=ResponseEnvelope[OcrProcessResponse])
def process_document(
    request_data: OcrProcessRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Process document with OCR"""
    svc = _get_ocr_service()

    image_path = request_data.image_path
    text = request_data.text or request_data.ocr_text
    doc_type = request_data.type
    auto_crop = request_data.auto_crop

    if not image_path and not text:
        raise HTTPException(status_code=400, detail=ERR_INVALID_INPUT)

    try:
        # Handle URL input with SSRF protection
        if image_path and image_path.startswith(("http://", "https://")):
            path_part = image_path.split("?")[0]
            suffix = os.path.splitext(path_part)[1] or ".jpg"

            with secure_temp_file(suffix=suffix, prefix="ocr_dl_") as dl_path:
                try:
                    download_image_from_url(image_path, dl_path)
                except HTTPException:
                    raise
                except Exception:
                    logger.exception("Image download failed")
                    raise HTTPException(status_code=400, detail=ERR_DOWNLOAD_FAILED)

                result = svc.process_document(
                    image_path=dl_path, doc_type=doc_type, text=text, auto_crop=auto_crop,
                )
                try:
                    result["patient_info"] = svc.extract_patient_name(image_path=dl_path, text=text)
                except Exception:
                    result["patient_info"] = None
        else:
            result = svc.process_document(
                image_path=image_path or None, doc_type=doc_type, text=text, auto_crop=auto_crop,
            )
            try:
                result["patient_info"] = svc.extract_patient_name(
                    image_path=image_path or None, text=text,
                )
            except Exception:
                result["patient_info"] = None

        return ResponseEnvelope(data=OcrProcessResponse(
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    except HTTPException:
        raise
    except Exception:
        logger.exception("OCR processing error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/similarity", operation_id="createOcrSimilarity", response_model=ResponseEnvelope[OcrSimilarityResponse])
def calculate_similarity(
    request_data: SimilarityRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Calculate similarity between documents"""
    svc = _get_ocr_service()

    text1 = request_data.text1
    text2 = request_data.text2

    if not ((request_data.image_path1 and request_data.image_path2) or (text1 and text2)):
        raise HTTPException(
            status_code=400,
            detail="Her iki gorsel yolu veya her iki metin saglanmalidir.",
        )

    try:
        result = svc.calculate_similarity(
            image_path1=request_data.image_path1,
            image_path2=request_data.image_path2,
            text1=text1,
            text2=text2,
        )

        return ResponseEnvelope(data=OcrSimilarityResponse(
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Similarity calculation error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/entities", operation_id="createOcrEntities", response_model=ResponseEnvelope[OcrEntitiesResponse])
def extract_entities(
    request_data: EntityExtractionRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Extract entities from image using OCR"""
    svc = _get_ocr_service()

    image_path = request_data.image_path
    text = request_data.text or request_data.ocr_text
    auto_crop = request_data.auto_crop

    if not image_path and not text:
        raise HTTPException(status_code=400, detail=ERR_INVALID_INPUT)

    try:
        result = svc.process_document(
            image_path=image_path or None, text=text, auto_crop=auto_crop,
        )

        return ResponseEnvelope(data=OcrEntitiesResponse(
            entities=result.get("entities", []),
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Entity extraction error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/extract_patient", operation_id="createOcrExtractPatient", response_model=ResponseEnvelope[OcrPatientResponse])
def extract_patient_name(
    request_data: PatientExtractionRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Extract patient name from image using OCR"""
    svc = _get_ocr_service()

    image_path = request_data.image_path
    text = request_data.text
    auto_crop = request_data.auto_crop

    if not image_path and not text:
        raise HTTPException(status_code=400, detail=ERR_INVALID_INPUT)

    try:
        patient_info = None
        if text:
            res = svc.process_document(text=text, auto_crop=auto_crop)
            custom = res.get("custom_entities") or []
            patient_matches = [e for e in custom if e.get("label") == "PATIENT_NAME"]
            if patient_matches:
                patient_info = {
                    "name": patient_matches[0]["text"],
                    "confidence": patient_matches[0].get("confidence", 0.9),
                }
            elif hasattr(svc, "extract_patient_name"):
                patient_info = svc.extract_patient_name(image_path)
        else:
            if hasattr(svc, "extract_patient_name"):
                patient_info = svc.extract_patient_name(image_path)

        return ResponseEnvelope(data=OcrPatientResponse(
            patient_info=patient_info,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Patient extraction error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/debug_ner", operation_id="createOcrDebugNer", response_model=ResponseEnvelope[OcrDebugResponse])
def debug_ner(
    request_data: DebugNERRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
):
    """Debug endpoint for NER (System Admin)"""
    if not access.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can access debug endpoints")

    svc = _get_ocr_service()
    text = request_data.text
    response = {"hf_ner": None, "spacy_entities": None, "tokens": None}

    try:
        if getattr(svc, "hf_ner", None):
            hf_out = svc.hf_ner(text)
            if hf_out:
                for item in hf_out:
                    if "score" in item:
                        item["score"] = float(item["score"])
            response["hf_ner"] = hf_out
    except Exception as e:
        response["hf_ner_error"] = str(e)

    try:
        if getattr(svc, "nlp", None):
            doc = svc.nlp(text)
            sp_entities = [
                {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
                for ent in getattr(doc, "ents", [])
            ]
            response["spacy_entities"] = sp_entities
            tokens = [
                {"text": t.text, "pos": t.pos_, "tag": t.tag_, "lemma": t.lemma_}
                for t in list(doc)[:500]
            ]
            response["tokens"] = tokens
    except Exception as e:
        response["spacy_error"] = str(e)

    return ResponseEnvelope(data=OcrDebugResponse(
        result=response,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))


# --- OCR Job Management ---

@router.get("/jobs", operation_id="listOcrJobs", response_model=ResponseEnvelope[List[OcrJobRead]])
def list_jobs(
    status: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db),
):
    """List OCR jobs"""
    try:
        from models.ocr_job import OCRJob, OCRJobStatus

        query = db.query(OCRJob)
        if not access.is_super_admin:
            if not access.tenant_id:
                raise HTTPException(status_code=400, detail="Tenant context required")
            query = query.filter_by(tenant_id=access.tenant_id)

        if status:
            try:
                query = query.filter_by(status=OCRJobStatus(status))
            except ValueError:
                pass

        jobs = query.order_by(OCRJob.created_at.desc()).limit(100).all()

        return ResponseEnvelope(data=[OcrJobRead.model_validate(job) for job in jobs])

    except HTTPException:
        raise
    except Exception:
        logger.exception("List jobs error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/jobs", operation_id="createOcrJobs", status_code=201, response_model=ResponseEnvelope[OcrJobRead])
def create_job(
    request_data: CreateJobRequest,
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db),
):
    """Create a new OCR job"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    try:
        from models.ocr_job import OCRJob, OCRJobStatus

        job = OCRJob(
            id=str(uuid.uuid4()),
            tenant_id=access.tenant_id,
            file_path=request_data.file_path,
            document_type=request_data.type,
            status=OCRJobStatus.PENDING,
        )
        db.add(job)
        db.commit()

        def process_job(job_id: str):
            from database import SessionLocal
            session = SessionLocal()
            try:
                job = session.get(OCRJob, job_id)
                if not job:
                    return

                job.status = OCRJobStatus.PROCESSING
                session.commit()

                from services.ocr_service import get_nlp_service as _get
                svc = _get()
                if not svc or not svc.initialized:
                    if svc:
                        svc.initialize()

                result = svc.process_document(
                    image_path=job.file_path, doc_type=job.document_type,
                )

                job.result = result
                job.status = OCRJobStatus.COMPLETED

                if result.get("patient_info"):
                    job.party_name = result["patient_info"].get("name")

            except Exception:
                logger.exception(f"Job processing failed: {job_id}")
                job.status = OCRJobStatus.FAILED
                job.error_message = "Belge isleme basarisiz oldu."
            finally:
                session.commit()
                session.close()

        background_tasks.add_task(process_job, job.id)

        return ResponseEnvelope(data=OcrJobRead.model_validate(job))

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Create job error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.get("/jobs/{job_id}", operation_id="getOcrJob", response_model=ResponseEnvelope[OcrJobRead])
def get_job(
    job_id: str,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db),
):
    """Get OCR job status"""
    try:
        from models.ocr_job import OCRJob

        job = db.get(OCRJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Is bulunamadi.")

        if access.tenant_id and job.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Erisim reddedildi.")

        return ResponseEnvelope(data=OcrJobRead.model_validate(job))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Get job error")
        raise HTTPException(status_code=500, detail=ERR_PROCESSING)


@router.post("/audiogram", operation_id="extractAudiogramThresholds", response_model=ResponseEnvelope[AudiogramThresholdResponse])
async def extract_audiogram(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access("parties.view")),
):
    """
    Extract hearing thresholds from an audiogram image.
    Detects red (right ear) and blue (left ear) markers at standard frequencies.
    """
    from services.audiogram_ocr_service import extract_audiogram_thresholds

    content = await file.read()
    validate_upload_mime(content, file.filename)

    suffix = os.path.splitext(file.filename or ".jpg")[1]
    with secure_temp_file(suffix=suffix, prefix="audiogram_") as temp_path:
        with open(temp_path, "wb") as f:
            f.write(content)

        try:
            result = extract_audiogram_thresholds(temp_path)

            response_data = AudiogramThresholdResponse(
                right_ear={str(k): v for k, v in result["right_ear"].items()},
                left_ear={str(k): v for k, v in result["left_ear"].items()},
                confidence=result["confidence"],
                detection_details=AudiogramDetectionDetails(**result["detection_details"]),
            )

            return ResponseEnvelope(data=response_data)
        except Exception:
            logger.exception("Audiogram extraction error")
            raise HTTPException(status_code=500, detail=ERR_AUDIOGRAM)
