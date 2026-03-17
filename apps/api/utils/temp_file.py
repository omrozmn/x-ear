"""
Secure temporary file management with guaranteed cleanup.
"""
import os
import tempfile
import logging
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger(__name__)


@contextmanager
def secure_temp_file(suffix: str = ".tmp", prefix: str = "xear_") -> Generator[str, None, None]:
    """Context manager that creates a temp file and guarantees cleanup on exit.

    Usage:
        with secure_temp_file(suffix=".jpg") as path:
            with open(path, "wb") as f:
                f.write(content)
            process(path)
        # File is automatically deleted here
    """
    fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix)
    os.close(fd)
    try:
        yield path
    finally:
        try:
            if os.path.exists(path):
                os.unlink(path)
        except OSError as e:
            logger.warning(f"Failed to clean up temp file {path}: {e}")
