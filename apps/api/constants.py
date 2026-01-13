# Canonical constants for X-Ear backend and tests
CANONICAL_CATEGORY_HEARING_AID = 'hearing_aid'
CANONICAL_CATEGORY_KEY = 'category'

# Legacy aliases removed — repository uses canonical tokens only
LEGACY_CATEGORY_ALIASES = set()

# Canonical inventory keys
CANONICAL_INVENTORY_AVAILABLE = 'availableInventory'
CANONICAL_INVENTORY_TOTAL = 'totalInventory'
CANONICAL_INVENTORY_USED = 'usedInventory'

# Legacy inventory aliases removed
LEGACY_INVENTORY_ALIASES = set()

# Helper functions for normalization

def normalize_category(token: str) -> str:
    """Normalize legacy or input category tokens into canonical category tokens.
    This function no longer maps legacy tokens; callers must provide canonical tokens.
    """
    if not token:
        return ''
    return token.strip().lower()
