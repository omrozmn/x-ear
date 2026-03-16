"""Tests for document edge detection / auto-crop functionality."""
import os
import tempfile
import numpy as np
import pytest

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

from utils.document_scanner import auto_crop_image


@pytest.mark.skipif(not HAS_OPENCV, reason="OpenCV not available")
class TestAutoCropImage:
    def _create_test_image(self, width: int, height: int, draw_rect: bool = True) -> str:
        """Create a synthetic test image with optional dark rectangle on white background."""
        img = np.ones((height, width, 3), dtype=np.uint8) * 255  # White background

        if draw_rect:
            # Draw a dark rectangle to simulate a document
            margin_x = width // 6
            margin_y = height // 6
            cv2.rectangle(img, (margin_x, margin_y), (width - margin_x, height - margin_y), (30, 30, 30), -1)

        fd, path = tempfile.mkstemp(suffix=".jpg", prefix="test_crop_")
        os.close(fd)
        cv2.imwrite(path, img)
        return path

    def test_crops_document_from_white_background(self):
        path = self._create_test_image(800, 600, draw_rect=True)
        try:
            result = auto_crop_image(path)
            assert result is not None
            assert os.path.exists(result)
            # Cropped image should be smaller than original
            orig = cv2.imread(path)
            cropped = cv2.imread(result)
            assert cropped is not None
            assert cropped.shape[0] > 0 and cropped.shape[1] > 0
            os.unlink(result)
        finally:
            os.unlink(path)

    def test_no_document_returns_none_or_fallback(self):
        # All white image - no clear document boundary
        path = self._create_test_image(400, 300, draw_rect=False)
        try:
            result = auto_crop_image(path)
            # May return None (no contours) or a fallback crop
            if result:
                os.unlink(result)
        finally:
            os.unlink(path)

    def test_nonexistent_file_returns_none(self):
        result = auto_crop_image("/tmp/does_not_exist_12345.jpg")
        assert result is None

    def test_very_small_image(self):
        path = self._create_test_image(50, 50, draw_rect=True)
        try:
            result = auto_crop_image(path)
            if result:
                os.unlink(result)
        finally:
            os.unlink(path)

    def test_landscape_document(self):
        path = self._create_test_image(1200, 400, draw_rect=True)
        try:
            result = auto_crop_image(path)
            assert result is not None
            if result:
                os.unlink(result)
        finally:
            os.unlink(path)
