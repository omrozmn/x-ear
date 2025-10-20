from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from models.base import db, gen_id
from models.patient import Patient

# SGKDocument is optional - some deployments may not have a dedicated model.
try:
    from models.sgk import SGKDocument
except Exception:
    SGKDocument = None

from services.ocr_service import get_nlp_service
from sqlalchemy import or_, func

logger = logging.getLogger(__name__)

sgk_bp = Blueprint('sgk', __name__)

import os
import tempfile
from werkzeug.utils import secure_filename
import pdfkit

# Simple upload limits
MAX_UPLOAD_FILES = 50
ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp'}


def _is_allowed_image(filename, file_stream):
    # Quick extension check only. In production, consider using a robust magic-bytes check.
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_IMAGE_EXTENSIONS


@sgk_bp.route('/sgk/documents', methods=['GET'])
def list_sgk_documents():
    try:
        docs = []
        return jsonify({"success": True, "documents": docs, "count": len(docs), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"List SGK docs error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/sgk/documents', methods=['POST'])
def upload_sgk_document():
    try:
        data = request.get_json() or {}
        # Validate required fields regardless of model availability
        required_fields = ['patientId', 'filename', 'documentType']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": datetime.now().isoformat()
                }), 400

        if SGKDocument and hasattr(SGKDocument, 'from_dict'):
            doc = SGKDocument.from_dict(data)
            # Save to DB if desired
            try:
                db.session.add(doc)
                db.session.commit()
            except Exception:
                db.session.rollback()
        else:
            doc = data
        return jsonify({"success": True, "document": (doc.to_dict() if hasattr(doc, 'to_dict') else doc), "timestamp": datetime.now().isoformat()}), 201
    except Exception as e:
        logger.error(f"Upload SGK doc error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/sgk/documents/<document_id>', methods=['GET'])
def get_sgk_document(document_id):
    try:
        if SGKDocument:
            doc = db.session.get(SGKDocument, document_id)
            if not doc:
                return jsonify({"success": False, "error": "Document not found"}), 404
            return jsonify({"success": True, "document": doc.to_dict(), "timestamp": datetime.now().isoformat()})
        else:
            return jsonify({"success": False, "error": "SGK document model not available"}), 404
    except Exception as e:
        logger.error(f"Get SGK doc error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/sgk/documents/<document_id>', methods=['DELETE'])
def delete_sgk_document(document_id):
    try:
        if SGKDocument:
            doc = db.session.get(SGKDocument, document_id)
            if not doc:
                return jsonify({"success": False, "error": "Document not found"}), 404
            db.session.delete(doc)
            db.session.commit()
            return jsonify({"success": True, "message": "Document deleted", "timestamp": datetime.now().isoformat()}), 200
        else:
            return jsonify({"success": False, "error": "SGK document model not available"}), 404
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete SGK doc error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/ocr/process', methods=['POST'])
def process_ocr():
    try:
        data = request.get_json() or {}
        image_path = data.get('image_path')
        if not image_path:
            return jsonify({"success": False, "error": "No image path provided"}), 400
        svc = get_nlp_service()
        if svc is None:
            svc = get_nlp_service()
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR init failed: {e}"}), 503
        result = svc.process_document(image_path)
        return jsonify({"success": True, "result": result, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"OCR process error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/sgk/upload', methods=['POST'])
def upload_and_process_files():
    """Accept multipart/form-data uploads under the 'files' field (multiple allowed).
    Saves files to a secure temporary path, runs OCR (worker-first) with auto_crop=True
    and returns per-file OCR results including patient_info.
    """
    try:
        # Basic file list validation
        if 'files' not in request.files:
            return jsonify({"success": False, "error": "No files provided. Use form field name 'files'."}), 400

        files = request.files.getlist('files')
        if not files:
            return jsonify({"success": False, "error": "Empty file list."}), 400

        if len(files) > MAX_UPLOAD_FILES:
            return jsonify({"success": False, "error": f"Too many files. Max allowed is {MAX_UPLOAD_FILES}."}), 400

        svc = get_nlp_service()
        if svc is None:
            svc = get_nlp_service()
            try:
                svc.initialize()
            except Exception as e:
                return jsonify({"success": False, "error": f"OCR init failed: {e}"}), 503

        results = []
        for f in files:
            original_name = f.filename or 'unknown'

            # Validate image-like file
            if not _is_allowed_image(original_name, f.stream):
                results.append({
                    "fileName": original_name,
                    "status": "error",
                    "error": "Unsupported file type or not an image. Convert PDFs to images first."}
                )
                continue

            # Save to temp file
            suffix = os.path.splitext(original_name)[1] or '.jpg'
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix='sgk_upload_')
            try:
                f.stream.seek(0)
                tmp.write(f.stream.read())
                tmp.flush()
                tmp.close()

                # Run OCR and NLP processing (auto_crop True for SGK docs)
                try:
                    proc_result = svc.process_document(image_path=tmp.name, auto_crop=True)

                    # Fast route-level heuristic: look for 'Hasta Ad Soyad' label followed by a name entity
                    patient_info = None
                    try:
                        ents = proc_result.get('entities') or []
                        texts = [ (e.get('text') if isinstance(e, dict) else str(e)) for e in ents ]
                        for idx, txt in enumerate(texts):
                            low = (txt or '').lower()
                            if 'hasta' in low and ('ad' in low or 'adı' in low or 'soyad' in low):
                                # check following lines/entities for candidate name
                                for j in range(idx+1, min(idx+4, len(texts))):
                                    cand = (texts[j] or '').strip()
                                    # clean candidate
                                    cand_clean = ''.join([c for c in cand if c.isalpha() or c.isspace() or c == '-']).strip()
                                    if len(cand_clean.split()) >= 2:
                                        patient_info = {"name": cand_clean, "confidence": 0.9, "source": "label-adjacent"}
                                        break
                            if patient_info:
                                break
                    except Exception:
                        patient_info = None

                    # If fast heuristic didn't find patient name, try service-level NER (HF/spaCy) using OCR text
                    try:
                        if not patient_info:
                            ocr_text_lines = []
                            for ent in proc_result.get('entities', []) or []:
                                if isinstance(ent, dict) and 'text' in ent:
                                    ocr_text_lines.append(str(ent['text']))
                            ocr_text = '\n'.join(ocr_text_lines).strip() if ocr_text_lines else None
                            if ocr_text:
                                patient_info = svc.extract_patient_name(image_path=None, text=ocr_text)
                            else:
                                patient_info = svc.extract_patient_name(image_path=tmp.name, text=None)
                        proc_result['patient_info'] = patient_info
                    except Exception:
                        proc_result['patient_info'] = None

                    # ----- NEW: server-side patient DB lookup using both TC partial (preferred) and name (fallback) -----
                    try:
                        # Extract TC partial from OCR entities/text
                        def _apply_digit_ocr_corrections(s):
                            """Conservative character-to-digit replacements for OCR numeric fixes.
                            Only applied when we're extracting numeric substrings to avoid corrupting names.
                            """
                            if not s:
                                return s
                            try:
                                # conservative mapping to avoid over-correction
                                mapping = {
                                    'O': '0', 'o': '0',
                                    'I': '1', 'l': '1', 'İ': '1',
                                    'S': '5', 's': '5',
                                    'B': '8'
                                }
                                out = s
                                for a, b in mapping.items():
                                    out = out.replace(a, b)
                                return out
                            except Exception:
                                return s

                        def _extract_tc_partial(entities, joined_text=None):
                            import re
                            # Collect texts for windowed merging
                            texts = [ (e.get('text') if isinstance(e, dict) else str(e) or '') for e in (entities or []) ]

                            # 1) Direct patterns inside each entity
                            for t in texts:
                                if not t:
                                    continue
                                # full 11-digit
                                m = re.search(r"(\d{11})", t) or re.search(r"(\d{11})", _apply_digit_ocr_corrections(t))
                                if m:
                                    return m.group(1)
                                # masked like 3390159***** or 3390159**** (try corrected form too)
                                m2 = re.search(r"(\d{5,11})\*+", t) or re.search(r"(\d{5,11})\*+", _apply_digit_ocr_corrections(t))
                                if m2:
                                    return m2.group(1)

                            # 2) Merge adjacent entity texts (window) to handle OCR-split numbers
                            max_window = 4
                            for i in range(len(texts)):
                                merged = ''.join(texts[i:i+max_window])
                                # also try a corrected merged string
                                merged_corr = _apply_digit_ocr_corrections(merged)
                                merged_clean = re.sub(r'[^0-9*]', '', merged_corr)
                                if not merged_clean:
                                    continue
                                m3 = re.search(r"(\d{5,11})\*+", merged_clean)
                                if m3:
                                    return m3.group(1)
                                m4 = re.search(r"(\d{6,11})", merged_clean)
                                if m4:
                                    return m4.group(1)

                            # 3) fallback: remove non-digits from joined_text and search
                            if joined_text:
                                # apply digit corrections to the full joined text as a last resort
                                joined_corr = _apply_digit_ocr_corrections(joined_text or '')
                                jt_clean = re.sub(r'[^0-9*]', '', joined_corr)
                                if jt_clean:
                                    m5 = re.search(r"(\d{5,11})\*+", jt_clean) or re.search(r"(\d{6,11})", jt_clean)
                                    if m5:
                                        return m5.group(1)

                            return None

                        joined_text_for_tc = '\n'.join([e.get('text') if isinstance(e, dict) and 'text' in e else str(e) for e in proc_result.get('entities') or []])
                        tc_partial = _extract_tc_partial(proc_result.get('entities', []) or [], joined_text_for_tc)
                        proc_result['tc_partial'] = tc_partial

                        matched_patient = None
                        match_details = None

                        # If we have a TC partial, try to find patients whose tc_number contains it
                        if tc_partial:
                            try:
                                # Normalize tc_partial to digits only (handle masked forms like 3390159*****)
                                tc_partial_digits = ''.join([c for c in str(tc_partial or '') if c.isdigit()])
                                if not tc_partial_digits:
                                    # fallback to original if cleaning removed everything
                                    tc_partial_digits = tc_partial
                                # strip non-digits from stored tc_number and compare using digits-only substring
                                q = db.session.query(Patient).filter(func.replace(func.coalesce(Patient.tc_number, ''), ' ', '').like(f"%{tc_partial_digits}%"))
                                candidates = q.limit(10).all()
                                # Normalize the extracted TC partial (remove masking asterisks) before comparing
                                try:
                                    tc_partial_clean = ''.join([c for c in str(tc_partial or '') if c.isdigit()])
                                except Exception:
                                    tc_partial_clean = tc_partial

                                if len(candidates) == 1:
                                    matched_patient = candidates[0]
                                    match_details = {"method": "tc_partial", "reason": "unique tc substring match", "candidate_count": 1, "confidence": 0.99}
                                elif len(candidates) > 1:
                                    # If multiple, try to disambiguate using name (if available)
                                    if patient_info and patient_info.get('name'):
                                        name_text = patient_info.get('name')
                                        # Prepare normalized name for comparisons
                                        def _strip_diacritics_local(s):
                                            import unicodedata
                                            if not s:
                                                return ''
                                            nk = unicodedata.normalize('NFKD', s)
                                            return ''.join([c for c in nk if not unicodedata.combining(c)])

                                        # Clean and normalize the OCR-derived name
                                        name_clean = ''.join([c for c in (name_text or '') if c.isalpha() or c.isspace() or c == '-']).strip()
                                        name_clean = _strip_diacritics_local(name_clean).lower()

                                        # compute similarity scores
                                        best = None
                                        best_score = 0.0
                                        def _norm_str(s):
                                            import unicodedata
                                            if not s:
                                                return ''
                                            nk = unicodedata.normalize('NFKD', s)
                                            return ''.join([c for c in nk if not unicodedata.combining(c)]).lower()

                                        for cand in candidates:
                                            cand_full = f"{cand.first_name} {cand.last_name}".strip()
                                            # If normalized strings are identical, accept immediately (high-confidence exact match)
                                            if _norm_str(cand_full) == name_clean:
                                                best_score = 1.0
                                                best = cand
                                                break
                                            sim = svc.calculate_similarity(text1=name_clean, text2=cand_full).get('similarity', 0.0)
                                            if sim > best_score:
                                                best_score = sim
                                                best = cand
                                        if best and best_score >= 0.75:
                                            matched_patient = best
                                            match_details = {"method": "tc_partial+name_disambiguation", "candidate_count": len(candidates), "similarity": float(best_score), "confidence": 0.95}
                                        else:
                                            match_details = {"method": "tc_partial", "candidate_count": len(candidates), "confidence": 0.5}
                                    else:
                                        match_details = {"method": "tc_partial", "candidate_count": len(candidates), "confidence": 0.5}
                            except Exception:
                                matched_patient = None

                        # If no TC match, try name lookup
                        if not matched_patient and patient_info and patient_info.get('name'):
                            try:
                                name_raw = patient_info.get('name')
                                # Normalize name and split
                                # Normalize and remove diacritics for robust matching
                                def _strip_diacritics(s):
                                    import unicodedata
                                    if not s:
                                        return ''
                                    nkfd = unicodedata.normalize('NFKD', s)
                                    return ''.join([c for c in nkfd if not unicodedata.combining(c)])

                                name_clean_raw = ''.join([c for c in (name_raw or '') if c.isalpha() or c.isspace() or c=='-']).strip()
                                name_clean = _strip_diacritics(name_clean_raw)
                                parts = [p for p in name_clean.split() if p]
                                candidates = []
                                if len(parts) >= 2:
                                    first_token = parts[0]
                                    last_token = parts[-1]
                                    # Build normalized SQL expressions for name fields (replace common Turkish diacritics)
                                    def _sql_normalized(col):
                                        # apply lower() and replace common Turkish characters with ascii equivalents
                                        expr = func.lower(col)
                                        for a,b in [("ç","c"),("ğ","g"),("ı","i"),("ö","o"),("ş","s"),("ü","u"),("İ","i")]:
                                            expr = func.replace(expr, a, b)
                                        return expr

                                    candidates = db.session.query(Patient).filter(
                                        _sql_normalized(Patient.first_name).ilike(f"{first_token.lower()}%"),
                                        _sql_normalized(Patient.last_name).ilike(f"%{last_token.lower()}%")
                                    ).limit(20).all()
                                if not candidates:
                                    # looser search: any token in first_name or last_name
                                    token_filters = []
                                    for t in parts:
                                        nt = _strip_diacritics(t.lower())
                                        token_filters.append(_sql_normalized(Patient.first_name).ilike(f"%{nt}%"))
                                        token_filters.append(_sql_normalized(Patient.last_name).ilike(f"%{nt}%"))
                                    if token_filters:
                                        candidates = db.session.query(Patient).filter(or_(*token_filters)).limit(50).all()

                                # Log candidate ids for debugging
                                try:
                                    logger.info('Name lookup candidates for "%s": %s', name_clean, [c.id for c in candidates])
                                except Exception:
                                    pass

                                if candidates:
                                    # If only one candidate returned by DB filters, auto-match immediately
                                    if len(candidates) == 1:
                                        matched_patient = candidates[0]
                                        match_details = {"method": "name_match_single_candidate", "candidate_count": 1, "confidence": 0.90}
                                        # attach and skip further similarity ranking
                                    else:
                                        # rank by similarity
                                        best = None
                                        best_score = 0.0
                                        for cand in candidates:
                                            cand_full = f"{cand.first_name} {cand.last_name}".strip()
                                            # If normalized strings are identical, accept immediately (high-confidence exact match)
                                            def _norm_str(s):
                                                import unicodedata
                                                if not s:
                                                    return ''
                                                nk = unicodedata.normalize('NFKD', s)
                                                return ''.join([c for c in nk if not unicodedata.combining(c)]).lower()
                                            if _norm_str(cand_full) == name_clean.lower():
                                                best_score = 1.0
                                                best = cand
                                                try:
                                                    logger.info('Exact normalized name match: %s == %s (patient id %s)', _norm_str(cand_full), name_clean.lower(), cand.id)
                                                except Exception:
                                                    pass
                                                break
                                            sim = svc.calculate_similarity(text1=name_clean, text2=cand_full).get('similarity', 0.0)
                                            if sim > best_score:
                                                best_score = sim
                                                best = cand
                                        try:
                                            logger.info('Best name match score=%s for name=%s best=%s', best_score, name_clean, getattr(best,'id', None))
                                        except Exception:
                                            pass
                                        # Lowered similarity threshold from 0.7 to 0.6 for higher recall in noisy OCR
                                        if best and best_score >= 0.6:
                                            matched_patient = best
                                            match_details = {"method": "name_match", "similarity": float(best_score), "candidate_count": len(candidates), "confidence": float(0.8 + (best_score-0.6))}
                                        else:
                                            match_details = {"method": "name_match", "candidate_count": len(candidates), "confidence": 0.4}
                                else:
                                    match_details = {"method": "name_match", "candidate_count": 0, "confidence": 0.0}
                            except Exception:
                                match_details = {"method": "name_match", "candidate_count": 0, "confidence": 0.0}

                        # Attach matched patient info (if any) to proc_result
                        if matched_patient:
                            try:
                                proc_result['matched_patient'] = {
                                    'patient': matched_patient.to_dict(),
                                    'match_details': match_details
                                }
                            except Exception:
                                # best-effort: expose id and name
                                proc_result['matched_patient'] = {
                                    'patient': {'id': getattr(matched_patient, 'id', None), 'fullName': f"{getattr(matched_patient,'first_name',None)} {getattr(matched_patient,'last_name',None)}"},
                                    'match_details': match_details
                                }
                        else:
                            proc_result['matched_patient'] = None
                    except Exception:
                        # If anything goes wrong, don't break the upload flow — return processing result without DB match
                        proc_result['matched_patient'] = None
                    # ----- END DB lookup block -----

                    # ----- PDF Conversion and Saving -----
                    pdf_path = None
                    document_type = None
                    try:
                        # Determine document type from classification
                        classification = proc_result.get('classification', {})
                        doc_type = classification.get('type', 'other')
                        if 'sgk' in doc_type.lower() or 'reçete' in ''.join([e.get('text', '') for e in proc_result.get('entities', [])]).lower():
                            document_type = 'sgk_reçete'
                        elif 'rapor' in doc_type.lower():
                            document_type = 'sgk_rapor'
                        elif 'odyometri' in ''.join([e.get('text', '') for e in proc_result.get('entities', [])]).lower():
                            document_type = 'odyometri_sonucu'
                        elif 'garanti' in ''.join([e.get('text', '') for e in proc_result.get('entities', [])]).lower():
                            document_type = 'garanti_belgesi'
                        elif 'kimlik' in ''.join([e.get('text', '') for e in proc_result.get('entities', [])]).lower():
                            document_type = 'kimlik'
                        else:
                            document_type = 'diger'

                        # Generate filename
                        patient_name = 'Bilinmeyen_Hasta'
                        if proc_result.get('matched_patient') and proc_result['matched_patient'].get('patient'):
                            pat = proc_result['matched_patient']['patient']
                            first_name = pat.get('firstName', '')
                            last_name = pat.get('lastName', '')
                            patient_name = f"{first_name}_{last_name}".replace(' ', '_')

                        filename = f"{patient_name}_{document_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

                        # Convert image to PDF
                        pdfkit_config = pdfkit.configuration(wkhtmltopdf='/usr/local/bin/wkhtmltopdf')  # Adjust path if needed
                        pdf_options = {
                            'page-size': 'A4',
                            'orientation': 'Portrait',
                            'margin-top': '0.75in',
                            'margin-right': '0.75in',
                            'margin-bottom': '0.75in',
                            'margin-left': '0.75in',
                            'encoding': 'UTF-8',
                            'no-outline': None,
                            'enable-local-file-access': None
                        }
                        
                        # Create HTML from image
                        html_content = f"""
                        <html>
                        <head>
                            <title>{filename}</title>
                            <style>
                                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                                img {{ max-width: 100%; height: auto; }}
                                .info {{ margin-bottom: 20px; }}
                            </style>
                        </head>
                        <body>
                            <div class="info">
                                <h2>SGK Dokümanı</h2>
                                <p><strong>Tür:</strong> {document_type}</p>
                                <p><strong>Hasta:</strong> {patient_name.replace('_', ' ')}</p>
                                <p><strong>Tarih:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                            </div>
                            <img src="file://{tmp.name}" alt="Doküman" />
                        </body>
                        </html>
                        """
                        
                        # Save HTML to temp file
                        html_tmp = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.html', prefix='sgk_html_')
                        html_tmp.write(html_content)
                        html_tmp.flush()
                        html_tmp.close()
                        
                        # Convert to PDF
                        pdf_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', prefix='sgk_pdf_')
                        pdf_tmp.close()
                        
                        pdfkit.from_file(html_tmp.name, pdf_tmp.name, configuration=pdfkit_config, options=pdf_options)
                        pdf_path = pdf_tmp.name
                        
                        # Cleanup HTML temp file
                        try:
                            os.unlink(html_tmp.name)
                        except Exception:
                            pass
                        
                        proc_result['pdf_generated'] = True
                        proc_result['pdf_filename'] = filename
                        proc_result['document_type'] = document_type
                        
                    except Exception as e:
                        logger.warning(f"PDF generation failed: {e}")
                        proc_result['pdf_generated'] = False
                        proc_result['pdf_error'] = str(e)
                    
                    # Save to patient documents if patient matched
                    if proc_result.get('matched_patient') and proc_result['matched_patient'].get('patient') and pdf_path:
                        try:
                            patient_id = proc_result['matched_patient']['patient']['id']
                            patient = db.session.get(Patient, patient_id)
                            if patient:
                                # Add to patient's custom_data documents
                                custom_data = patient.custom_data_json or {}
                                documents = custom_data.get('documents', [])
                                
                                doc_entry = {
                                    'id': gen_id('doc'),
                                    'type': document_type,
                                    'filename': filename,
                                    'url': f'/uploads/sgk/{filename}',  # Assuming upload path
                                    'uploadedAt': datetime.now().isoformat(),
                                    'ocrResult': proc_result
                                }
                                documents.append(doc_entry)
                                custom_data['documents'] = documents
                                patient.custom_data_json = custom_data
                                db.session.commit()
                                
                                proc_result['saved_to_patient'] = True
                                proc_result['document_id'] = doc_entry['id']
                        except Exception as e:
                            logger.error(f"Failed to save document to patient: {e}")
                            proc_result['saved_to_patient'] = False
                            proc_result['save_error'] = str(e)
                    
                    # Cleanup PDF temp file after saving
                    if pdf_path and os.path.exists(pdf_path):
                        try:
                            # Move to permanent location if needed, or keep temp for now
                            # For now, just keep the path in result
                            pass
                        except Exception:
                            pass
                    
                    # ----- END PDF Conversion and Saving -----

                    results.append({
                        "fileName": original_name,
                        "savedPath": tmp.name,
                        "status": "processed",
                        "result": proc_result
                    })
                except Exception as e:
                    logger.exception('OCR processing failed for %s', original_name)
                    results.append({
                        "fileName": original_name,
                        "savedPath": tmp.name,
                        "status": "error",
                        "error": str(e)
                    })
            finally:
                # Cleanup saved temp file - keep if you want audit, but remove to avoid disk growth
                try:
                    if os.path.exists(tmp.name):
                        os.unlink(tmp.name)
                except Exception:
                    pass

        return jsonify({"success": True, "files": results, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.exception('File upload error')
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/patients/<patient_id>/sgk-documents', methods=['GET'])
def get_patient_sgk_documents(patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found"}), 404
        return jsonify({"success": True, "documents": [], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Get patient SGK docs error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sgk_bp.route('/sgk/seed-test-patients', methods=['POST'])
def seed_test_patients():
    """Development helper: for each image in the repo images/ folder, run OCR, extract name and tc_partial,
    then insert a Patient record with a generated valid TC that contains the partial substring.
    This endpoint is intended for local/dev only and makes a best-effort to avoid duplicate inserts.
    """
    try:
        # Only enable in non-production to avoid accidental DB pollution
        if os.getenv('FLASK_ENV', 'production') == 'production':
            return jsonify({'success': False, 'error': 'Seeding disabled in production'}), 403

        svc = get_nlp_service()
        if svc is None:
            svc = get_nlp_service()
            svc.initialize()

        images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'legacy', 'images'))
        if not os.path.isdir(images_dir):
            return jsonify({'success': False, 'error': f'Images directory not found: {images_dir}'}), 400

        created = []
        errors = []

        # Helper: generate valid TC number using Turkish TCKN checksum rules with prefix
        def _generate_tc_from_prefix(prefix):
            # Ensure digits only prefix
            import random
            p = ''.join([c for c in (prefix or '') if c.isdigit()])
            if not p:
                # fallback: random 9-digit base with non-zero first digit
                base9 = str(random.randint(1_000_000_00, 9_999_999_99))[:9]
            else:
                if len(p) > 9:
                    p = p[:9]
                # ensure first digit not zero
                if p[0] == '0':
                    p = '1' + p[1:]
                # pad to 9 digits deterministically using a hash of prefix
                import hashlib
                needed = 9 - len(p)
                if needed > 0:
                    h = hashlib.sha1((p + 'xseed').encode('utf-8')).hexdigest()
                    pad = ''.join([str(int(h[i:i+2], 16) % 10) for i in range(0, needed*2, 2)])
                    base9 = p + pad
                else:
                    base9 = p
            # Now compute 10th and 11th digits
            digits = [int(d) for d in base9]
            # rule: 10th = ((sum of digits at odd positions * 7) - sum of digits at even positions) mod 10
            odd_sum = sum(digits[0::2])
            even_sum = sum(digits[1::2])
            d10 = ((odd_sum * 7) - even_sum) % 10
            d11 = (sum(digits) + d10) % 10
            return base9 + str(d10) + str(d11)

        # Iterate images
        import glob
        for img_path in glob.glob(os.path.join(images_dir, '*')):
            try:
                # Run OCR and extraction
                proc = svc.process_document(image_path=img_path, auto_crop=True)
                # Determine name and tc_partial
                name = None
                tc_partial = None
                if proc.get('patient_info') and isinstance(proc['patient_info'], dict):
                    name = proc['patient_info'].get('name')
                # try fallback: extract via service directly
                if not name:
                    try:
                        name_obj = svc.extract_patient_name(image_path=img_path)
                        if name_obj:
                            name = name_obj.get('name')
                    except Exception:
                        name = None
                # extract tc partial
                joined = '\n'.join([e.get('text') if isinstance(e, dict) and 'text' in e else str(e) for e in (proc.get('entities') or [])])
                # Use the same TC extraction utility
                def _extract_tc_simple(txt):
                    import re
                    if not txt:
                        return None
                    m2 = re.search(r"(\d{5,11})\*+", txt)
                    if m2:
                        return m2.group(1)
                    m3 = re.search(r"(\d{6,11})", txt)
                    if m3:
                        return m3.group(1)
                    return None
                tc_partial = _extract_tc_simple(joined)

                # If we have name or tc_partial, create patient
                if not name and not tc_partial:
                    errors.append({'image': img_path, 'reason': 'no name or tc found'})
                    continue

                # Normalize name into first/last
                first_name = None
                last_name = None
                if name:
                    parts = [p for p in name.replace('\n', ' ').split() if p]
                    if len(parts) >= 2:
                        first_name = parts[0]
                        last_name = ' '.join(parts[1:])
                    elif len(parts) == 1:
                        first_name = parts[0]
                        last_name = 'Test'

                # Build tc_number
                if tc_partial:
                    tc_full = _generate_tc_from_prefix(tc_partial)
                else:
                    tc_full = _generate_tc_from_prefix(first_name or '1')

                # Avoid duplicate tc_number
                existing = db.session.query(Patient).filter(func.replace(func.coalesce(Patient.tc_number, ''), ' ', '') == tc_full).first()
                if existing:
                    errors.append({'image': img_path, 'reason': 'tc already exists', 'tc': tc_full})
                    continue

                # Create patient object
                p = Patient()
                p.tc_number = tc_full
                p.first_name = first_name or (os.path.splitext(os.path.basename(img_path))[0])
                p.last_name = last_name or 'Test'
                p.phone = '+90 530 000 0000'
                p.email = None
                # Minimal required fields: phone may be required in model; adjust if not
                db.session.add(p)
                db.session.commit()
                created.append({'image': img_path, 'patient_id': p.id, 'tc': tc_full, 'name': f"{p.first_name} {p.last_name}"})
            except Exception as e:
                db.session.rollback()
                errors.append({'image': img_path, 'error': str(e)})
        return jsonify({'success': True, 'created': created, 'errors': errors}), 200
    except Exception as e:
        logger.exception('Seeding test patients failed')
        return jsonify({'success': False, 'error': str(e)}), 500
