import io
import csv
import pytest
from datetime import datetime
from core.models.user import User

@pytest.mark.skip(reason="Endpoint /api/patients/bulk_upload not implemented; use /api/parties/bulk-upload")
def test_bulk_upload_and_export_admin(client, db_session, auth_headers):
    pass

@pytest.mark.skip(reason="Endpoint /api/patients/export not implemented; use /api/parties/export")
def test_export_forbidden_for_non_admin(client, db_session):
    pass
