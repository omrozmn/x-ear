#!/usr/bin/env python3
"""
Simple command-line PaddleOCR worker script.
Usage: python paddle_worker.py /path/to/image [--use-gpu]
Prints JSON array of entities: [{"text":..., "confidence":...}, ...]
"""
import sys
import json

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'no path provided'}))
        sys.exit(1)
    path = sys.argv[1]
    # Allow explicit GPU usage via flag, but default to CPU on macOS M-series to avoid native crashes
    use_gpu = False
    if len(sys.argv) > 2 and sys.argv[2] == '--use-gpu':
        use_gpu = True
    try:
        import paddle
        # Force Paddle to use CPU unless explicitly overridden by --use-gpu
        if not use_gpu:
            try:
                paddle.set_device('cpu')
            except Exception:
                # If set_device fails, continue and let Paddle decide
                pass
        from paddleocr import PaddleOCR
        # Prefer CPU by default on Apple Silicon (M-series);
        # we already attempted to set paddle device above; leave PaddleOCR instantiation minimal.
        ocr = PaddleOCR(lang='tr')
        # Try standard ocr call without extra kwargs
        raw = ocr.ocr(path) if hasattr(ocr, 'ocr') else ocr.predict(path)
        entities = []
        # If PaddleOCR returned a dict-like object at index 0 (list) or directly a dict, handle both
        if isinstance(raw, dict):
            rec_texts = raw.get('rec_texts') or raw.get('rec_res') or raw.get('texts')
            rec_scores = raw.get('rec_scores') or raw.get('rec_res_scores') or raw.get('scores')
            if rec_texts:
                for idx, t in enumerate(rec_texts):
                    score = 1.0
                    if rec_scores and idx < len(rec_scores):
                        try:
                            score = float(rec_scores[idx])
                        except Exception:
                            pass
                    entities.append({'text': str(t), 'confidence': float(score)})
            elif 'text' in raw:
                entities.append({'text': str(raw.get('text')), 'confidence': float(raw.get('confidence', 1.0))})
            else:
                entities.append({'text': str(raw), 'confidence': 1.0})
        elif isinstance(raw, (list, tuple)) and len(raw) > 0 and isinstance(raw[0], dict):
            # Common: raw is a list where first element is a dict with rec_texts
            first = raw[0]
            rec_texts = first.get('rec_texts') or first.get('rec_res') or first.get('texts')
            rec_scores = first.get('rec_scores') or first.get('rec_res_scores') or first.get('scores')
            if rec_texts:
                for idx, t in enumerate(rec_texts):
                    score = 1.0
                    if rec_scores and idx < len(rec_scores):
                        try:
                            score = float(rec_scores[idx])
                        except Exception:
                            pass
                    entities.append({'text': str(t), 'confidence': float(score)})
            else:
                # fall back to stringifying the first element
                entities.append({'text': str(first), 'confidence': 1.0})
        else:
            # previous handling for list/tuple structures
            for line in raw:
                if isinstance(line, (list, tuple)):
                    for res in line:
                        try:
                            txt = res[1][0]
                            conf = res[1][1] if len(res[1]) > 1 else 1.0
                        except Exception:
                            txt = res[1] if isinstance(res[1], str) else str(res[1])
                            conf = 1.0
                        entities.append({'text': str(txt), 'confidence': float(conf)})
                elif isinstance(line, dict) and 'text' in line:
                    entities.append({'text': str(line.get('text')), 'confidence': float(line.get('confidence', 1.0))})
                else:
                    entities.append({'text': str(line), 'confidence': 1.0})

        print(json.dumps({'entities': entities}, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
