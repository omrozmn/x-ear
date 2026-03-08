from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from core.database import get_db
from ai.models.opportunity import AIOpportunity, OpportunityStatus
from ai.schemas.opportunity import (
    OpportunitySummary, 
    OpportunityFull, 
    OpportunityListResponse,
    OpportunityUpdateState
)
from schemas.base import ResponseEnvelope
from starlette import status as http_status
import uuid

router = APIRouter(prefix="/ai/opportunities", tags=["AI Opportunities"])


async def _get_user_context(request: Request) -> Dict[str, Any]:
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)
    if not tenant_id or not user_id:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return {"tenant_id": tenant_id, "user_id": user_id}


@router.get("/", 
    response_model=ResponseEnvelope[List[OpportunitySummary]],
    operation_id="list_ai_opportunities")
async def list_opportunities(
    request: Request,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List proactive opportunities for the tenant."""
    ctx = await _get_user_context(request)
    query = db.query(AIOpportunity).filter(AIOpportunity.tenant_id == ctx["tenant_id"])
    
    if status:
        query = query.filter(AIOpportunity.status == status)
    if category:
        query = query.filter(AIOpportunity.category == category)
        
    opportunities = query.order_by(AIOpportunity.impact_score.desc()).all()
    
    return ResponseEnvelope(
        data=[OpportunitySummary(**opp.to_summary_dict()) for opp in opportunities]
    )

@router.get("/{opportunity_id}", 
    response_model=ResponseEnvelope[OpportunityFull],
    operation_id="get_ai_opportunity")
async def get_opportunity(
    request: Request,
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed view of an opportunity."""
    ctx = await _get_user_context(request)
    opp = db.query(AIOpportunity).filter(
        AIOpportunity.id == opportunity_id,
        AIOpportunity.tenant_id == ctx["tenant_id"]
    ).first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    return ResponseEnvelope(data=OpportunityFull(**opp.to_full_dict()))

@router.patch("/{opportunity_id}", 
    response_model=ResponseEnvelope[OpportunitySummary],
    operation_id="update_ai_opportunity_state")
async def update_opportunity_state(
    request: Request,
    opportunity_id: str,
    payload: OpportunityUpdateState,
    db: Session = Depends(get_db)
):
    """Transition opportunity status (e.g., ACKNOWLEDGED, DISMISSED)."""
    ctx = await _get_user_context(request)
    opp = db.query(AIOpportunity).filter(
        AIOpportunity.id == opportunity_id,
        AIOpportunity.tenant_id == ctx["tenant_id"]
    ).first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    status = payload.status
    if status.upper() in OpportunityStatus.__members__:
        opp.status = OpportunityStatus[status.upper()]
        if status.upper() == "ACKNOWLEDGED":
            opp.is_acknowledged = True
        
        db.commit()
        return ResponseEnvelope(data=OpportunitySummary(**opp.to_summary_dict()))
    else:
        raise HTTPException(status_code=400, detail="Invalid status")

@router.post("/{opportunity_id}/simulate", 
    response_model=ResponseEnvelope[OpportunityFull],
    operation_id="simulate_ai_opportunity_action")
async def simulate_opportunity_action(
    request: Request,
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """
    Bridge to Action Planner (Agent B).
    Triggers the generation of a simulation plan for the recommended capability.
    """
    ctx = await _get_user_context(request)
    opp = db.query(AIOpportunity).filter(
        AIOpportunity.id == opportunity_id,
        AIOpportunity.tenant_id == ctx["tenant_id"]
    ).first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    # Simulate state transition to SIMULATED
    opp.status = OpportunityStatus.SIMULATED
    opp.action_status = {
        "mode": "SIMULATE",
        "status": "READY_FOR_APPROVAL",
        "plan_id": f"plan_{str(uuid.uuid4().hex)[:8]}",
        "approval_required": True
    }
    
    db.commit()
    return ResponseEnvelope(data=OpportunityFull(**opp.to_full_dict()))
