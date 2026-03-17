import logging
import asyncio
from database import SessionLocal
from ai.insights.refiner import get_insight_refiner
from ai.services.insight_bridge.bridge import get_insight_bridge
from core.models.tenant import Tenant

logger = logging.getLogger(__name__)

async def run_proactive_analysis_cycle():
    """
    Main orchestration cycle for Proactive AI.
    Runs all analyzers and bridges findings to the AI pipeline.
    """
    logger.info("Starting proactive AI analysis cycle")
    
    db = SessionLocal()
    try:
        # 1. Get all active tenants
        tenants = db.query(Tenant).all()
        
        from ai.insights.base import AnalyzerRegistry
        registry = AnalyzerRegistry(db)
        refiner = get_insight_refiner(db)
        bridge = get_insight_bridge(db)
        
        for tenant in tenants:
            # Detect Locale
            tenant_locale = "tr"
            if tenant.settings and isinstance(tenant.settings, dict):
                tenant_locale = tenant.settings.get("language", tenant.settings.get("locale", "tr"))
            
            # 2. Run All Registered Analyzers
            analyzers = registry.get_analyzers() # Filter by schedule here if needed
            for analyzer in analyzers:
                logger.info(f"Running {analyzer.insight_id} for {tenant.id} ({tenant_locale})")
                raw_findings = await analyzer.analyze(tenant.id, locale=tenant_locale)
                
                if not raw_findings:
                    continue
                    
                # 3. Refine into Opportunities
                new_opportunities = await refiner.refine_and_store(raw_findings, locale=tenant_locale)
            
            # 4. Bridge to Action Planner (Agent B Domain)
            # For proactive flow, we might use a 'system' user or tenant admin
            for opp in new_opportunities:
                # In this pilot, we just generate the draft plan
                # Mock permissions for the bridge (usually would fetch admin perms)
                admin_permissions = ["*"] 
                await bridge.propose_action_plan(opp, user_id="system", permissions=admin_permissions)
                
        logger.info("Proactive AI analysis cycle completed")
        
    except Exception as e:
        logger.error(f"Proactive analysis cycle failed: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    # Manual trigger for testing
    asyncio.run(run_proactive_analysis_cycle())
