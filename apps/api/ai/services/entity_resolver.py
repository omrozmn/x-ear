"""
Entity Resolver for AI Layer

Resolves user-provided entity references (names, phones, IDs) to actual
database records using a 3-tier search strategy:

1. Exact match (ID, phone, TC number) → instant, 0 tokens
2. Full-text search (tsvector + GIN) → fast, 0 tokens
3. Fuzzy match (pg_trgm similarity) → typo-tolerant, 0 tokens

Returns ranked results with confidence scores.
If single high-confidence match → return directly.
If multiple matches → return disambiguation list for user clarification.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from sqlalchemy import text, func, or_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.3  # pg_trgm minimum similarity


@dataclass
class ResolvedEntity:
    """A resolved entity with confidence score."""
    entity_type: str  # "party", "inventory", "invoice", "appointment"
    entity_id: str
    display_name: str
    score: float  # 0.0 - 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResolutionResult:
    """Result of entity resolution."""
    resolved: bool  # True if single high-confidence match
    entity: Optional[ResolvedEntity] = None  # Best match (if resolved)
    candidates: List[ResolvedEntity] = field(default_factory=list)  # All matches
    needs_clarification: bool = False
    clarification_message: Optional[str] = None

    @property
    def is_ambiguous(self) -> bool:
        return len(self.candidates) > 1 and not self.resolved


class EntityResolver:
    """Resolves entity references to database records."""

    def __init__(self, db: Session):
        self.db = db

    def resolve_party(self, query: str, tenant_id: str, limit: int = 5) -> ResolutionResult:
        """
        Resolve a party reference (name, phone, TC, ID).

        Strategy:
        1. Try exact ID match
        2. Try exact phone/TC match
        3. Full-text search on search_vector
        4. Fuzzy trigram match on name
        """
        query = query.strip()
        if not query:
            return ResolutionResult(resolved=False)

        candidates: List[ResolvedEntity] = []

        # 1. Exact ID match
        candidates.extend(self._party_exact_id(query, tenant_id))
        if len(candidates) == 1:
            candidates[0].score = 1.0
            return ResolutionResult(resolved=True, entity=candidates[0], candidates=candidates)

        # 2. Exact phone/TC match
        candidates.extend(self._party_exact_phone_tc(query, tenant_id))
        if len(candidates) == 1:
            candidates[0].score = 1.0
            return ResolutionResult(resolved=True, entity=candidates[0], candidates=candidates)

        # 3. Full-text search
        fts_results = self._party_fts(query, tenant_id, limit)
        candidates.extend(fts_results)

        # 4. Fuzzy trigram (if FTS returned few results)
        if len(fts_results) < 2:
            fuzzy_results = self._party_fuzzy(query, tenant_id, limit)
            # Deduplicate
            existing_ids = {c.entity_id for c in candidates}
            for r in fuzzy_results:
                if r.entity_id not in existing_ids:
                    candidates.append(r)

        # Deduplicate and sort by score
        seen = set()
        unique = []
        for c in candidates:
            if c.entity_id not in seen:
                seen.add(c.entity_id)
                unique.append(c)
        candidates = sorted(unique, key=lambda x: x.score, reverse=True)[:limit]

        if not candidates:
            return ResolutionResult(resolved=False)

        if len(candidates) == 1 or (candidates[0].score >= 0.85 and
                (len(candidates) == 1 or candidates[0].score - candidates[1].score > 0.2)):
            return ResolutionResult(resolved=True, entity=candidates[0], candidates=candidates)

        # Disambiguation needed
        names = [f"{c.display_name} (#{c.entity_id[-6:]})" for c in candidates[:5]]
        msg = f"{len(candidates)} kişi bulundu: {', '.join(names)}. Hangisini kastediyorsunuz?"
        return ResolutionResult(
            resolved=False, candidates=candidates,
            needs_clarification=True, clarification_message=msg,
        )

    def resolve_inventory(self, query: str, tenant_id: str, limit: int = 5) -> ResolutionResult:
        """Resolve an inventory item by name, brand, model, or barcode."""
        query = query.strip()
        if not query:
            return ResolutionResult(resolved=False)

        candidates = self._inventory_fts(query, tenant_id, limit)
        if not candidates:
            candidates = self._inventory_ilike(query, tenant_id, limit)

        if not candidates:
            return ResolutionResult(resolved=False)
        if len(candidates) == 1 or candidates[0].score >= 0.9:
            return ResolutionResult(resolved=True, entity=candidates[0], candidates=candidates)

        names = [c.display_name for c in candidates[:5]]
        return ResolutionResult(
            resolved=False, candidates=candidates,
            needs_clarification=True,
            clarification_message=f"{len(candidates)} ürün bulundu: {', '.join(names)}. Hangisi?",
        )

    def resolve_invoice(self, query: str, tenant_id: str, limit: int = 5) -> ResolutionResult:
        """Resolve an invoice by number, patient name, or device."""
        query = query.strip()
        if not query:
            return ResolutionResult(resolved=False)

        candidates = self._invoice_fts(query, tenant_id, limit)
        if not candidates:
            return ResolutionResult(resolved=False)
        if len(candidates) == 1:
            return ResolutionResult(resolved=True, entity=candidates[0], candidates=candidates)

        nums = [c.display_name for c in candidates[:5]]
        return ResolutionResult(
            resolved=False, candidates=candidates,
            needs_clarification=True,
            clarification_message=f"{len(candidates)} fatura bulundu: {', '.join(nums)}. Hangisi?",
        )

    def search_notes(self, query: str, tenant_id: str, party_id: Optional[str] = None, limit: int = 10) -> List[ResolvedEntity]:
        """Search patient notes by content."""
        try:
            sql = text("""
                SELECT pn.id, pn.party_id, pn.title, pn.content,
                       ts_rank(pn.search_vector, plainto_tsquery('simple', :q)) as rank
                FROM patient_notes pn
                JOIN parties p ON pn.party_id = p.id
                WHERE p.tenant_id = :tid
                  AND pn.search_vector @@ plainto_tsquery('simple', :q)
                  AND (:pid IS NULL OR pn.party_id = :pid)
                ORDER BY rank DESC
                LIMIT :lim
            """)
            rows = self.db.execute(sql, {"q": query, "tid": tenant_id, "pid": party_id, "lim": limit}).fetchall()
            return [
                ResolvedEntity(
                    entity_type="note", entity_id=r[0],
                    display_name=r[2] or r[3][:80] if r[3] else "Not",
                    score=min(float(r[4]) / 2.0, 1.0),
                    metadata={"party_id": r[1], "content_preview": (r[3] or "")[:200]},
                )
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"Note search failed (FTS may not be available): {e}")
            return []

    # ─── Private methods ────────────────────────────────────────────

    def _party_exact_id(self, query: str, tenant_id: str) -> List[ResolvedEntity]:
        try:
            from models.party import Party
            p = self.db.query(Party).filter(Party.id == query, Party.tenant_id == tenant_id).first()
            if p:
                return [ResolvedEntity(
                    entity_type="party", entity_id=p.id,
                    display_name=f"{p.first_name} {p.last_name}", score=1.0,
                    metadata={"phone": p.phone, "tc": getattr(p, 'tc_number', None)},
                )]
        except Exception:
            pass
        return []

    def _party_exact_phone_tc(self, query: str, tenant_id: str) -> List[ResolvedEntity]:
        try:
            from models.party import Party
            p = self.db.query(Party).filter(
                Party.tenant_id == tenant_id,
                or_(Party.phone == query, Party.tc_number == query),
            ).first()
            if p:
                return [ResolvedEntity(
                    entity_type="party", entity_id=p.id,
                    display_name=f"{p.first_name} {p.last_name}", score=1.0,
                    metadata={"phone": p.phone, "tc": getattr(p, 'tc_number', None)},
                )]
        except Exception:
            pass
        return []

    def _party_fts(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        """Full-text search using search_vector."""
        try:
            sql = text("""
                SELECT id, first_name, last_name, phone, tc_number,
                       ts_rank(search_vector, plainto_tsquery('simple', :q)) as rank
                FROM parties
                WHERE tenant_id = :tid
                  AND search_vector @@ plainto_tsquery('simple', :q)
                ORDER BY rank DESC
                LIMIT :lim
            """)
            rows = self.db.execute(sql, {"q": query, "tid": tenant_id, "lim": limit}).fetchall()
            return [
                ResolvedEntity(
                    entity_type="party", entity_id=r[0],
                    display_name=f"{r[1]} {r[2]}", score=min(float(r[5]) + 0.5, 1.0),
                    metadata={"phone": r[3], "tc": r[4]},
                )
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"Party FTS failed (search_vector may not exist): {e}")
            # Fallback to ILIKE
            return self._party_ilike(query, tenant_id, limit)

    def _party_ilike(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        """Fallback ILIKE search."""
        try:
            from models.party import Party
            term = f"%{query}%"
            results = self.db.query(Party).filter(
                Party.tenant_id == tenant_id,
                or_(
                    Party.first_name.ilike(term),
                    Party.last_name.ilike(term),
                    Party.phone.ilike(term),
                    Party.email.ilike(term),
                ),
            ).limit(limit).all()
            return [
                ResolvedEntity(
                    entity_type="party", entity_id=p.id,
                    display_name=f"{p.first_name} {p.last_name}", score=0.6,
                    metadata={"phone": p.phone},
                )
                for p in results
            ]
        except Exception:
            return []

    def _party_fuzzy(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        """Fuzzy trigram search for typo tolerance."""
        try:
            sql = text("""
                SELECT id, first_name, last_name, phone,
                       GREATEST(
                           similarity(first_name, :q),
                           similarity(last_name, :q),
                           similarity(first_name || ' ' || last_name, :q)
                       ) as sim
                FROM parties
                WHERE tenant_id = :tid
                  AND (
                      similarity(first_name, :q) > :thr
                      OR similarity(last_name, :q) > :thr
                      OR similarity(first_name || ' ' || last_name, :q) > :thr
                  )
                ORDER BY sim DESC
                LIMIT :lim
            """)
            rows = self.db.execute(sql, {"q": query, "tid": tenant_id, "thr": SIMILARITY_THRESHOLD, "lim": limit}).fetchall()
            return [
                ResolvedEntity(
                    entity_type="party", entity_id=r[0],
                    display_name=f"{r[1]} {r[2]}", score=float(r[4]),
                    metadata={"phone": r[3]},
                )
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"Party fuzzy search failed (pg_trgm may not be installed): {e}")
            return []

    def _inventory_fts(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        try:
            sql = text("""
                SELECT id, name, brand, model, available_inventory,
                       ts_rank(search_vector, plainto_tsquery('simple', :q)) as rank
                FROM inventory
                WHERE tenant_id = :tid
                  AND search_vector @@ plainto_tsquery('simple', :q)
                ORDER BY rank DESC
                LIMIT :lim
            """)
            rows = self.db.execute(sql, {"q": query, "tid": tenant_id, "lim": limit}).fetchall()
            return [
                ResolvedEntity(
                    entity_type="inventory", entity_id=r[0],
                    display_name=f"{r[1] or ''} {r[2] or ''} {r[3] or ''}".strip(),
                    score=min(float(r[5]) + 0.5, 1.0),
                    metadata={"stock": r[4]},
                )
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"Inventory FTS failed: {e}")
            return self._inventory_ilike(query, tenant_id, limit)

    def _inventory_ilike(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        try:
            from models.inventory import InventoryItem
            term = f"%{query}%"
            items = self.db.query(InventoryItem).filter(
                InventoryItem.tenant_id == tenant_id,
                or_(
                    InventoryItem.name.ilike(term),
                    InventoryItem.brand.ilike(term),
                    InventoryItem.model.ilike(term),
                    InventoryItem.barcode.ilike(term),
                ),
            ).limit(limit).all()
            return [
                ResolvedEntity(
                    entity_type="inventory", entity_id=i.id,
                    display_name=f"{i.name or ''} {i.brand or ''} {i.model or ''}".strip(),
                    score=0.6,
                    metadata={"stock": i.available_inventory},
                )
                for i in items
            ]
        except Exception:
            return []

    def _invoice_fts(self, query: str, tenant_id: str, limit: int) -> List[ResolvedEntity]:
        try:
            sql = text("""
                SELECT id, invoice_number, patient_name, device_name, status,
                       ts_rank(search_vector, plainto_tsquery('simple', :q)) as rank
                FROM invoices
                WHERE tenant_id = :tid
                  AND search_vector @@ plainto_tsquery('simple', :q)
                ORDER BY rank DESC
                LIMIT :lim
            """)
            rows = self.db.execute(sql, {"q": query, "tid": tenant_id, "lim": limit}).fetchall()
            return [
                ResolvedEntity(
                    entity_type="invoice", entity_id=r[0],
                    display_name=f"{r[1]} - {r[2] or ''}",
                    score=min(float(r[5]) + 0.5, 1.0),
                    metadata={"status": r[4], "device": r[3]},
                )
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"Invoice FTS failed: {e}")
            return []


def get_entity_resolver(db: Session) -> EntityResolver:
    """Factory function for EntityResolver."""
    return EntityResolver(db)
