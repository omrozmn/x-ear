"""
Pydantic schemas for SGK (Sosyal Güvenlik Kurumu) login credentials management.

Credentials are stored encrypted with AES-256-GCM.
"""

from typing import Optional
from pydantic import Field
from schemas.base import AppBaseModel


class SgkCredentialsUpdate(AppBaseModel):
    """Request body for saving SGK credentials."""
    tesis_kodu: Optional[str] = Field(None, alias="tesisKodu", description="SGK tesis kodu")
    tesis_sifresi: Optional[str] = Field(None, alias="tesisSifresi", description="SGK tesis şifresi")
    mesul_mudur_tc: Optional[str] = Field(None, alias="mesulMudurTc", description="Mesul müdür TC kimlik no")
    mesul_mudur_sifresi: Optional[str] = Field(None, alias="mesulMudurSifresi", description="Mesul müdür şifresi")


class SgkCredentialsRead(AppBaseModel):
    """Response body for reading SGK credentials (passwords masked)."""
    tesis_kodu: Optional[str] = Field(None, alias="tesisKodu")
    has_tesis_sifresi: bool = Field(False, alias="hasTesisSifresi")
    mesul_mudur_tc: Optional[str] = Field(None, alias="mesulMudurTc")
    has_mesul_mudur_sifresi: bool = Field(False, alias="hasMesulMudurSifresi")
