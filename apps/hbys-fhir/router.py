"""
FHIR R4 Router
==============
Exposes FHIR R4 RESTful endpoints under /api/fhir/.
All responses are raw FHIR JSON (no ResponseEnvelope wrapping).
Requires JWT authentication via hbys_common.auth.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from hbys_common.auth import get_current_user, CurrentUser
from service import FHIRService

router = APIRouter(prefix="/api/fhir", tags=["FHIR R4"])

# Custom FHIR JSON media type
FHIR_CONTENT_TYPE = "application/fhir+json"


def _fhir_response(data: dict, status_code: int = 200) -> JSONResponse:
    """Return a JSONResponse with the FHIR content type header."""
    return JSONResponse(
        content=data,
        status_code=status_code,
        media_type=FHIR_CONTENT_TYPE,
    )


def _get_service() -> FHIRService:
    return FHIRService()


# ====================================================================== #
# Metadata (CapabilityStatement)
# ====================================================================== #
@router.get("/metadata", summary="FHIR CapabilityStatement")
async def capability_statement(
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return the server's CapabilityStatement describing supported
    resources and interactions."""
    return _fhir_response(service.get_capability_statement())


# ====================================================================== #
# Patient
# ====================================================================== #
@router.get("/Patient", summary="Search Patient resources")
async def search_patients(
    _id: Optional[str] = Query(None, alias="_id"),
    identifier: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {k: v for k, v in {"_id": _id, "identifier": identifier, "name": name}.items() if v}
    bundle = await service.search_patients(params)
    return _fhir_response(bundle)


@router.get("/Patient/{patient_id}", summary="Read Patient resource")
async def read_patient(
    patient_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_patient(patient_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"Patient/{patient_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# Encounter
# ====================================================================== #
@router.get("/Encounter", summary="Search Encounter resources")
async def search_encounters(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {k: v for k, v in {"_id": _id, "patient": patient, "date": date, "status": status}.items() if v}
    bundle = await service.search_encounters(params)
    return _fhir_response(bundle)


@router.get("/Encounter/{encounter_id}", summary="Read Encounter resource")
async def read_encounter(
    encounter_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_encounter(encounter_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"Encounter/{encounter_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# Observation
# ====================================================================== #
@router.get("/Observation", summary="Search Observation resources")
async def search_observations(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {
        k: v
        for k, v in {
            "_id": _id,
            "patient": patient,
            "category": category,
            "code": code,
            "date": date,
            "status": status,
        }.items()
        if v
    }
    bundle = await service.search_observations(params)
    return _fhir_response(bundle)


@router.get("/Observation/{observation_id}", summary="Read Observation resource")
async def read_observation(
    observation_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_observation(observation_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"Observation/{observation_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# Condition
# ====================================================================== #
@router.get("/Condition", summary="Search Condition resources")
async def search_conditions(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    clinical_status: Optional[str] = Query(None, alias="clinical-status"),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {
        k: v
        for k, v in {
            "_id": _id,
            "patient": patient,
            "code": code,
            "category": category,
            "clinical-status": clinical_status,
        }.items()
        if v
    }
    bundle = await service.search_conditions(params)
    return _fhir_response(bundle)


@router.get("/Condition/{condition_id}", summary="Read Condition resource")
async def read_condition(
    condition_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_condition(condition_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"Condition/{condition_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# MedicationRequest
# ====================================================================== #
@router.get("/MedicationRequest", summary="Search MedicationRequest resources")
async def search_medication_requests(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {k: v for k, v in {"_id": _id, "patient": patient, "status": status, "date": date}.items() if v}
    bundle = await service.search_medication_requests(params)
    return _fhir_response(bundle)


@router.get("/MedicationRequest/{request_id}", summary="Read MedicationRequest resource")
async def read_medication_request(
    request_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_medication_request(request_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"MedicationRequest/{request_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# DiagnosticReport
# ====================================================================== #
@router.get("/DiagnosticReport", summary="Search DiagnosticReport resources")
async def search_diagnostic_reports(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {
        k: v
        for k, v in {
            "_id": _id,
            "patient": patient,
            "category": category,
            "code": code,
            "date": date,
            "status": status,
        }.items()
        if v
    }
    bundle = await service.search_diagnostic_reports(params)
    return _fhir_response(bundle)


@router.get("/DiagnosticReport/{report_id}", summary="Read DiagnosticReport resource")
async def read_diagnostic_report(
    report_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_diagnostic_report(report_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"DiagnosticReport/{report_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)


# ====================================================================== #
# AllergyIntolerance
# ====================================================================== #
@router.get("/AllergyIntolerance", summary="Search AllergyIntolerance resources")
async def search_allergy_intolerances(
    _id: Optional[str] = Query(None, alias="_id"),
    patient: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    clinical_status: Optional[str] = Query(None, alias="clinical-status"),
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    params = {
        k: v
        for k, v in {
            "_id": _id,
            "patient": patient,
            "category": category,
            "clinical-status": clinical_status,
        }.items()
        if v
    }
    bundle = await service.search_allergy_intolerances(params)
    return _fhir_response(bundle)


@router.get("/AllergyIntolerance/{allergy_id}", summary="Read AllergyIntolerance resource")
async def read_allergy_intolerance(
    allergy_id: str,
    service: FHIRService = Depends(_get_service),
    current_user: CurrentUser = Depends(get_current_user),
):
    resource = await service.read_allergy_intolerance(allergy_id)
    if not resource:
        return _fhir_response(
            FHIRService._make_operation_outcome(diagnostics=f"AllergyIntolerance/{allergy_id} not found"),
            status_code=404,
        )
    return _fhir_response(resource)
