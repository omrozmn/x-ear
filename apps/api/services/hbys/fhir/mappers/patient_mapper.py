"""
Patient Mapper
==============
Party (X-EAR internal) <-> FHIR R4 Patient resource.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional


class PatientMapper:
    """Bidirectional mapper: Party dict <-> FHIR Patient resource."""

    # X-EAR gender codes -> FHIR administrative gender
    _GENDER_TO_FHIR = {"M": "male", "F": "female", "O": "other"}
    _GENDER_FROM_FHIR = {"male": "M", "female": "F", "other": "O", "unknown": None}

    # X-EAR status -> FHIR active flag
    _STATUS_ACTIVE = {"active", "lead", "prospect"}

    # ------------------------------------------------------------------ #
    # to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, party: dict) -> dict:
        """Convert an X-EAR Party dict to a FHIR R4 Patient resource."""
        resource: dict[str, Any] = {
            "resourceType": "Patient",
            "id": party.get("id"),
            "meta": {
                "versionId": "1",
                "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"],
            },
            "active": (party.get("status", "active") in cls._STATUS_ACTIVE),
        }

        # Identifiers
        identifiers = []
        tc = party.get("tcNumber") or party.get("tc_number")
        if tc:
            identifiers.append(
                {
                    "use": "official",
                    "type": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                "code": "NI",
                                "display": "National Identifier",
                            }
                        ]
                    },
                    "system": "urn:oid:2.16.840.1.113883.3.7612",  # Turkish TC Kimlik No OID
                    "value": tc,
                }
            )
        identity_no = party.get("identityNumber") or party.get("identity_number")
        if identity_no and identity_no != tc:
            identifiers.append(
                {
                    "use": "secondary",
                    "type": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                "code": "MR",
                                "display": "Medical Record Number",
                            }
                        ]
                    },
                    "system": "urn:x-ear:mrn",
                    "value": identity_no,
                }
            )
        if identifiers:
            resource["identifier"] = identifiers

        # Name
        first = party.get("firstName") or party.get("first_name") or ""
        last = party.get("lastName") or party.get("last_name") or ""
        if first or last:
            name_entry: dict[str, Any] = {"use": "official", "family": last}
            if first:
                name_entry["given"] = [first]
            full = party.get("fullName") or party.get("full_name")
            if full:
                name_entry["text"] = full
            resource["name"] = [name_entry]

        # Telecom
        telecoms = []
        phone = party.get("phone")
        if phone:
            telecoms.append({"system": "phone", "value": phone, "use": "mobile"})
        email = party.get("email")
        if email:
            telecoms.append({"system": "email", "value": email, "use": "home"})
        if telecoms:
            resource["telecom"] = telecoms

        # Gender
        gender_code = party.get("gender")
        if gender_code:
            resource["gender"] = cls._GENDER_TO_FHIR.get(gender_code, "unknown")

        # Birth date
        dob = party.get("birthDate") or party.get("birth_date") or party.get("dob")
        if dob:
            if isinstance(dob, datetime):
                resource["birthDate"] = dob.strftime("%Y-%m-%d")
            elif isinstance(dob, str):
                resource["birthDate"] = dob[:10]  # ISO date portion

        # Address
        city = party.get("addressCity") or party.get("address_city")
        district = party.get("addressDistrict") or party.get("address_district")
        full_addr = party.get("addressFull") or party.get("address_full")
        if city or district or full_addr:
            addr: dict[str, Any] = {"use": "home"}
            if full_addr:
                addr["text"] = full_addr
                addr["line"] = [full_addr]
            if city:
                addr["city"] = city
            if district:
                addr["district"] = district
            addr["country"] = "TR"
            resource["address"] = [addr]

        return resource

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR R4 Patient resource to X-EAR Party-compatible dict."""
        result: dict[str, Any] = {}

        result["id"] = fhir.get("id")

        # Active -> status
        active = fhir.get("active")
        result["status"] = "active" if active else "inactive"

        # Identifiers
        for ident in fhir.get("identifier") or []:
            sys = ident.get("system", "")
            value = ident.get("value")
            if "2.16.840.1.113883.3.7612" in sys:
                result["tc_number"] = value
            elif "x-ear:mrn" in sys:
                result["identity_number"] = value
            else:
                # Fallback: check type coding
                codings = (ident.get("type") or {}).get("coding") or []
                for c in codings:
                    if c.get("code") == "NI":
                        result["tc_number"] = value
                    elif c.get("code") == "MR":
                        result["identity_number"] = value

        # Name
        names = fhir.get("name") or []
        if names:
            official = cls._find_by_use(names, "official") or names[0]
            result["first_name"] = (official.get("given") or [""])[0]
            result["last_name"] = official.get("family", "")

        # Telecom
        for tel in fhir.get("telecom") or []:
            if tel.get("system") == "phone":
                result["phone"] = tel.get("value")
            elif tel.get("system") == "email":
                result["email"] = tel.get("value")

        # Gender
        fhir_gender = fhir.get("gender")
        if fhir_gender:
            result["gender"] = cls._GENDER_FROM_FHIR.get(fhir_gender)

        # Birth date
        bd = fhir.get("birthDate")
        if bd:
            result["birth_date"] = bd

        # Address
        addresses = fhir.get("address") or []
        if addresses:
            addr = cls._find_by_use(addresses, "home") or addresses[0]
            result["address_city"] = addr.get("city")
            result["address_district"] = addr.get("district")
            lines = addr.get("line") or []
            result["address_full"] = addr.get("text") or (lines[0] if lines else None)

        return {k: v for k, v in result.items() if v is not None}

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _find_by_use(items: list[dict], use: str) -> Optional[dict]:
        """Find the first item in a list that matches a given 'use' value."""
        for item in items:
            if item.get("use") == use:
                return item
        return None
