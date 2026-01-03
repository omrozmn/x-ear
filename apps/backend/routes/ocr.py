from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import logging
import os
import uuid
import threading
from typing import Optional

from models.base import db
from models.patient import Patient
from models.ocr_job import OCRJob, OCRJobStatus
from services.ocr_service import get_nlp_service, initialize_nlp_service
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.tenant_security import UnboundSession
from config.tenant_permissions import TenantPermissions
from utils.admin_permissions import AdminPermissions

logger = logging.getLogger(__name__)

ocr_bp = Blueprint('ocr', __name__)

@ocr_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint (Public)"""
    try:
        svc = get_nlp_service(init_if_missing=False)
        ocr_available = svc.paddleocr_available if svc and hasattr(svc, 'paddleocr_available') else False
        spacy_available = bool(getattr(svc, 'nlp', None)) if svc else False
        hf_ner_available = bool(getattr(svc, 'hf_ner', None)) if svc else False
        # Redis / OTP store availability
        otp_store = current_app.extensions.get('otp_store')
        try:
            redis_available = bool(otp_store.is_healthy()) if otp_store else False
        except Exception:
            redis_available = False
        return success_response({
            "status": "healthy",
            "ocr_available": ocr_available,
            "spacy_available": spacy_available,
            "hf_ner_available": hf_ner_available,
            "redis_available": redis_available,
            "database_connected": True,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return error_response(str(e), code='HEALTH_CHECK_FAILED', status_code=500)


@ocr_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_database(ctx):
    """Initialize database and create tables (System Admin)"""
    try:
        with current_app.app_context():
            db.create_all()
        return success_response({
            "message": "Database initialized successfully",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INIT_DB_FAILED', status_code=500)


@ocr_bp.route('/initialize', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def initialize_nlp_endpoint(ctx):
    """Initialize NLP/OCR service (System Admin)"""
    try:
        def _init_background():
            try:
                svc = initialize_nlp_service()
                # Pre-warm external OCR worker
                try:
                    import tempfile
                    from PIL import Image
                    fd, tmp_path = tempfile.mkstemp(suffix='.jpg', prefix='ocr_warmup_')
                    os.close(fd)
                    img = Image.new('RGB', (64,64), color=(255,255,255))
                    img.save(tmp_path, quality=80)
                    try:
                        svc._external_paddle_ocr(tmp_path)
                    except Exception:
                        pass
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
                except Exception:
                    pass
            except Exception as e:
                logger.exception('Background NLP initialization failed: %s', e)

        t = threading.Thread(target=_init_background, daemon=True)
        t.start()

        return success_response({
            "message": "NLP service initialization started (background)",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Initialize NLP error: {e}")
        return error_response(str(e), code='INIT_NLP_FAILED', status_code=500)


@ocr_bp.route('/process', methods=['POST'])
@unified_access(permission=TenantPermissions.OCR_WRITE)
def process_document(ctx):
    """Process document with OCR"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return error_response(f"OCR service not available: {e}", code='OCR_UNAVAILABLE', status_code=503)

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text') or data.get('ocr_text')
        doc_type = data.get('type', 'medical')
        auto_crop = bool(data.get('auto_crop', True))
        
        if not image_path and not text:
            return error_response("No image path or text provided", code='MISSING_INPUT', status_code=400)

        temp_file_path = None
        try:
            # Handle URL
            image_path_to_process = image_path
            if image_path and (image_path.startswith('http://') or image_path.startswith('https://')):
                try:
                    import requests
                    import tempfile
                    
                    response = requests.get(image_path, stream=True, timeout=30)
                    response.raise_for_status()
                    
                    path_part = image_path.split('?')[0]
                    suffix = os.path.splitext(path_part)[1] or '.jpg'
                        
                    fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
                    os.close(fd)
                    
                    with open(temp_file_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    image_path_to_process = temp_file_path
                except Exception as e:
                    logger.error(f"Failed to download image from URL: {e}")
                    return error_response(f"Failed to download image: {str(e)}", code='DOWNLOAD_FAILED', status_code=400)

            result = svc.process_document(image_path=image_path_to_process or None, doc_type=doc_type, text=text, auto_crop=auto_crop)
            
            try:
                patient_info = svc.extract_patient_name(image_path=image_path_to_process or None, text=text)
                result['patient_info'] = patient_info
            except Exception:
                result['patient_info'] = None
                
            return success_response({
                "result": result, 
                "timestamp": datetime.now().isoformat()
            })
            
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass
                    
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        return error_response(str(e), code='PROCESSING_FAILED', status_code=500)


@ocr_bp.route('/similarity', methods=['POST'])
@unified_access(permission=TenantPermissions.OCR_READ)
def calculate_similarity(ctx):
    """Calculate similarity"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return error_response(f"OCR service not available: {e}", code='OCR_UNAVAILABLE', status_code=503)

        data = request.get_json() or {}
        image_path1 = data.get('image_path1')
        image_path2 = data.get('image_path2')
        text1 = data.get('text1') or data.get('textA') or data.get('text')
        text2 = data.get('text2') or data.get('textB') or data.get('text2')

        if not ((image_path1 and image_path2) or (text1 and text2)):
            return error_response("Provide either both image paths or both text1 and text2", code='MISSING_INPUT', status_code=400)

        result = svc.calculate_similarity(image_path1=image_path1, image_path2=image_path2, text1=text1, text2=text2)
        return success_response({"result": result, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Similarity calculation error: {e}")
        return error_response(str(e), code='SIMILARITY_FAILED', status_code=500)


@ocr_bp.route('/entities', methods=['POST'])
@unified_access(permission=TenantPermissions.OCR_READ)
def extract_entities(ctx):
    """Extract entities from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return error_response(f"OCR service not available: {e}", code='OCR_UNAVAILABLE', status_code=503)

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text') or data.get('ocr_text')
        auto_crop = bool(data.get('auto_crop', False))
        
        if not image_path and not text:
            return error_response("No image path or text provided", code='MISSING_INPUT', status_code=400)
            
        result = svc.process_document(image_path=image_path or None, text=text, auto_crop=auto_crop)
        return success_response({"entities": result["entities"], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        return error_response(str(e), code='EXTRACTION_FAILED', status_code=500)


@ocr_bp.route('/extract_patient', methods=['POST'])
@unified_access(permission=TenantPermissions.OCR_READ)
def extract_patient_name(ctx):
    """Extract patient name from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return error_response(f"OCR service not available: {e}", code='OCR_UNAVAILABLE', status_code=503)

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text')
        auto_crop = bool(data.get('auto_crop', False))
        
        if not image_path and not text:
            return error_response("No image path or text provided", code='MISSING_INPUT', status_code=400)
            
        if text:
            res = svc.process_document(text=text, auto_crop=auto_crop)
            custom = res.get('custom_entities') or []
            patient_matches = [e for e in custom if e.get('label') == 'PATIENT_NAME']
            if patient_matches:
                patient_info = {"name": patient_matches[0]['text'], "confidence": patient_matches[0].get('confidence', 0.9)}
            else:
                patient_info = svc.extract_patient_name(image_path) if hasattr(svc, 'extract_patient_name') else None
        else:
            patient_info = svc.extract_patient_name(image_path) if hasattr(svc, 'extract_patient_name') else None

        return success_response({"patient_info": patient_info, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Patient extraction error: {e}")
        return error_response(str(e), code='EXTRACTION_FAILED', status_code=500)


@ocr_bp.route('/debug_ner', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def debug_ner(ctx):
    """Debug endpoint (System Admin)"""
    try:
        svc = get_nlp_service()
        if svc is None:
            svc = get_nlp_service()
            try:
                svc.initialize()
            except Exception as e:
                return error_response(f"NLP init failed: {e}", code='OCR_UNAVAILABLE', status_code=503)

        data = request.get_json() or {}
        text = data.get('text') or data.get('ocr_text')
        if not text:
            return error_response("No text provided", code='MISSING_INPUT', status_code=400)

        response = {"hf_ner": None, "spacy_entities": None, "tokens": None}

        # HF NER
        try:
            if getattr(svc, 'hf_ner', None):
                hf_out = svc.hf_ner(text)
                # Convert float32 to float for json serialization
                if hf_out:
                    for item in hf_out:
                         if 'score' in item:
                             item['score'] = float(item['score'])
                response['hf_ner'] = hf_out
        except Exception as e:
            response['hf_ner_error'] = str(e)

        # spaCy
        try:
            if getattr(svc, 'nlp', None):
                doc = svc.nlp(text)
                sp_entities = []
                for ent in getattr(doc, 'ents', []):
                    sp_entities.append({"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char})
                response['spacy_entities'] = sp_entities
                tokens = []
                for t in list(doc)[:500]:
                    tokens.append({"text": t.text, "pos": t.pos_, "tag": t.tag_, "lemma": t.lemma_})
                response['tokens'] = tokens
        except Exception as e:
            response['spacy_error'] = str(e)

        return success_response({"result": response, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"debug_ner error: {e}")
        return error_response(str(e), code='DEBUG_FAILED', status_code=500)

# ==================== OCR JOB MANAGEMENT ====================

@ocr_bp.route('/jobs', methods=['GET'])
@unified_access(permission=TenantPermissions.OCR_READ)
def list_jobs(ctx):
    """List OCR jobs"""
    try:
        tenant_id = ctx.tenant_id
        if not tenant_id:
             return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)

        status = request.args.get('status')
        
        query = OCRJob.query.filter_by(tenant_id=tenant_id)
        if status:
            try:
                query = query.filter_by(status=OCRJobStatus(status))
            except ValueError:
                pass
            
        jobs = query.order_by(OCRJob.created_at.desc()).limit(100).all()
        return success_response(data=[job.to_dict() for job in jobs])
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@ocr_bp.route('/jobs', methods=['POST'])
@unified_access(permission=TenantPermissions.OCR_WRITE)
def create_job(ctx):
    """Create a new OCR job"""
    try:
        tenant_id = ctx.tenant_id
        if not tenant_id:
             return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
             
        data = request.get_json()
        file_path = data.get('file_path')
        doc_type = data.get('type', 'medical')
        
        if not file_path:
            return error_response('file_path is required', code='MISSING_FIELD', status_code=400)
            
        job = OCRJob(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            file_path=file_path,
            document_type=doc_type,
            status=OCRJobStatus.PENDING
        )
        db.session.add(job)
        db.session.commit()
        
        # Trigger async processing here (e.g. via thread or celery)
        def process_job(job_id, app):
            with app.app_context():
                job = OCRJob.query.get(job_id)
                if not job: return
                
                try:
                    job.status = OCRJobStatus.PROCESSING
                    db.session.commit()
                    
                    svc = get_nlp_service()
                    if not svc.initialized:
                        svc.initialize()
                        
                    result = svc.process_document(image_path=job.file_path, doc_type=job.document_type)
                    
                    job.result = result
                    job.status = OCRJobStatus.COMPLETED
                    
                    if 'patient_info' in result and result['patient_info']:
                        job.patient_name = result['patient_info'].get('name')
                        
                except Exception as e:
                    logger.error(f"Job processing failed: {e}")
                    job.status = OCRJobStatus.FAILED
                    job.error_message = str(e)
                
                db.session.commit()
        
        app = current_app._get_current_object()
        t = threading.Thread(target=process_job, args=(job.id, app))
        t.start()
        
        return success_response(data=job.to_dict(), status_code=201)
        
    except Exception as e:
        logger.error(f"Create job error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=500)
