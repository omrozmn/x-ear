"""
Base interface for country modules.
All country-specific business logic implements this ABC.
"""
from abc import ABC, abstractmethod


class BaseCountryModule(ABC):
    """Abstract base for per-country business logic."""

    code: str  # ISO 3166-1 alpha-2

    @abstractmethod
    def validate_tax_id(self, tax_id: str) -> bool:
        """Validate a tax/national ID number."""
        ...

    @abstractmethod
    def validate_phone(self, phone: str) -> bool:
        """Validate a phone number."""
        ...

    @abstractmethod
    def get_tax_codes(self) -> list[dict]:
        """Return available tax/exemption codes."""
        ...

    @abstractmethod
    def get_default_currency(self) -> str:
        """Return default ISO 4217 currency code."""
        ...

    @abstractmethod
    def get_invoice_type_map(self) -> dict:
        """Return mapping of document types to invoice form/profile/scenario."""
        ...

    @abstractmethod
    def get_available_integrations(self) -> list[str]:
        """Return list of available integration slugs."""
        ...

    def format_phone(self, phone: str) -> str:
        """Format a phone number for display. Default: return as-is."""
        return phone

    def get_address_fields(self) -> list[str]:
        """Return ordered list of address fields for this country."""
        return ["address_line1", "city", "state", "postal_code"]

    def get_tax_id_label(self) -> str:
        """Human-readable label for the tax ID field."""
        return "Tax ID"

    def get_tax_id_length(self) -> int | None:
        """Expected length of tax ID, or None if variable."""
        return None
