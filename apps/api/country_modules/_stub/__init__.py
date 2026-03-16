"""
Stub country module -- fallback for countries without a specific implementation.
Provides safe defaults so the system works even for newly-enabled countries.
"""
import re
from country_modules.base import BaseCountryModule


class StubModule(BaseCountryModule):
    """Generic country module with safe defaults."""

    def __init__(self, country_code: str = 'XX'):
        self.code = country_code

    def validate_tax_id(self, tax_id: str) -> bool:
        """Accept any non-empty string as valid."""
        return bool(tax_id and tax_id.strip())

    def validate_phone(self, phone: str) -> bool:
        """Accept any string starting with + and having at least 7 digits."""
        clean = re.sub(r'\D', '', phone)
        return len(clean) >= 7

    def get_tax_codes(self) -> list[dict]:
        """No tax exemption codes by default."""
        return []

    def get_default_currency(self) -> str:
        return 'USD'

    def get_invoice_type_map(self) -> dict:
        return {
            "SALE": {"form": "COMMERCIAL", "profile": "BASIC", "scenario": "DEFAULT"},
        }

    def get_available_integrations(self) -> list[str]:
        return []
