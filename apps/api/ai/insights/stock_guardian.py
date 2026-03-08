import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ai.core.models.inventory import InventoryItem
from ai.models.opportunity import OpportunityPriority
from ai.insights.base import BaseAnalyzer

logger = logging.getLogger(__name__)

class StockGuardian(BaseAnalyzer):
    """
    OP-003: Inventory Reorder Alert.
    """
    @property
    def insight_id(self) -> str:
        return "OP-003"

    @property
    def schedule(self) -> str:
        return "daily"

    def __init__(self, db: Session):
        super().__init__(db)

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """
        Scans inventory for low stock items and generates raw insights.
        """
        logger.info(f"Running StockGuardian for tenant {tenant_id} (locale: {locale})")
        
        # 1. Fetch low stock items (Available <= ReorderLevel)
        low_stock_items = self.db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.available_inventory <= InventoryItem.reorder_level,
            InventoryItem.is_active.is_(True)
        ).all()
        
        raw_insights = []
        
        # Multilang mapping (Simplified for pilot)
        titles = {
            "tr": "Düşük Stok: {}",
            "en": "Low Stock: {}"
        }
        summaries = {
            "tr": "Mevcut stok ({}) yeniden sipariş seviyesinin ({}) altında.",
            "en": "Available stock ({}) is below reorder level ({})."
        }
        # ... logic for why_now, explanation would follow same pattern
        
        for item in low_stock_items:
            # Simple impact scoring: lower stock = higher impact
            impact = min(1.0, 1.0 - (item.available_inventory / (item.reorder_level + 1)))
            
            raw_insights.append({
                "tenant_id": tenant_id,
                "category": "operational",
                "type": "stock_reorder_opportunity",
                "scope": "single",
                "entity_type": "product",
                "entity_id": item.id,
                "priority": OpportunityPriority.HIGH if impact > 0.7 else OpportunityPriority.MEDIUM,
                "confidence_score": 0.95,
                "impact_score": impact,
                "title": f"Low Stock: {item.name}",
                "summary": f"Available stock ({item.available_inventory}) is below reorder level ({item.reorder_level}).",
                "why_now": f"Inventory for {item.name} dropped below the safety threshold of {item.reorder_level} units.",
                "explanation": [
                    f"Current inventory level of {item.available_inventory} units is critically low.",
                    f"Reorder threshold of {item.reorder_level} has been breached.",
                    "Sourcing lead time may cause upcoming stockouts."
                ],
                "evidence": {
                    "item_id": item.id,
                    "available": item.available_inventory,
                    "reorder_level": item.reorder_level
                },
                "recommended_capability": "create_purchase_order_draft",
                "recommended_action_label": "Create Draft PO",
                "alternative_actions": [
                    { "capability": "notify_branch_manager", "label": "Notify Manager" }
                ],
                "user_decision_options": ["acknowledge", "dismiss", "simulate", "open_in_chat"],
                "required_slots": [
                    { "name": "supplier_id", "type": "entity_search", "required": True }
                ]
            })
            
        return raw_insights

def get_stock_guardian(db: Session) -> StockGuardian:
    return StockGuardian(db)
