from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import logging
import os

from models.base import db
from models.patient import Patient
from services.ocr_service import get_nlp_service, initialize_nlp_service

logger = logging.getLogger(__name__)

ocr_bp = Blueprint('ocr', __name__)

@ocr_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint (moved from app.py)"""
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
        return jsonify({
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
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/init-db', methods=['POST'])
def init_database():
    """Initialize database and create tables"""
    try:
        with current_app.app_context():
            db.create_all()
        return jsonify({
            "success": True,
            "message": "Database initialized successfully",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/initialize', methods=['POST'])
def initialize_nlp_endpoint():
    """Initialize NLP/OCR service (non-blocking).

    Starts model initialization in a background thread so the HTTP request
    can return quickly and heavy imports/downloads happen asynchronously.
    """
    try:
        import threading
        def _init_background():
            try:
                svc = initialize_nlp_service()
                # Pre-warm external OCR worker in background to reduce first-request latency
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

        return jsonify({
            "success": True,
            "message": "NLP service initialization started (background)",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Initialize NLP error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/process', methods=['POST'])
def process_document():
    """Process document with OCR

    Accepts either JSON with {'image_path': '/abs/path/to/file'} or
    {'text': 'raw extracted text'} so frontend clients can send text-only
    NLP requests without uploading images to the backend.
    """
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR service not available: {e}", "timestamp": datetime.now().isoformat()}), 503

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text') or data.get('ocr_text')
        doc_type = data.get('type', 'medical')
        # default to auto_crop for local SGK documents to improve accuracy
        auto_crop = bool(data.get('auto_crop', True))
        if not image_path and not text:
            return jsonify({"error": "No image path or text provided"}), 400

        temp_file_path = None
        try:
            # Handle URL
            if image_path and (image_path.startswith('http://') or image_path.startswith('https://')):
                try:
                    import requests
                    import tempfile
                    
                    response = requests.get(image_path, stream=True, timeout=30)
                    response.raise_for_status()
                    
                    # Create temp file
                    # Extract extension from URL path (ignoring query params)
                    path_part = image_path.split('?')[0]
                    suffix = os.path.splitext(path_part)[1]
                    if not suffix:
                        suffix = '.jpg' # Default to jpg if no extension found
                        
                    fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
                    os.close(fd)
                    
                    with open(temp_file_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    # Use the temp file path for processing
                    image_path_to_process = temp_file_path
                except Exception as e:
                    logger.error(f"Failed to download image from URL: {e}")
                    return jsonify({"success": False, "error": f"Failed to download image: {str(e)}"}), 400
            else:
                image_path_to_process = image_path

            result = svc.process_document(image_path=image_path_to_process or None, doc_type=doc_type, text=text, auto_crop=auto_crop)
            # Attempt to extract patient name as part of the processing result for convenience
            try:
                patient_info = svc.extract_patient_name(image_path=image_path_to_process or None, text=text)
                result['patient_info'] = patient_info
            except Exception:
                result['patient_info'] = None
            return jsonify({"success": True, "result": result, "timestamp": datetime.now().isoformat()})
            
        finally:
            # Cleanup temp file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass
                    
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/similarity', methods=['POST'])
def calculate_similarity():
    """Calculate similarity between two images or between two pieces of text

    Accepts either {'image_path1':..., 'image_path2':...} or {'text1':..., 'text2':...}
    """
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR service not available: {e}", "timestamp": datetime.now().isoformat()}), 503

        data = request.get_json() or {}
        image_path1 = data.get('image_path1')
        image_path2 = data.get('image_path2')
        text1 = data.get('text1') or data.get('textA') or data.get('text')
        text2 = data.get('text2') or data.get('textB') or data.get('text2')

        # Validate inputs
        if not ((image_path1 and image_path2) or (text1 and text2)):
            return jsonify({"error": "Provide either both image paths or both text1 and text2"}), 400

        result = svc.calculate_similarity(image_path1=image_path1, image_path2=image_path2, text1=text1, text2=text2)
        return jsonify({"success": True, "result": result, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Similarity calculation error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/entities', methods=['POST'])
def extract_entities():
    """Extract entities from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR service not available: {e}", "timestamp": datetime.now().isoformat()}), 503

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text') or data.get('ocr_text')
        auto_crop = bool(data.get('auto_crop', False))
        if not image_path and not text:
            return jsonify({"error": "No image path or text provided"}), 400
        result = svc.process_document(image_path=image_path or None, text=text, auto_crop=auto_crop)
        return jsonify({"success": True, "entities": result["entities"], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/extract_patient', methods=['POST'])
def extract_patient_name():
    """Extract patient name from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR service not available: {e}", "timestamp": datetime.now().isoformat()}), 503

        data = request.get_json() or {}
        image_path = data.get('image_path', '')
        text = data.get('text')
        auto_crop = bool(data.get('auto_crop', False))
        if not image_path and not text:
            return jsonify({"error": "No image path or text provided"}), 400
        # If text provided, let the service attempt extraction from text; otherwise run OCR
        if text:
            # Try to extract name heuristically from text
            # Reuse process_document to get custom entities
            res = svc.process_document(text=text, auto_crop=auto_crop)
            # Attempt to find patient name in custom entities first
            custom = res.get('custom_entities') or []
            patient_matches = [e for e in custom if e.get('label') == 'PATIENT_NAME']
            patient_info = None
            if patient_matches:
                patient_info = {"name": patient_matches[0]['text'], "confidence": patient_matches[0].get('confidence', 0.9)}
            else:
                patient_info = svc.extract_patient_name(image_path) if hasattr(svc, 'extract_patient_name') else None
        else:
            patient_info = svc.extract_patient_name(image_path) if hasattr(svc, 'extract_patient_name') else None

        return jsonify({"success": True, "patient_info": patient_info, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Patient extraction error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@ocr_bp.route('/debug_ner', methods=['POST'])
def debug_ner():
    """Debug endpoint to run HF NER and spaCy on provided text and return detailed outputs.

    Request JSON: { "text": "..." }
    Returns: { hf_ner: [...], spacy_entities: [...], tokens: [...] }
    """
    try:
        svc = get_nlp_service()
        if svc is None:
            svc = get_nlp_service()
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"NLP init failed: {e}"}), 503

        data = request.get_json() or {}
        text = data.get('text') or data.get('ocr_text')
        if not text:
            return jsonify({"success": False, "error": "No text provided"}), 400

        response = {"hf_ner": None, "spacy_entities": None, "tokens": None}

        # HF NER
        try:
            if getattr(svc, 'hf_ner', None):
                hf_out = svc.hf_ner(text)
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
                # tokens (sample)
                tokens = []
                for t in list(doc)[:500]:
                    tokens.append({"text": t.text, "pos": t.pos_, "tag": t.tag_, "lemma": t.lemma_})
                response['tokens'] = tokens
        except Exception as e:
            response['spacy_error'] = str(e)

        return jsonify({"success": True, "result": response, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"debug_ner error: {e}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500
