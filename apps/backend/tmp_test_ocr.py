from services.ocr_service import TurkishMedicalOCR

svc = TurkishMedicalOCR()
# Avoid calling svc.initialize() because it attempts to load spaCy models which are large
# and can hang during testing. Initialize PaddleOCR only for this quick test.
try:
    from paddleocr import PaddleOCR
    svc.ocr = PaddleOCR(lang='tr')
    svc.paddleocr_available = True
except Exception as e:
    print('PaddleOCR not available in this environment:', e)

res = None
try:
    res = svc._safe_ocr_call('/Users/omerozmen/Desktop/x-ear web app/images/IMG_0230.JPG')
    print(type(res))
    try:
        print('len:', len(res))
        print(res[:5])
    except Exception as e:
        print('cannot len/print sample:', e)
except Exception as e:
    import traceback
    traceback.print_exc()
    print('ERROR:', e)
