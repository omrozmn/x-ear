"""
Orthanc REST API Client
Provides integration with Orthanc DICOM server via its REST API.
Default server: http://localhost:8042
"""
import os
import logging
from typing import Optional, List, Dict, Any

import httpx

logger = logging.getLogger(__name__)

ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")
OHIF_VIEWER_URL = os.getenv("OHIF_VIEWER_URL", "http://localhost:3000/viewer")


class OrthancClient:
    """HTTP client for Orthanc DICOM server REST API."""

    def __init__(
        self,
        base_url: str = ORTHANC_URL,
        username: str = ORTHANC_USERNAME,
        password: str = ORTHANC_PASSWORD,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.auth = (username, password) if username else None
        self.timeout = timeout

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            auth=self.auth,
            timeout=self.timeout,
        )

    # ── Study Operations ──────────────────────────────────────────────────

    async def upload_study(self, dicom_bytes: bytes) -> Dict[str, Any]:
        """
        Upload a DICOM instance (or multi-part study) to Orthanc.
        Returns Orthanc's response with assigned IDs.
        """
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            response = await client.post(
                "/instances",
                content=dicom_bytes,
                headers={"Content-Type": "application/dicom"},
            )
            response.raise_for_status()
            return response.json()

    async def get_study(self, orthanc_study_id: str) -> Dict[str, Any]:
        """Get study metadata from Orthanc by its internal ID."""
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            response = await client.get(f"/studies/{orthanc_study_id}")
            response.raise_for_status()
            return response.json()

    async def get_series(self, orthanc_study_id: str) -> List[Dict[str, Any]]:
        """Get all series for a study."""
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            # First get study to find series IDs
            study = await client.get(f"/studies/{orthanc_study_id}")
            study.raise_for_status()
            study_data = study.json()
            series_ids = study_data.get("Series", [])

            series_list = []
            for series_id in series_ids:
                resp = await client.get(f"/series/{series_id}")
                resp.raise_for_status()
                series_list.append(resp.json())
            return series_list

    async def get_instances(self, series_id: str) -> List[Dict[str, Any]]:
        """Get all instances for a series."""
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            series_resp = await client.get(f"/series/{series_id}")
            series_resp.raise_for_status()
            series_data = series_resp.json()
            instance_ids = series_data.get("Instances", [])

            instances = []
            for inst_id in instance_ids:
                resp = await client.get(f"/instances/{inst_id}")
                resp.raise_for_status()
                instances.append(resp.json())
            return instances

    def get_viewer_url(
        self,
        orthanc_study_id: Optional[str] = None,
        dicom_study_uid: Optional[str] = None,
    ) -> Optional[str]:
        """
        Build OHIF viewer URL for a study.
        Prefers DICOM Study UID if available; falls back to Orthanc internal ID.
        """
        if dicom_study_uid:
            return f"{OHIF_VIEWER_URL}?StudyInstanceUIDs={dicom_study_uid}"
        if orthanc_study_id:
            return f"{OHIF_VIEWER_URL}?url={self.base_url}/dicom-web/studies/{orthanc_study_id}"
        return None

    async def search_studies(
        self,
        patient_id: Optional[str] = None,
        accession_number: Optional[str] = None,
        modality: Optional[str] = None,
        study_date: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Search studies using Orthanc's /tools/find endpoint.
        """
        query: Dict[str, str] = {}
        if patient_id:
            query["PatientID"] = patient_id
        if accession_number:
            query["AccessionNumber"] = accession_number
        if modality:
            query["ModalitiesInStudy"] = modality.upper()
        if study_date:
            query["StudyDate"] = study_date

        payload = {
            "Level": "Study",
            "Query": query,
            "Limit": limit,
            "Expand": True,
        }

        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            response = await client.post("/tools/find", json=payload)
            response.raise_for_status()
            return response.json()

    async def delete_study(self, orthanc_study_id: str) -> bool:
        """Delete a study from Orthanc."""
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            response = await client.delete(f"/studies/{orthanc_study_id}")
            return response.status_code == 200

    async def get_study_statistics(self, orthanc_study_id: str) -> Dict[str, Any]:
        """Get storage statistics for a study."""
        async with httpx.AsyncClient(
            base_url=self.base_url, auth=self.auth, timeout=self.timeout
        ) as client:
            response = await client.get(f"/studies/{orthanc_study_id}/statistics")
            response.raise_for_status()
            return response.json()


# Module-level singleton
orthanc_client = OrthancClient()
