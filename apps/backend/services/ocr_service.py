from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

_nlp_service = None

class TurkishMedicalOCR:
    def __init__(self):
        self.ocr = None
        self.initialized = False
        self.paddleocr_available = False
        self.nlp = None
        self.matcher = None
        self.medical_terms = {}

    def initialize(self):
        """Initialize PaddleOCR and (optionally) spaCy NLP and custom matchers."""
        # Initialize PaddleOCR (optional)
        try:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(lang='tr')
            self.paddleocr_available = True
            logger.info("✅ PaddleOCR initialized successfully")
        except Exception as e:
            logger.warning(f"PaddleOCR not available: {e}")
            self.ocr = None
            self.paddleocr_available = False

        # Decide whether to use an external worker to isolate native crashes
        try:
            import sys, platform
            py_ver = tuple(sys.version_info[:2])
            machine = platform.machine().lower() if hasattr(platform, 'machine') else ''
            # On macOS Apple Silicon (arm64) and newer Python versions we prefer an external worker
            self.use_external_worker = (sys.platform == 'darwin' and machine.startswith('arm')) or (py_ver >= (3, 12))
            logger.info(f"use_external_worker={self.use_external_worker} (platform={sys.platform}, machine={machine}, py_ver={py_ver})")
        except Exception:
            self.use_external_worker = False

        # Initialize spaCy (optional) for richer entity extraction/classification
        try:
            import spacy
            # Prefer a small Turkish model if available, otherwise use a multilingual model
            try:
                self.nlp = spacy.load('tr_core_news_sm')
            except Exception:
                try:
                    self.nlp = spacy.load('xx_ent_wiki_sm')
                except Exception:
                    self.nlp = None
                    logger.info('No spaCy model available; NLP features will be limited')

            if self.nlp:
                # Import matcher lazily
                from spacy.matcher import Matcher
                self.matcher = Matcher(self.nlp.vocab)
                # Setup medical patterns/terms
                self._add_medical_patterns()
                self._load_medical_terms()
        except Exception as e:
            logger.warning(f"spaCy not available: {e}")
            self.nlp = None
            self.matcher = None

        # Try to load a local HuggingFace Turkish NER model for improved name extraction
        try:
            from transformers import pipeline
            # Model: savasy/bert-base-turkish-ner-cased is a lightweight Turkish NER model
            self.hf_ner = pipeline('ner', model='savasy/bert-base-turkish-ner-cased', tokenizer='savasy/bert-base-turkish-ner-cased', grouped_entities=True)
            self.hf_ner_available = True
            logger.info('✅ HuggingFace Turkish NER loaded (savasy/bert-base-turkish-ner-cased)')
        except Exception as e:
            logger.warning(f'HuggingFace NER not available: {e}')
            self.hf_ner = None
            self.hf_ner_available = False

        # Expose flags for diagnostics/health checks
        try:
            self.spaCy_available = bool(self.nlp)
        except Exception:
            self.spaCy_available = False

        self.initialized = True

    def _add_medical_patterns(self):
        """Add custom medical patterns to the spaCy matcher."""
        if not self.nlp:
            return
        try:
            from spacy.matcher import Matcher
            matcher = Matcher(self.nlp.vocab)

            # TC Number pattern (11 digits)
            tc_pattern = [{"TEXT": {"REGEX": r"\d{11}"}}]
            matcher.add("TC_NUMBER", [tc_pattern])

            # Medical device patterns
            device_patterns = [
                [{"LOWER": "işitme"}, {"LOWER": "cihazı"}],
                [{"LOWER": "hearing"}, {"LOWER": "aid"}],
                [{"LOWER": "koklear"}, {"LOWER": "implant"}],
                [{"LOWER": "cochlear"}, {"LOWER": "implant"}]
            ]
            matcher.add("MEDICAL_DEVICE", device_patterns)

            # Medical condition patterns
            condition_patterns = [
                [{"LOWER": "işitme"}, {"LOWER": "kaybı"}],
                [{"LOWER": "hearing"}, {"LOWER": "loss"}],
                [{"LOWER": "sağırlık"}],
                [{"LOWER": "tinnitus"}],
                [{"LOWER": "vertigo"}]
            ]
            matcher.add("MEDICAL_CONDITION", condition_patterns)

            # Patient name patterns
            patient_patterns = [
                [{"LOWER": "hasta"}, {"LOWER": "adi"}, {"LOWER": "soyadi"}, {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True, "LENGTH": {">=": 2}}],
                [{"LOWER": "hasta"}, {"LOWER": "adı"}, {"LOWER": "soyadı"}, {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True, "LENGTH": {">=": 2}}],
                [{"LOWER": "patient"}, {"LOWER": "name"}, {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True, "LENGTH": {">=": 2}}]
            ]
            matcher.add("PATIENT_NAME", patient_patterns)

            # Doctor/staff patterns (to exclude)
            doctor_patterns = [
                [{"LOWER": "dr"}, {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True}],
                [{"LOWER": "doktor"}, {"IS_ALPHA": True}],
            ]
            matcher.add("DOCTOR_STAFF", doctor_patterns)

            self.matcher = matcher
        except Exception as e:
            logger.warning(f"Failed to add medical patterns: {e}")

    def _load_medical_terms(self):
        """Load domain-specific terminology used for heuristic classification and extraction."""
        self.medical_terms = {
            "hearing_conditions": [
                "işitme kaybı", "işitme azalması", "sağırlık", "hearing loss",
                "sensörinöral işitme kaybı", "iletim tipi işitme kaybı",
                "karma tip işitme kaybı", "presbyküzi", "ototoksisite"
            ],
            "devices": [
                "işitme cihazı", "hearing aid", "işitme aleti",
                "BTE", "ITE", "CIC", "RIC", "kulak arkası cihaz",
                "kulak içi cihaz", "koklear implant", "cochlear implant"
            ],
            "procedures": [
                "odyometri", "audiometry", "işitme testi",
                "timpanometri", "ABR", "ameliyat", "surgery"
            ]
        }

    def process_document(self, image_path=None, doc_type="medical", text=None, auto_crop=False):
        """Process medical document with PaddleOCR and optional spaCy entity extraction.

        Accepts either a local image path (image_path) to run OCR on, or raw extracted text (text)
        which will be processed by NLP only. If auto_crop=True, the image will be cropped using
        the document scanner helper before OCR to improve OCR quality.
        Returns a dict including raw OCR entities and (if spaCy available) custom entities,
        classification and found medical terms.
        """
        if not self.paddleocr_available and not self.nlp and text is None:
            raise RuntimeError("No OCR or NLP engine available")

        ocr_result = []

        # If caller supplied raw text, skip OCR and use that text for NLP processing
        if text and isinstance(text, str):
            ocr_result = [{"text": line, "confidence": 1.0} for line in text.splitlines() if line.strip()]
        else:
            # Try OCR if PaddleOCR is available and an image_path is provided
            if image_path and self.paddleocr_available:
                # Optionally crop the document first
                if auto_crop:
                    try:
                        from backend.utils.document_scanner import auto_crop_image
                        cropped = auto_crop_image(image_path)
                        if cropped:
                            image_path_to_use = cropped
                        else:
                            image_path_to_use = image_path
                    except Exception:
                        image_path_to_use = image_path
                else:
                    image_path_to_use = image_path

                # Ensure image dimensions are within safe bounds for PaddleOCR (smaller to increase stability)
                try:
                    # Use a conservative max_side for worker calls to avoid native OOMs
                    image_path_to_use = self._ensure_safe_image(image_path_to_use, max_side=1200)
                except Exception:
                    pass

                # Prefer external worker on platforms prone to native crashes
                raw_result = None
                if getattr(self, 'use_external_worker', False):
                    try:
                        raw_result = self._external_paddle_ocr(image_path_to_use)
                    except Exception as e:
                        logger.warning(f"External paddle worker failed: {e}")
                        raw_result = None

                # If external worker didn't return results, try the in-process call as fallback
                if raw_result is None and self.ocr is not None:
                    try:
                        raw_result = self._safe_ocr_call(image_path_to_use)
                    except Exception as e:
                        logger.error(f"In-process OCR failed: {e}")
                        raw_result = None

                # If still none, try one last time with external worker but allowing alternative interpreters
                if raw_result is None:
                    try:
                        raw_result = self._external_paddle_ocr(image_path_to_use)
                    except Exception:
                        raw_result = None

                try:
                    if raw_result is None:
                        raise RuntimeError('Empty OCR result')

                    # If external worker returned structured entities (list of {'text','confidence'}) use directly
                    if isinstance(raw_result, list) and all(isinstance(x, dict) and 'text' in x for x in raw_result):
                        for r in raw_result:
                            txt = str(r.get('text'))
                            conf = float(r.get('confidence', 1.0)) if r.get('confidence') is not None else 1.0
                            ocr_result.append({"text": txt.strip(), "confidence": conf})
                    else:
                        # Normalize several possible return shapes into list of (text, confidence)
                        if isinstance(raw_result, dict) and 'text' in raw_result:
                            txt = str(raw_result.get('text'))
                            conf = float(raw_result.get('confidence', 1.0)) if raw_result.get('confidence') is not None else 1.0
                            ocr_result.append({"text": txt, "confidence": conf})
                        else:
                            for line in raw_result:
                                if isinstance(line, (list, tuple)):
                                    for res in line:
                                        if isinstance(res, (list, tuple)) and len(res) >= 2:
                                            maybe_text = res[1]
                                            if isinstance(maybe_text, (list, tuple)) and len(maybe_text) >= 1:
                                                text_val = maybe_text[0]
                                                confidence = maybe_text[1] if len(maybe_text) > 1 else 1.0
                                            else:
                                                text_val = maybe_text
                                                confidence = 1.0
                                        elif isinstance(res, dict) and 'text' in res:
                                            text_val = res.get('text')
                                            confidence = res.get('confidence', 1.0)
                                        else:
                                            text_val = str(res)
                                            confidence = 1.0

                                        ocr_result.append({"text": str(text_val).strip(), "confidence": float(confidence) if confidence is not None else 1.0})
                                elif isinstance(line, dict) and 'text' in line:
                                    ocr_result.append({"text": str(line.get('text')), "confidence": float(line.get('confidence', 1.0))})
                                else:
                                    ocr_result.append({"text": str(line), "confidence": 1.0})
                except Exception as e:
                    logger.error(f"OCR process_document failed: {e}")

        # Compose richer result
        custom_entities = None
        classification = None
        medical_terms_found = None
        joined_text = '\n'.join([r['text'] for r in ocr_result])

        if (self.nlp or True) and joined_text:
            try:
                if self.matcher and self.nlp:
                    custom_entities = self._extract_custom_entities(joined_text)
                classification = self._classify_document(joined_text, None)
                medical_terms_found = self._extract_medical_terms(joined_text)
            except Exception as e:
                logger.warning(f"NLP processing failed: {e}")

        return {
            "entities": ocr_result,
            "custom_entities": custom_entities,
            "classification": classification,
            "medical_terms": medical_terms_found,
            "processing_time": datetime.now().isoformat()
        }

    def calculate_similarity(self, image_path1=None, image_path2=None, text1=None, text2=None):
        """Calculate similarity between two images or two text inputs.

        If text1/text2 are provided, perform NLP-based similarity. If image paths
        are provided, run OCR on both (if available) and compare extracted text.

        Returns a dict { 'similarity': float(0..1), 'method': 'spacy|jaccard|lexical', ... }
        """
        try:
            # Prepare texts
            if text1 is None and image_path1 and self.paddleocr_available and self.ocr is not None:
                try:
                    safe1 = self._ensure_safe_image(image_path1)
                    res1 = self._safe_ocr_call(safe1)
                    # Normalize result to text
                    text1 = ' '.join([ (r[1][0] if isinstance(r[1], (list, tuple)) else str(r[1])) for line in res1 for r in line])
                except Exception as e:
                    logger.warning(f"OCR for image_path1 failed: {e}")
                    text1 = ''

            if text2 is None and image_path2 and self.paddleocr_available and self.ocr is not None:
                try:
                    safe2 = self._ensure_safe_image(image_path2)
                    res2 = self._safe_ocr_call(safe2)
                    text2 = ' '.join([ (r[1][0] if isinstance(r[1], (list, tuple)) else str(r[1])) for line in res2 for r in line])
                except Exception as e:
                    logger.warning(f"OCR for image_path2 failed: {e}")
                    text2 = ''

            text1 = (text1 or '')
            text2 = (text2 or '')

            # If both empty, return zero similarity
            if not text1 and not text2:
                return {"similarity": 0.0, "method": "none"}

            # If spaCy is available, use vector similarity which is usually better
            if self.nlp:
                try:
                    doc1 = self.nlp(text1)
                    doc2 = self.nlp(text2)
                    sim = doc1.similarity(doc2)
                    # spaCy similarity can sometimes be >1 or <0 in some versions; clamp
                    sim = max(0.0, min(float(sim), 1.0))
                    return {"similarity": sim, "method": "spacy", "text1_tokens": len(doc1), "text2_tokens": len(doc2)}
                except Exception as e:
                    logger.warning(f"spaCy similarity failed: {e}")

            # Fallback heuristics: Jaccard on token sets + normalized Levenshtein
            tokens1 = self._simple_tokenize(text1)
            tokens2 = self._simple_tokenize(text2)

            set1 = set(tokens1)
            set2 = set(tokens2)

            intersection = len(set1 & set2)
            union = len(set1 | set2) or 1
            jaccard = intersection / union

            # Lexical similarity via normalized Levenshtein on joined strings
            lev = self._normalized_levenshtein(' '.join(tokens1), ' '.join(tokens2))

            # Weighted combination
            similarity = (jaccard * 0.6) + (lev * 0.4)
            similarity = max(0.0, min(similarity, 1.0))

            return {
                "similarity": similarity,
                "method": "jaccard+levenshtein",
                "jaccard": jaccard,
                "levenshtein": lev,
                "tokens1": len(tokens1),
                "tokens2": len(tokens2)
            }

        except Exception as e:
            logger.error(f"calculate_similarity failed: {e}")
            return {"similarity": 0.0, "method": "error", "error": str(e)}

    def _simple_tokenize(self, text):
        if not text:
            return []
        import re
        tokens = re.findall(r"[\wğüşöçıİĞÜŞÖÇ]+", text.lower())
        return [t for t in tokens if len(t) > 1]

    def _normalized_levenshtein(self, s1, s2):
        try:
            if not s1 and not s2:
                return 1.0
            if not s1 or not s2:
                return 0.0
            # Use python-Levenshtein if available for speed
            try:
                import importlib
                levmod = importlib.import_module('Levenshtein')
                dist = levmod.distance(s1, s2)
                maxlen = max(len(s1), len(s2))
                return max(0.0, 1.0 - (dist / maxlen))
            except Exception:
                # Pure Python fallback
                return self._levenshtein_ratio(s1, s2)
        except Exception as e:
            logger.warning(f"_normalized_levenshtein error: {e}")
            return 0.0

    def _levenshtein_ratio(self, a, b):
        # Return ratio in range 0..1
        if a == b:
            return 1.0
        la = len(a)
        lb = len(b)
        if la == 0 or lb == 0:
            return 0.0
        # Initialize matrix
        prev = list(range(lb + 1))
        for i, ca in enumerate(a, 1):
            curr = [i] + [0] * lb
            for j, cb in enumerate(b, 1):
                cost = 0 if ca == cb else 1
                curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
            prev = curr
        dist = prev[-1]
        maxlen = max(la, lb)
        return max(0.0, 1.0 - (dist / maxlen))

    def _extract_custom_entities(self, text):
        """Extract custom medical entities using spaCy matcher."""
        if not self.nlp or not self.matcher:
            return []
        try:
            doc = self.nlp(text)
            matches = self.matcher(doc)
            custom_entities = []
            for match_id, start, end in matches:
                span = doc[start:end]
                label = self.nlp.vocab.strings[match_id]
                custom_entities.append({
                    "text": span.text,
                    "label": label,
                    "start": span.start_char,
                    "end": span.end_char,
                    "confidence": 0.9
                })
            return custom_entities
        except Exception as e:
            logger.warning(f"_extract_custom_entities error: {e}")
            return []

    def _classify_document(self, text, doc=None):
        """Classify medical document type using simple heuristics."""
        try:
            text_lower = text.lower()
            if any(term in text_lower for term in ["sgk", "sosyal güvenlik", "cihaz raporu"]):
                return {"type": "sgk_device_report", "confidence": 0.95}
            elif any(term in text_lower for term in ["reçete", "prescription", "ilaç"]):
                return {"type": "prescription", "confidence": 0.90}
            elif any(term in text_lower for term in ["odyometri", "audiometry", "işitme testi"]):
                return {"type": "audiometry_report", "confidence": 0.88}
            elif any(term in text_lower for term in ["rapor", "muayene", "bulgular"]):
                return {"type": "medical_report", "confidence": 0.75}
            else:
                return {"type": "other", "confidence": 0.50}
        except Exception as e:
            logger.warning(f"_classify_document error: {e}")
            return {"type": "unknown", "confidence": 0.0}

    def _extract_medical_terms(self, text):
        """Extract known medical terms from text heuristically."""
        found_terms = []
        try:
            text_lower = text.lower()
            for category, terms in (self.medical_terms or {}).items():
                for term in terms:
                    if term.lower() in text_lower:
                        found_terms.append({
                            "term": term,
                            "category": category,
                            "start": text_lower.find(term.lower()),
                            "end": text_lower.find(term.lower()) + len(term)
                        })
        except Exception as e:
            logger.warning(f"_extract_medical_terms error: {e}")
        return found_terms

    def process_document_old(self, image_path=None, doc_type="medical", text=None):
        """Process medical document with PaddleOCR and optional spaCy entity extraction.

        Accepts either a local image path (image_path) to run OCR on, or raw extracted text (text)
        which will be processed by NLP only. Returns a dict including raw OCR entities and
        (if spaCy available) custom entities, classification and found medical terms.
        """
        if not self.paddleocr_available and not self.nlp and text is None:
            raise RuntimeError("No OCR or NLP engine available")

        ocr_result = []

        # If caller supplied raw text, skip OCR and use that text for NLP processing
        if text and isinstance(text, str):
            ocr_result = [{"text": line, "confidence": 1.0} for line in text.splitlines() if line.strip()]
        else:
            # Try OCR if PaddleOCR is available and an image_path is provided
            if image_path and self.paddleocr_available and self.ocr is not None:
                try:
                    raw_result = self._safe_ocr_call(image_path)

                    # Normalize several possible return shapes into list of (text, confidence)
                    # Common shapes: list[list[[box], (text, conf)]] or list of dicts
                    if raw_result is None:
                        raise RuntimeError('Empty OCR result')

                    # If dict-like with 'text' keys
                    if isinstance(raw_result, dict) and 'text' in raw_result:
                        # Single result
                        txt = str(raw_result.get('text'))
                        conf = float(raw_result.get('confidence', 1.0)) if raw_result.get('confidence') is not None else 1.0
                        ocr_result.append({"text": txt, "confidence": conf})
                    else:
                        # Iterate nested structures
                        try:
                            for line in raw_result:
                                # line may be list of items
                                if isinstance(line, (list, tuple)):
                                    for res in line:
                                        # res may be [box, (text, conf)] or ((text, conf), box)
                                        if isinstance(res, (list, tuple)) and len(res) >= 2:
                                            maybe_text = res[1]
                                            if isinstance(maybe_text, (list, tuple)) and len(maybe_text) >= 1:
                                                text_val = maybe_text[0]
                                                confidence = maybe_text[1] if len(maybe_text) > 1 else 1.0
                                            else:
                                                # sometimes res[1] may be string
                                                text_val = maybe_text
                                                confidence = 1.0
                                        elif isinstance(res, dict) and 'text' in res:
                                            text_val = res.get('text')
                                            confidence = res.get('confidence', 1.0)
                                        else:
                                            # Fallback stringified
                                            text_val = str(res)
                                            confidence = 1.0

                                        ocr_result.append({"text": str(text_val).strip(), "confidence": float(confidence) if confidence is not None else 1.0})
                                elif isinstance(line, dict) and 'text' in line:
                                    ocr_result.append({"text": str(line.get('text')), "confidence": float(line.get('confidence', 1.0))})
                                else:
                                    # Unexpected shape, stringify
                                    ocr_result.append({"text": str(line), "confidence": 1.0})
                        except Exception:
                            # Last resort: stringify the whole raw_result
                            ocr_result.append({"text": str(raw_result), "confidence": 1.0})
                except Exception as e:
                    logger.error(f"OCR process_document failed: {e}")

        # Compose richer result
        custom_entities = None
        classification = None
        medical_terms_found = None
        joined_text = '\n'.join([r['text'] for r in ocr_result])

        if (self.nlp or True) and joined_text:
            try:
                if self.matcher and self.nlp:
                    custom_entities = self._extract_custom_entities(joined_text)
                classification = self._classify_document(joined_text, None)
                medical_terms_found = self._extract_medical_terms(joined_text)
            except Exception as e:
                logger.warning(f"NLP processing failed: {e}")

        return {
            "entities": ocr_result,
            "custom_entities": custom_entities,
            "classification": classification,
            "medical_terms": medical_terms_found,
            "processing_time": datetime.now().isoformat()
        }

    def extract_patient_name(self, image_path=None, text=None):
        """Extract patient name from OCR results using heuristic patterns and spaCy NER.

        Accepts either an image_path (will OCR it) or raw text. Returns a dict or None.
        """
        if not self.paddleocr_available and not self.nlp and not text:
            raise RuntimeError("No OCR or NLP engine available")

        ocr_lines = []
        if text and isinstance(text, str):
            # Use provided text directly
            ocr_lines = [l for l in text.splitlines() if l.strip()]
        elif self.paddleocr_available and image_path:
            try:
                # Prefer external worker to avoid crashing main process
                raw_result = None
                try:
                    if getattr(self, 'use_external_worker', False):
                        raw_result = self._external_paddle_ocr(image_path)
                    else:
                        raw_result = self._safe_ocr_call(image_path)
                except Exception:
                    raw_result = None

                if raw_result:
                    if isinstance(raw_result, list) and all(isinstance(x, dict) and 'text' in x for x in raw_result):
                        ocr_lines.extend([str(x['text']) for x in raw_result if x.get('text')])
                    else:
                        # Normalize the other shapes
                        if isinstance(raw_result, dict) and 'rec_texts' in raw_result:
                            ocr_lines.extend([str(t) for t in raw_result.get('rec_texts', [])])
                        else:
                            for line in raw_result:
                                if isinstance(line, (list, tuple)):
                                    for res in line:
                                        try:
                                            text_val = res[1][0]
                                        except Exception:
                                            text_val = res[1] if isinstance(res[1], str) else str(res[1])
                                        ocr_lines.append(str(text_val))
                                elif isinstance(line, dict) and 'text' in line:
                                    ocr_lines.append(str(line.get('text')))
            except Exception as e:
                logger.warning(f"extract_patient_name OCR failed: {e}")

        full_text = '\n'.join(ocr_lines)

        # Prefer spaCy NER when available
        try:
            # If HuggingFace NER is available, prefer it for Turkish NER (PERSON extraction)
            if getattr(self, 'hf_ner', None):
                try:
                    hf_ents = self.hf_ner(full_text)
                    # hf_ner with grouped_entities returns [{'entity_group':'PER','score':..., 'word':'...'}]
                    person_candidates = [e for e in hf_ents if e.get('entity_group') in ('PER', 'PERSON')]
                    if person_candidates:
                        # pick the best-scoring candidate
                        person_candidates.sort(key=lambda e: e.get('score', 0), reverse=True)
                        best = person_candidates[0]
                        return {"name": best.get('word').strip(), "confidence": float(best.get('score', 0.9))}
                except Exception as e:
                    logger.warning(f"HF NER failed: {e}")
            if self.nlp:
                doc = self.nlp(full_text)
                # Try common PERSON labels (depends on model - could be 'PER' or 'PERSON')
                person_labels = set(['PER', 'PERSON', 'Person', 'PERSON_NAME'])
                person_entities = [ent for ent in getattr(doc, 'ents', []) if ent.label_ in person_labels]
                if person_entities:
                    # Pick the longest PERSON span (heuristic)
                    person_entities.sort(key=lambda e: len(e.text), reverse=True)
                    best = person_entities[0]
                    return {"name": best.text.strip(), "confidence": 0.95}
        except Exception:
            # Ignore NER failures and fall back to heuristics
            pass

        # Heuristic regex-based extraction
        import re
        patterns = [r'HASTA\s+ADI?\s+SOYADI?\s*[:\-]\s*(.+)', r'PATIENT\s+NAME\s*[:\-]\s*(.+)', r'Hasta Bilgileri\s*[:\-]\s*(.+)']
        for text_line in ocr_lines:
            for pattern in patterns:
                match = re.search(pattern, text_line, re.IGNORECASE)
                if match:
                    name = match.group(1).strip()
                    # Basic cleaning
                    name = re.sub(r'[^A-Za-zÇĞİÖŞÜçğıöşü\s\-]', '', name).strip()
                    if len(name.split()) >= 2:
                        return {"name": name, "confidence": 0.9}

        # New heuristic: label on one line and actual name on the following OCR line
        try:
            for i, text_line in enumerate(ocr_lines):
                lowered = text_line.lower()
                if 'hasta' in lowered and ('adi' in lowered or 'ad' in lowered) and ('soyad' in lowered or 'soyadı' in lowered):
                    # Look at next non-empty line for a probable name
                    j = i + 1
                    while j < len(ocr_lines) and not ocr_lines[j].strip():
                        j += 1
                    if j < len(ocr_lines):
                        candidate = ocr_lines[j].strip()
                        # Clean candidate and check for name-like shape (at least two words, letters only)
                        candidate_clean = re.sub(r'[^A-Za-zÇĞİÖŞÜçğıöşü\s\-]', '', candidate).strip()
                        if len(candidate_clean.split()) >= 2 and any(w[0].isupper() for w in candidate_clean.split() if len(w) > 0):
                            return {"name": candidate_clean, "confidence": 0.88}
        except Exception:
            pass

        # If matcher is present, try to find PATIENT_NAME
        if self.nlp and self.matcher:
            try:
                ents = self._extract_custom_entities(full_text)
                patient_matches = [e for e in ents if e.get('label') == 'PATIENT_NAME']
                if patient_matches:
                    return {"name": patient_matches[0]['text'], "confidence": patient_matches[0].get('confidence', 0.9)}
            except Exception:
                pass

        return None

    def _safe_ocr_call(self, image_path):
        """Call the underlying PaddleOCR object in a way that's compatible with
        multiple paddleocr versions. Tries to inspect the signature and fall
        back to common method names.
        Returns the raw result from the OCR library.
        """
        import inspect
        if not self.ocr:
            raise RuntimeError('OCR engine not initialized')

        # Prefer .ocr if available
        func = getattr(self.ocr, 'ocr', None)
        if func:
            try:
                # Prefer calling without 'cls' to avoid implementations that forward kwargs
                try:
                    return func(image_path)
                except Exception:
                    # If plain call fails, and signature suggests 'cls', try with it
                    try:
                        sig = inspect.signature(func)
                        if 'cls' in sig.parameters:
                            return func(image_path, cls=True)
                    except Exception:
                        pass
                    # As last resort try predict
                    if hasattr(self.ocr, 'predict'):
                        return self.ocr.predict(image_path)
            except Exception as e:
                # Try further fallbacks
                try:
                    if hasattr(self.ocr, 'predict'):
                        return self.ocr.predict(image_path)
                except Exception:
                    raise e

        # Try common alternative name
        func2 = getattr(self.ocr, 'predict', None)
        if func2:
            try:
                return func2(image_path)
            except TypeError:
                # If predict doesn't accept the args we try passing no kwargs
                return func2(image_path)

        # Last resort: try calling as callable
        if callable(self.ocr):
            return self.ocr(image_path)

        raise RuntimeError('No compatible OCR call found')

    def _ensure_safe_image(self, image_path, max_side=4000):
        """Ensure the image is not larger than max_side on any axis. If it is,
        create a resized temporary copy and return that path. Otherwise return
        the original path.
        """
        try:
            import cv2
            import tempfile
            import os

            img = cv2.imread(image_path)
            if img is None:
                return image_path
            h, w = img.shape[:2]
            if max(h, w) <= max_side:
                return image_path

            scale = max_side / float(max(h, w))
            new_w = int(w * scale)
            new_h = int(h * scale)
            resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            fd, out_path = tempfile.mkstemp(prefix='ocr_resize_', suffix=os.path.splitext(image_path)[1])
            os.close(fd)
            # Save with reasonable quality
            if out_path.lower().endswith(('.jpg', '.jpeg')):
                cv2.imwrite(out_path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            else:
                cv2.imwrite(out_path, resized)
            return out_path
        except Exception as e:
            logger.warning(f"_ensure_safe_image failed: {e}")
            return image_path

    def _external_paddle_ocr(self, image_path):
        """Invoke an external system Python process to run PaddleOCR if local
        invocation is unreliable. Returns a list of entity dicts or None."""
        import subprocess
        import json
        import shutil
        import os
        import sys

        # Prefer the current virtualenv's python executable first, then common locations
        candidates = [
            sys.executable,
            '/opt/homebrew/opt/python@3.13/bin/python3.13',
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            shutil.which('python3') or ''
        ]
        worker_script = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'paddle_worker.py'))
        # Try current interpreter first (safer in virtualenvs), then fall back to candidates.
        tried = []
        for py in [c for c in candidates if c]:
            try:
                tried.append(py)
                proc = subprocess.run([py, worker_script, image_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
                if proc.returncode != 0:
                    # continue trying other candidates
                    logger.debug(f"worker stderr: {proc.stderr.decode('utf-8')[:400]}")
                    continue
                try:
                    data = json.loads(proc.stdout.decode('utf-8') or '{}')
                    if isinstance(data, dict) and 'entities' in data:
                        return data['entities']
                except Exception as e:
                    logger.debug(f"Failed to parse worker JSON output from {py}: {e} -- stdout: {proc.stdout[:200]} stderr: {proc.stderr[:200]}")
                    continue
            except Exception as e:
                logger.debug(f"_external_paddle_ocr candidate {py} failed: {e}")
                continue
        logger.warning(f"_external_paddle_ocr: no working python candidates tried: {tried}")
        return None

def get_nlp_service(init_if_missing=True):
    global _nlp_service
    if _nlp_service is None and init_if_missing:
        _nlp_service = TurkishMedicalOCR()
    return _nlp_service


def initialize_nlp_service():
    svc = get_nlp_service(init_if_missing=True)
    if svc is None:
        svc = TurkishMedicalOCR()
    svc.initialize()
    return svc
