"""Tests for path traversal protection in document scanner."""
import os
import tempfile
import pytest
from utils.document_scanner import _validate_image_path


class TestPathTraversalProtection:
    def test_valid_tmp_path_accepted(self):
        fd, path = tempfile.mkstemp(suffix=".jpg", prefix="test_")
        os.close(fd)
        try:
            result = _validate_image_path(path)
            assert os.path.isabs(result)
        finally:
            os.unlink(path)

    def test_traversal_with_dotdot_rejected(self):
        with pytest.raises(ValueError):
            _validate_image_path("/tmp/../etc/passwd")

    def test_absolute_etc_path_rejected(self):
        with pytest.raises(ValueError, match="allowed"):
            _validate_image_path("/etc/passwd")

    def test_home_directory_rejected(self):
        with pytest.raises(ValueError, match="allowed"):
            _validate_image_path(os.path.expanduser("~/secret.jpg"))

    def test_relative_path_with_traversal_rejected(self):
        with pytest.raises(ValueError, match="traversal"):
            _validate_image_path("../../etc/shadow")

    def test_tmp_subdirectory_accepted(self):
        tmp_dir = tempfile.mkdtemp()
        test_file = os.path.join(tmp_dir, "test.jpg")
        with open(test_file, "w") as f:
            f.write("test")
        try:
            result = _validate_image_path(test_file)
            real_tmp = os.path.realpath(tempfile.gettempdir())
            assert result.startswith(real_tmp) or result.startswith("/tmp") or result.startswith("/private/var")
        finally:
            os.unlink(test_file)
            os.rmdir(tmp_dir)
