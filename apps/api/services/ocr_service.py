"""Turkish Medical OCR service -- thin orchestrator.

Delegates to: ocr_result_normalizer, ocr_nlp_service, ocr_similarity_service.
"""
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
        self.medical_terms: dict = {}
        self.hf_ner = None
        self.hf_ner_available = False
        self.use_external_worker = False
        self.spaCy_available = False

    def initialize(self):
        """Initialise PaddleOCR, spaCy NLP and custom matchers."""
        self._init_paddleocr()
        self._detect_external_worker()
        self._init_spacy()
        self._init_hf_ner()
        self.spaCy_available = bool(self.nlp)
        self.initialized = True

    def _init_hf_ner(self):
        """Try to load HuggingFace Turkish NER model (PyTorch backend)."""
        try:
            os.environ.setdefault("TRANSFORMERS_FRAMEWORK", "pt")
            from transformers import pipeline
            self.hf_ner = pipeline(
                "ner",
                model="savasy/bert-base-turkish-ner-cased",
                tokenizer="savasy/bert-base-turkish-ner-cased",
                grouped_entities=True,
            )
            self.hf_ner_available = True
            logger.info("HuggingFace Turkish NER initialized successfully")
        except Exception as e:
            logger.info(f"HuggingFace NER not available (optional): {e}")
            self.hf_ner = None
            self.hf_ner_available = False

    def _init_paddleocr(self):
        try:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(lang="tr")
            self.paddleocr_available = True
            logger.info("PaddleOCR initialized successfully")
        except Exception as e:
            logger.warning(f"PaddleOCR not available: {e}")

    def _detect_external_worker(self):
        try:
            import sys, platform
            py_ver = tuple(sys.version_info[:2])
            machine = platform.machine().lower() if hasattr(platform, "machine") else ""
            self.use_external_worker = (
                (sys.platform == "darwin" and machine.startswith("arm"))
                or py_ver >= (3, 12))
        except Exception:
            self.use_external_worker = False

    def _init_spacy(self):
        from services.ocr_nlp_service import add_medical_patterns, load_medical_terms
        try:
            import spacy
            for model in ("tr_core_news_sm", "xx_ent_wiki_sm"):
                try:
                    self.nlp = spacy.load(model)
                    break
                except Exception:
                    continue
            if self.nlp is None:
                logger.info("No spaCy model; NLP features limited")
                return
            self.matcher = add_medical_patterns(self.nlp)
            self.medical_terms = load_medical_terms()
        except Exception as e:
            logger.warning(f"spaCy not available: {e}")

    def process_document(self, image_path=None, doc_type="medical",
                         text=None, auto_crop=False):
        """Process a medical document and return structured OCR + NLP data."""
        if not self.paddleocr_available and not self.nlp and text is None:
            raise RuntimeError("No OCR or NLP engine available")
        from services.ocr_nlp_service import (
            extract_custom_entities, classify_document, extract_medical_terms)
        ocr_result = self._run_ocr(image_path, text, auto_crop)
        joined_text = "\n".join(r["text"] for r in ocr_result)
        custom_entities = classification = medical_terms_found = None
        if joined_text:
            try:
                if self.matcher and self.nlp:
                    custom_entities = extract_custom_entities(
                        self.nlp, self.matcher, joined_text)
                classification = classify_document(joined_text)
                medical_terms_found = extract_medical_terms(
                    self.medical_terms, joined_text)
            except Exception as e:
                logger.warning(f"NLP processing failed: {e}")
        return {
            "entities": ocr_result, "custom_entities": custom_entities,
            "classification": classification, "medical_terms": medical_terms_found,
            "processing_time": datetime.now().isoformat(),
        }

    def _run_ocr(self, image_path, text, auto_crop):
        """Return normalised OCR entities from text or image."""
        if text and isinstance(text, str):
            return [{"text": line, "confidence": 1.0}
                    for line in text.splitlines() if line.strip()]
        if not (image_path and self.paddleocr_available):
            return []
        from services.ocr_result_normalizer import normalize_ocr_result
        path = self._prepare_image(image_path, auto_crop)
        raw = self._ocr_with_fallback(path)
        try:
            if raw is None:
                raise RuntimeError("Empty OCR result")
            return normalize_ocr_result(raw)
        except Exception as e:
            logger.error(f"OCR process_document failed: {e}")
            return []

    def _prepare_image(self, image_path, auto_crop):
        """Optionally crop and resize the image for OCR."""
        path = image_path
        if auto_crop:
            try:
                from backend.utils.document_scanner import auto_crop_image
                cropped = auto_crop_image(image_path)
                if cropped:
                    path = cropped
            except Exception:
                pass
        safe_path, _ = self._ensure_safe_image(path, max_side=1200)
        return safe_path

    def _ocr_with_fallback(self, image_path):
        """Try external worker, then in-process, then Tesseract fallback."""
        raw = None
        if self.use_external_worker:
            try:
                raw = self._external_paddle_ocr(image_path)
            except Exception as e:
                logger.warning(f"External paddle worker failed: {e}")
        if raw is None and self.ocr is not None:
            try:
                raw = self._safe_ocr_call(image_path)
            except Exception as e:
                logger.error(f"In-process OCR failed: {e}")
        if raw is None:
            try:
                raw = self._external_paddle_ocr(image_path)
            except Exception:
                pass
        # EasyOCR fallback when PaddleOCR produces no results
        if raw is None:
            raw = self._easyocr_fallback(image_path)
        return raw

    def _easyocr_fallback(self, image_path):
        """Try EasyOCR as fallback (optional, requires easyocr package).

        EasyOCR has strong Turkish language support and serves as a reliable
        alternative when PaddleOCR fails or produces empty results.
        """
        try:
            import easyocr
            if not hasattr(self, "_easyocr_reader"):
                self._easyocr_reader = easyocr.Reader(
                    ["tr", "en"], gpu=False, verbose=False)
            results = self._easyocr_reader.readtext(image_path)
            if results:
                logger.info("EasyOCR fallback produced %d results", len(results))
                return [
                    {"text": text.strip(), "confidence": float(conf)}
                    for _, text, conf in results
                    if text and text.strip()
                ]
        except ImportError:
            logger.debug("easyocr not installed, skipping EasyOCR fallback")
        except Exception as e:
            logger.debug(f"EasyOCR fallback failed: {e}")
        return None

    def calculate_similarity(self, image_path1=None, image_path2=None,
                             text1=None, text2=None):
        from services.ocr_similarity_service import calculate_similarity as _calc
        return _calc(self.nlp, self._safe_ocr_call,
                     image_path1, image_path2, text1, text2)

    def extract_patient_name(self, image_path=None, text=None):
        from services.ocr_nlp_service import extract_patient_name as _extract
        return _extract(self.nlp, self.matcher, self.hf_ner, self.medical_terms,
                        self.paddleocr_available, self._safe_ocr_call,
                        image_path, text)

    def _safe_ocr_call(self, image_path):
        """Call PaddleOCR with version-resilient fallbacks."""
        import inspect
        if not self.ocr:
            raise RuntimeError("OCR engine not initialized")
        func = getattr(self.ocr, "ocr", None)
        if func:
            try:
                return func(image_path)
            except Exception:
                try:
                    sig = inspect.signature(func)
                    if "cls" in sig.parameters:
                        return func(image_path, cls=True)
                except Exception:
                    pass
                if hasattr(self.ocr, "predict"):
                    return self.ocr.predict(image_path)
        if hasattr(self.ocr, "predict"):
            return self.ocr.predict(image_path)
        if callable(self.ocr):
            return self.ocr(image_path)
        raise RuntimeError("No compatible OCR call found")

    def _ensure_safe_image(self, image_path, max_side=4000):
        """Resize if needed. Returns ``(path, is_temp)``."""
        try:
            import cv2, tempfile
            img = cv2.imread(image_path)
            if img is None:
                return image_path, False
            h, w = img.shape[:2]
            if max(h, w) <= max_side:
                return image_path, False
            scale = max_side / float(max(h, w))
            resized = cv2.resize(img, (int(w * scale), int(h * scale)),
                                 interpolation=cv2.INTER_AREA)
            ext = os.path.splitext(image_path)[1]
            fd, out_path = tempfile.mkstemp(prefix="ocr_resize_", suffix=ext)
            os.close(fd)
            if out_path.lower().endswith((".jpg", ".jpeg")):
                cv2.imwrite(out_path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            else:
                cv2.imwrite(out_path, resized)
            return out_path, True
        except Exception as e:
            logger.warning(f"_ensure_safe_image failed: {e}")
            return image_path, False

    def _external_paddle_ocr(self, image_path):
        """Run PaddleOCR in an external process (timeout 60 s)."""
        import json, shutil, subprocess, sys
        candidates = [
            sys.executable, "/opt/homebrew/opt/python@3.13/bin/python3.13",
            "/usr/bin/python3", "/usr/local/bin/python3",
            shutil.which("python3") or "",
        ]
        worker_script = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "paddle_worker.py"))
        for py in (c for c in candidates if c):
            try:
                proc = subprocess.run(
                    [py, worker_script, image_path],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
                if proc.returncode != 0:
                    logger.debug("worker stderr: %s", proc.stderr.decode("utf-8")[:400])
                    continue
                data = json.loads(proc.stdout.decode("utf-8") or "{}")
                if isinstance(data, dict) and "entities" in data:
                    return data["entities"]
            except Exception as e:
                logger.debug(f"_external_paddle_ocr {py} failed: {e}")
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
