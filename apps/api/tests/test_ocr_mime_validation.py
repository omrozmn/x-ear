"""Tests for MIME type validation via magic bytes."""
import pytest
from fastapi import HTTPException
from utils.file_validation import validate_upload_mime


# --- Valid magic bytes ---

JPEG_HEADER = b"\xff\xd8\xff\xe0" + b"\x00" * 100
PNG_HEADER = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
PDF_HEADER = b"%PDF-1.4" + b"\x00" * 100
BMP_HEADER = b"BM" + b"\x00" * 100


class TestValidMimeTypes:
    def test_jpeg_accepted(self):
        result = validate_upload_mime(JPEG_HEADER, "photo.jpg")
        assert result == "image/jpeg"

    def test_jpeg_extension_variant(self):
        result = validate_upload_mime(JPEG_HEADER, "photo.jpeg")
        assert result == "image/jpeg"

    def test_png_accepted(self):
        result = validate_upload_mime(PNG_HEADER, "doc.png")
        assert result == "image/png"

    def test_pdf_accepted(self):
        result = validate_upload_mime(PDF_HEADER, "report.pdf")
        assert result == "application/pdf"

    def test_bmp_accepted(self):
        result = validate_upload_mime(BMP_HEADER, "scan.bmp")
        assert result == "image/bmp"

    def test_csv_accepted_by_extension(self):
        result = validate_upload_mime(b"name,age\nali,30", "data.csv")
        assert result == "text/csv"

    def test_xlsx_accepted_by_extension(self):
        result = validate_upload_mime(b"PK\x03\x04" + b"\x00" * 50, "data.xlsx")
        assert result == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class TestInvalidMimeTypes:
    def test_jpg_with_png_magic_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_mime(PNG_HEADER, "fake.jpg")
        assert exc_info.value.status_code == 400

    def test_unsupported_extension_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_mime(b"some content", "script.exe")
        assert exc_info.value.status_code == 400

    def test_empty_file_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_mime(b"", "empty.jpg")
        assert exc_info.value.status_code == 400

    def test_no_valid_magic_bytes_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_mime(b"\x00\x01\x02\x03" * 25, "random.jpg")
        assert exc_info.value.status_code == 400

    def test_oversized_file_rejected(self):
        large_content = JPEG_HEADER + b"\x00" * (21 * 1024 * 1024)
        with pytest.raises(HTTPException) as exc_info:
            validate_upload_mime(large_content, "huge.jpg")
        assert exc_info.value.status_code == 400
        assert "boyut" in exc_info.value.detail.lower() or "MB" in exc_info.value.detail


class TestEdgeCases:
    def test_none_filename(self):
        with pytest.raises(HTTPException):
            validate_upload_mime(JPEG_HEADER, None)

    def test_case_insensitive_extension(self):
        result = validate_upload_mime(JPEG_HEADER, "PHOTO.JPG")
        assert result == "image/jpeg"

    def test_pdf_upper_extension(self):
        result = validate_upload_mime(PDF_HEADER, "DOC.PDF")
        assert result == "application/pdf"
