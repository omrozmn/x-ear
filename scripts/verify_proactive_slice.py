import asyncio
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
from ai.insights.stock_guardian import get_stock_guardian
from ai.insights.refiner import get_insight_refiner
from ai.services.insight_bridge.bridge import get_insight_bridge
from ai.models.opportunity import AIOpportunity, OpportunityStatus
from core.models.tenant import Tenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_proactive_vertical_slice():
    """
    Verifies the end-to-end proactive flow for a single tenant.
    """
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        if not tenant:
            logger.error("No tenant found for verification.")
            return

        logger.info(f"--- Starting Vertical Slice Verification for Tenant: {tenant.id} ---")

        # 1. Run Analyzer
        guardian = get_stock_guardian(db)
        findings = await guardian.analyze(tenant.id)
        logger.info(f"Step 1: Analyzer found {len(findings)} raw insights.")

        # 2. Run Refiner
        refiner = get_insight_refiner(db)
        opportunities = await refiner.refine_and_store(findings)
        logger.info(f"Step 2: Refiner produced {len(opportunities)} opportunities.")

        for opp in opportunities:
            logger.info(f"Opportunity: {opp.title} | Status: {opp.status.value} | Impact: {opp.impact_score}")
            
            # 3. Run Bridge (Generate Action Plan)
            bridge = get_insight_bridge(db)
            # Mock system user with admin perms
            await bridge.propose_action_plan(opp, user_id="system_test", permissions=["*"])
            
            # 4. Verify DB State Change
            db.refresh(opp)
            logger.info(f"Step 3/4: Bridge output -> Status: {opp.status.value} | PlanID: {opp.action_plan_id}")
            logger.info(f"Action Status: {opp.action_status}")

        logger.info("--- Verification Completed Successfully ---")

    except Exception as e:
        logger.error(f"Verification Failed: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_proactive_vertical_slice())
