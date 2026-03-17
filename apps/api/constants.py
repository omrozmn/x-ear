# Canonical constants for X-Ear backend and tests
CANONICAL_CATEGORY_HEARING_AID = 'hearing_aid'
CANONICAL_CATEGORY_KEY = 'category'

# Turkish → canonical category mapping
CATEGORY_ALIASES: dict[str, str] = {
    'İşitme Cihazı': 'hearing_aid',
    'işitme cihazı': 'hearing_aid',
    'isitme cihazi': 'hearing_aid',
    'İşitme cihazı': 'hearing_aid',
    'İşitme Cihazı Pili': 'hearing_aid_battery',
    'işitme cihazı pili': 'hearing_aid_battery',
    'isitme cihazi pili': 'hearing_aid_battery',
    'İmplant Pili': 'implant_battery',
    'implant pili': 'implant_battery',
    'Pil': 'battery',
    'pil': 'battery',
    'Aksesuar': 'accessory',
    'aksesuar': 'accessory',
    'Malzeme': 'supplies',
    'malzeme': 'supplies',
    'Bakım': 'maintenance',
    'bakım': 'maintenance',
    'bakim': 'maintenance',
}

# Canonical inventory keys
CANONICAL_INVENTORY_AVAILABLE = 'availableInventory'
CANONICAL_INVENTORY_TOTAL = 'totalInventory'
CANONICAL_INVENTORY_USED = 'usedInventory'

# Legacy inventory aliases removed
LEGACY_INVENTORY_ALIASES = set()

# Helper functions for normalization

def normalize_category(token: str) -> str:
    """Normalize legacy or Turkish category tokens into canonical category tokens."""
    if not token:
        return ''
    stripped = token.strip()
    if stripped in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[stripped]
    return stripped
