import os
import sys
import types
import pytest

pytest.importorskip('paddleocr')
pytest.importorskip('PIL')

from backend.services.ocr_service import TurkishMedicalOCR
from PIL import Image, ImageDraw, ImageFont


def make_test_image(path, text='HASTA ADI: Test'):
    img = Image.new('RGB', (400, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    d.text((10, 30), text, fill=(0, 0, 0), font=font)
    img.save(path)


def test_ocr_service_initialize_and_process(tmp_path):
    svc = TurkishMedicalOCR()
    svc.initialize()
    assert svc.initialized is True
    assert svc.paddleocr_available is True

    img_path = str(tmp_path / 'test_img.png')
    make_test_image(img_path)
    res = svc.process_document(img_path)
    assert 'entities' in res
    assert isinstance(res['entities'], list)


def test_calculate_similarity(tmp_path):
    svc = TurkishMedicalOCR()
    svc.initialize()

    img1 = str(tmp_path / 'img1.png')
    img2 = str(tmp_path / 'img2.png')
    make_test_image(img1, 'Text A B C')
    make_test_image(img2, 'Text B C D')

    sim = svc.calculate_similarity(img1, img2)
    assert 'similarity' in sim
    assert 0 <= sim['similarity'] <= 1
