import logging
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ai.models.opportunity import AIOpportunity, OpportunityStatus, OpportunityPriority

logger = logging.getLogger(__name__)

class InsightRefiner:
    """
    Agent A Extension: Proactive Insight Refinement.
    
    Responsibilities:
    - **Trigger Policy**: Apply `min_confidence` and `min_impact` filters.
    - **Notification Strategy**: Decide if insight warrants a notification vs. just Inbox entry.
    - **Deduplicate & Escalate**: Prevent spam or update severity.
    """
    
    # Trigger Thresholds
    MIN_CONFIDENCE = 0.65
    MIN_IMPACT = 0.30
    NOTIFICATION_THRESHOLD_IMPACT = 0.80 # High impact triggers notification
    
    DEDUP_WINDOW_DAYS = 7

    def __init__(self, db: Session):
        self.db = db

    def _generate_dedup_hash(self, tenant_id: str, insight_type: str, entity_id: str) -> str:
        """Generate a stable hash for deduplication/lookup."""
        data = f"{tenant_id}:{insight_type}:{entity_id}"
        return hashlib.sha256(data.encode()).hexdigest()

    def get_existing_insight(self, dedup_hash: str) -> Optional[AIOpportunity]:
        """Fetch existing active insight for potential escalation."""
        window_start = datetime.now(timezone.utc) - timedelta(days=self.DEDUP_WINDOW_DAYS)
        return self.db.query(AIOpportunity).filter(
            AIOpportunity.dedup_hash == dedup_hash,
            AIOpportunity.created_at >= window_start,
            AIOpportunity.status.in_([OpportunityStatus.NEW, OpportunityStatus.VISIBLE, OpportunityStatus.ACKNOWLEDGED])
        ).first()

    async def refine_and_store(self, raw_insights: List[Dict[str, Any]], locale: str = "tr") -> List[AIOpportunity]:
        """
        Process raw findings from analyzers and convert/update Opportunities.
        """
        processed_opportunities = []
        
        for raw in raw_insights:
            tenant_id = raw.get("tenant_id")
            insight_type = raw.get("type")
            entity_id = str(raw.get("entity_id", "global"))
            
            if not tenant_id or not insight_type:
                logger.warning("Skipping insight: missing tenant_id or type")
                continue

            dedup_hash = self._generate_dedup_hash(str(tenant_id), str(insight_type), entity_id)
            existing = self.get_existing_insight(dedup_hash)
            
            impact_score = float(raw.get("impact_score", 0.0))
            confidence_score = float(raw.get("confidence_score", 1.0))
            
            # --- Trigger Policy Check ---
            if confidence_score < self.MIN_CONFIDENCE:
                logger.debug(f"Insight suppressed: low confidence ({confidence_score})")
                continue
                
            if impact_score < self.MIN_IMPACT:
                logger.debug(f"Insight suppressed: low impact ({impact_score})")
                continue
            
            if existing:
                # Escalation logic
                if impact_score > existing.impact_score or raw.get("force_update", False):
                    logger.info(f"Escalating insight {existing.id} for {entity_id}")
                    existing.impact_score = impact_score
                    existing.confidence_score = confidence_score
                    existing.title = raw.get("title", existing.title)
                    existing.summary = raw.get("summary", existing.summary)
                    existing.why_now = raw.get("why_now", existing.why_now or "")
                    existing.explanation = raw.get("explanation", existing.explanation)
                    existing.evidence = raw.get("evidence", existing.evidence)
                    existing.status = OpportunityStatus.NEW # Reset to new for visibility
                    existing.is_acknowledged = False
                    processed_opportunities.append(existing)
                continue
            
            # --- Notification Strategy ---
            # Decide UI delivery (Inbox vs. Notification)
            ui_config = raw.get("ui_config", {"render_as": "card"})
            should_notify = impact_score >= self.NOTIFICATION_THRESHOLD_IMPACT
            
            # Create New Opportunity
            opportunity = AIOpportunity(
                tenant_id=tenant_id,
                category=raw.get("category", "operational"),
                type=insight_type,
                scope=raw.get("scope", "single"),
                entity_type=raw.get("entity_type"),
                entity_id=entity_id,
                priority=raw.get("priority", OpportunityPriority.MEDIUM),
                confidence_score=confidence_score,
                impact_score=impact_score,
                title=raw.get("title"),
                summary=raw.get("summary"),
                why_now=raw.get("why_now"),
                explanation=raw.get("explanation", []),
                evidence=raw.get("evidence"),
                recommended_capability=raw.get("recommended_capability"),
                recommended_action_label=raw.get("recommended_action_label"),
                alternative_actions=raw.get("alternative_actions", []),
                user_decision_options=raw.get("user_decision_options", ["acknowledge", "dismiss", "simulate", "open_in_chat"]),
                required_slots=raw.get("required_slots", []),
                status=OpportunityStatus.NEW,
                ui_config={**ui_config, "should_push_notification": should_notify},
                dedup_hash=dedup_hash,
                expires_at=datetime.now(timezone.utc) + timedelta(days=14)
            )
            
            self.db.add(opportunity)
            processed_opportunities.append(opportunity)
        
        if processed_opportunities:
            self.db.commit()
            logger.info(f"Processed {len(processed_opportunities)} AI opportunities")
            
        return processed_opportunities

def get_insight_refiner(db: Session) -> InsightRefiner:
    return InsightRefiner(db)
