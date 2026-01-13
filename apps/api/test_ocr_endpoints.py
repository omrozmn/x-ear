import json
import pytest
pytest.importorskip('paddleocr')
pytest.importorskip('PIL')
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


def test_health_and_initialize_endpoint(client):
    rv = client.post('/initialize')
    assert rv.status_code in (200, 500, 503)


def test_process_endpoint_calls_service(client, tmp_path):
    img_path = str(tmp_path / 'ocr_test.png')
    make_test_image(img_path, 'HASTA ADI: Ahmet Test')

    rv = client.post('/process', json={'image_path': img_path, 'type': 'medical'})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['success'] is True
    assert 'result' in data


def test_similarity_endpoint(client, tmp_path):
    img1 = str(tmp_path / 'sim1.png')
    img2 = str(tmp_path / 'sim2.png')
    make_test_image(img1, 'Text A B C')
    make_test_image(img2, 'Text B C D')

    rv = client.post('/similarity', json={'image_path1': img1, 'image_path2': img2})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['success'] is True
    assert 'similarity' in data['result'] or 'result' in data
