"""
Turkish Text Normalization and Fuzzy Matching Utilities
Used by OCR, invoice parsing, and party matching.
"""
import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Tuple, Optional, Dict, Any


# Turkish character normalization map
_TR_MAP = str.maketrans({
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'I',
    'İ': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
})


def normalize_turkish(text: str) -> str:
    """Normalize Turkish characters to ASCII equivalents."""
    if not text:
        return ''
    return text.translate(_TR_MAP)


def normalize_for_comparison(text: str) -> str:
    """Full normalization for comparison: lowercase, Turkish chars, strip extra whitespace."""
    if not text:
        return ''
    result = normalize_turkish(text).lower().strip()
    result = re.sub(r'\s+', ' ', result)
    return result


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def similarity_score(s1: str, s2: str) -> float:
    """Calculate similarity between two strings (0.0 to 1.0)."""
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0

    n1 = normalize_for_comparison(s1)
    n2 = normalize_for_comparison(s2)

    if n1 == n2:
        return 1.0

    # Use SequenceMatcher for better partial matching
    seq_ratio = SequenceMatcher(None, n1, n2).ratio()

    # Also check Levenshtein for short strings
    max_len = max(len(n1), len(n2))
    if max_len > 0:
        lev_ratio = 1.0 - (levenshtein_distance(n1, n2) / max_len)
    else:
        lev_ratio = 0.0

    return max(seq_ratio, lev_ratio)


def fuzzy_match_supplier(
    name: str,
    tax_number: Optional[str],
    suppliers: List[Dict[str, Any]],
    threshold: float = 0.6
) -> List[Tuple[Dict[str, Any], float, str]]:
    """
    Match a supplier name/tax number against a list of suppliers.
    
    Returns list of (supplier, score, match_reason) tuples, sorted by score desc.
    """
    results = []

    for supplier in suppliers:
        best_score = 0.0
        match_reason = ''

        # 1. Exact tax number match (highest priority)
        if tax_number and supplier.get('tax_number'):
            sup_tax = re.sub(r'\s+', '', supplier['tax_number'])
            inp_tax = re.sub(r'\s+', '', tax_number)
            if sup_tax == inp_tax:
                results.append((supplier, 1.0, 'tax_number_exact'))
                continue

        # 2. Name matching
        sup_name = supplier.get('company_name') or supplier.get('name') or ''
        if name and sup_name:
            score = similarity_score(name, sup_name)
            if score > best_score:
                best_score = score
                match_reason = 'name_fuzzy'

            # Check individual words overlap
            name_words = set(normalize_for_comparison(name).split())
            sup_words = set(normalize_for_comparison(sup_name).split())
            common = name_words & sup_words
            if name_words and sup_words:
                word_overlap = len(common) / max(len(name_words), len(sup_words))
                if word_overlap > best_score:
                    best_score = word_overlap
                    match_reason = 'name_word_overlap'

            # Check if one contains the other
            n1 = normalize_for_comparison(name)
            n2 = normalize_for_comparison(sup_name)
            if n1 in n2 or n2 in n1:
                containment_score = min(len(n1), len(n2)) / max(len(n1), len(n2))
                if containment_score > best_score:
                    best_score = max(containment_score, 0.85)
                    match_reason = 'name_contains'

        if best_score >= threshold:
            results.append((supplier, best_score, match_reason))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def fuzzy_match_party(
    name: str,
    tc_number: Optional[str],
    parties: List[Dict[str, Any]],
    threshold: float = 0.5
) -> List[Tuple[Dict[str, Any], float, str]]:
    """
    Match a person name/TC number against a list of parties.
    """
    results = []

    for party in parties:
        best_score = 0.0
        match_reason = ''

        # 1. TC number exact match
        if tc_number and party.get('tc_number'):
            if tc_number.strip() == party['tc_number'].strip():
                results.append((party, 1.0, 'tc_number_exact'))
                continue

        # 2. Full name matching
        party_name = f"{party.get('first_name', '')} {party.get('last_name', '')}".strip()
        if not party_name:
            party_name = party.get('full_name', '') or party.get('name', '')

        if name and party_name:
            score = similarity_score(name, party_name)
            if score > best_score:
                best_score = score
                match_reason = 'name_fuzzy'

            # Try reversed name order (Soyadı Adı vs Adı Soyadı)
            name_parts = name.strip().split()
            if len(name_parts) >= 2:
                reversed_name = ' '.join(name_parts[-1:] + name_parts[:-1])
                rev_score = similarity_score(reversed_name, party_name)
                if rev_score > best_score:
                    best_score = rev_score
                    match_reason = 'name_reversed'

        # 3. Phone matching
        if party.get('phone'):
            # Normalize phone numbers for comparison
            pass  # Phone matching not needed for OCR

        if best_score >= threshold:
            results.append((party, best_score, match_reason))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
