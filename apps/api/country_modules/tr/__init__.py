"""
Turkey country module -- wraps existing TR-specific business logic.
"""
import re
from country_modules.base import BaseCountryModule


class TurkeyModule(BaseCountryModule):
    code = 'TR'

    # --- Tax ID (TC Kimlik No) ---
    def validate_tax_id(self, tax_id: str) -> bool:
        """Validate Turkish TC Kimlik Numarasi (11-digit algorithm)."""
        if not tax_id or not tax_id.isdigit() or len(tax_id) != 11:
            return False
        if tax_id[0] == '0':
            return False
        digits = [int(d) for d in tax_id]
        # 10th digit check
        odd_sum = sum(digits[i] for i in range(0, 9, 2))
        even_sum = sum(digits[i] for i in range(1, 8, 2))
        check10 = (odd_sum * 7 - even_sum) % 10
        if check10 != digits[9]:
            return False
        # 11th digit check
        check11 = sum(digits[:10]) % 10
        return check11 == digits[10]

    # --- Phone ---
    _PHONE_RE = re.compile(r'^\+90[0-9]{10}$')

    def validate_phone(self, phone: str) -> bool:
        return bool(self._PHONE_RE.match(phone))

    def format_phone(self, phone: str) -> str:
        """Format as +90 5XX XXX XX XX."""
        clean = re.sub(r'\D', '', phone)
        if len(clean) == 10:
            clean = '90' + clean
        if len(clean) == 12 and clean.startswith('90'):
            return f'+{clean[:2]} {clean[2:5]} {clean[5:8]} {clean[8:10]} {clean[10:]}'
        return phone

    # --- Tax codes ---
    def get_tax_codes(self) -> list[dict]:
        """KDV exemption reason codes used in Turkish e-invoicing."""
        return [
            {"code": "301", "description": "Mal ihracati (Goods export)", "rate": 0},
            {"code": "302", "description": "Hizmet ihracati (Service export)", "rate": 0},
            {"code": "303", "description": "Diplomatik istisna", "rate": 0},
            {"code": "304", "description": "Tasimacilик istisnasi", "rate": 0},
            {"code": "305", "description": "Petrol aramalari", "rate": 0},
            {"code": "306", "description": "Altin-gumus aracilari", "rate": 0},
            {"code": "307", "description": "Yatirim tesvik belgesi", "rate": 0},
            {"code": "308", "description": "Turkiye'de ikamet etmeyenler", "rate": 0},
            {"code": "309", "description": "Petrol boru hatti insaati", "rate": 0},
            {"code": "310", "description": "Boru hatti ile tasimacilik", "rate": 0},
            {"code": "311", "description": "Deniz hava tasitlari", "rate": 0},
            {"code": "312", "description": "Liman ve hava meydani hizmeti", "rate": 0},
            {"code": "350", "description": "Diger istisnalar", "rate": 0},
            {"code": "351", "description": "KDV istisnasi (kanun)", "rate": 0},
            {"code": "601", "description": "Ihrac kayitli teslim", "rate": 0},
            {"code": "701", "description": "7/A maddesi (tevkifat)", "rate": 0},
        ]

    def get_default_currency(self) -> str:
        return 'TRY'

    def get_invoice_type_map(self) -> dict:
        """
        Map document types to GIB e-invoice form/profile/scenario.
        Mirrors the _DOC_TYPE_TO_FORM logic from invoices_new.py.
        """
        return {
            "SATIS": {"form": "TICARIFATURA", "profile": "TEMELFATURA", "scenario": "TEMEL"},
            "IADE": {"form": "TICARIFATURA", "profile": "TEMELFATURA", "scenario": "TEMEL"},
            "TEVKIFAT": {"form": "TICARIFATURA", "profile": "TEMELFATURA", "scenario": "TEMEL"},
            "ISTISNA": {"form": "ISTISNA", "profile": "TEMELFATURA", "scenario": "TEMEL"},
            "IHRAC": {"form": "TICARIFATURA", "profile": "IHRACATFATURA", "scenario": "IHRACAT"},
            "SGK": {"form": "TICARIFATURA", "profile": "TEMELFATURA", "scenario": "TEMEL"},
        }

    def get_available_integrations(self) -> list[str]:
        return ["sgk", "birfatura", "uts"]

    def get_address_fields(self) -> list[str]:
        return ["city", "district"]

    def get_tax_id_label(self) -> str:
        return "TC Kimlik No"

    def get_tax_id_length(self) -> int:
        return 11
