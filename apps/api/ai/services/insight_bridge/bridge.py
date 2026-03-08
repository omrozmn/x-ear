import logging
from typing import Optional
from sqlalchemy.orm import Session
from ai.models.opportunity import AIOpportunity, OpportunityStatus
from ai.agents.action_planner import get_action_planner
from ai.agents.intent_refiner import IntentRefinerResult, IntentType

logger = logging.getLogger(__name__)

class InsightActionBridge:
    """
    Bridge Layer: Insight -> Action Planner (Agent B).
    """

    def __init__(self, db: Session):
        self.db = db
        self.planner = get_action_planner()

    async def propose_action_plan(self, opportunity: AIOpportunity, user_id: str, permissions: list):
        """
        Takes an opportunity and uses Agent B to generate a draft plan.
        """
        if opportunity.status not in [OpportunityStatus.NEW, OpportunityStatus.VISIBLE]:
            return None

        # Mock an Intent for Agent B
        class ProactiveIntent:
            def __init__(self, opp: AIOpportunity):
                self.intent_type = IntentType.ACTION
                self.action_type = opp.recommended_capability
                self.entities = opp.evidence or {}
                self.confidence = opp.confidence_score
                self.clarification_needed = False
                self.reasoning = f"Proactive recommendation: {opp.title}. Reasoning: {'. '.join(opp.explanation or [])}"

        mock_intent = ProactiveIntent(opportunity)

        try:
            plan_result = await self.planner.create_plan(
                intent=mock_intent,
                tenant_id=opportunity.tenant_id,
                user_id=user_id,
                user_permissions=permissions,
                context={
                    "is_proactive": True, 
                    "insight_id": opportunity.id,
                    "impact_score": opportunity.impact_score
                }
            )

            if plan_result.is_success and plan_result.plan:
                opportunity.action_plan_id = plan_result.plan.plan_id
                opportunity.status = OpportunityStatus.PLANNED
                opportunity.action_status = {
                    "mode": plan_result.plan.mode,
                    "status": "READY_FOR_APPROVAL" if plan_result.plan.requires_approval else "COMPLETED",
                    "plan_id": plan_result.plan.plan_id,
                    "approval_required": plan_result.plan.requires_approval
                }
                self.db.commit()
                
                logger.info(f"Generated draft plan {opportunity.action_plan_id} for opportunity {opportunity.id}")
                return plan_result.plan

        except Exception as e:
            logger.error(f"Failed to bridge opportunity to action plan: {e}")
            opportunity.status = OpportunityStatus.FAILED
            self.db.commit()
            
        return None

def get_insight_bridge(db: Session) -> InsightActionBridge:
    return InsightActionBridge(db)
