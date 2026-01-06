"""Affiliates Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.affiliates import AffiliateRead, AffiliateCreate, AffiliateUpdate, CommissionRead
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService
from middleware.unified_access import UnifiedAccess, require_access, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/affiliates", tags=["Affiliates"])

@router.get("/check/{code}")
async def check_affiliate(code: str, db: Session = Depends(get_db)):
    """Check if affiliate code exists (Public)"""
    try:
        affiliate = db.query(AffiliateUser).filter(AffiliateUser.code == code).first()
        if not affiliate:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        
        return ResponseEnvelope(data={
            "id": affiliate.id,
            "name": f"{affiliate.first_name} {affiliate.last_name}",
            "code": affiliate.code
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register", response_model=ResponseEnvelope[AffiliateRead])
async def register_affiliate(data: AffiliateCreate, db: Session = Depends(get_db)):
    """Register a new affiliate"""
    try:
        affiliate = AffiliateService.create_affiliate(db, data.email, data.password, data.iban)
        return ResponseEnvelope(data={"id": affiliate.id, "email": affiliate.email, "code": affiliate.code, "referralCode": affiliate.code})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login_affiliate(email: str, password: str, db: Session = Depends(get_db)):
    """Login affiliate"""
    try:
        user = AffiliateService.authenticate(db, email, password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        display_id = f"{user.created_at.strftime('%y%m%d')}{user.id}"
        return ResponseEnvelope(data={"id": user.id, "display_id": display_id, "email": user.email, "is_active": user.is_active})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=ResponseEnvelope[AffiliateRead])
async def get_me(affiliate_id: int, db: Session = Depends(get_db)):
    """Get current affiliate info"""
    try:
        user = AffiliateService.get_affiliate_by_id(db, affiliate_id)
        if not user:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        display_id = f"{user.created_at.strftime('%y%m%d')}{user.id}"
        return ResponseEnvelope(data={
            "id": user.id, "display_id": display_id, "email": user.email,
            "iban": user.iban, "account_holder_name": user.account_holder_name,
            "phone_number": user.phone_number, "is_active": user.is_active, "code": user.code,
            "referralCode": user.code
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{affiliate_id}", response_model=ResponseEnvelope[AffiliateRead])
async def update_affiliate_payment(affiliate_id: int, data: AffiliateUpdate, db: Session = Depends(get_db)):
    """Update affiliate payment info"""
    try:
        user = AffiliateService.update_payment_info(db, affiliate_id, data.iban, data.company_name, data.phone)
        return ResponseEnvelope(data={"id": user.id, "iban": user.iban, "account_holder_name": user.account_holder_name, "phone_number": user.phone_number, "referralCode": user.code})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{affiliate_id}/commissions", response_model=ResponseEnvelope[List[CommissionRead]])
async def get_affiliate_commissions(affiliate_id: int, db: Session = Depends(get_db)):
    """Get affiliate commissions"""
    try:
        commissions = AffiliateService.get_commissions(db, affiliate_id)
        return ResponseEnvelope(data=[{"id": c.id, "event": c.event, "amount": float(c.amount), "status": c.status, "createdAt": c.created_at.isoformat() if c.created_at else None} for c in commissions])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{affiliate_id}/details", response_model=ResponseEnvelope[AffiliateRead])
async def get_affiliate_details(affiliate_id: int, db: Session = Depends(get_db)):
    """Get detailed affiliate information with referrals"""
    try:
        from models.tenant import Tenant
        from models.subscription import Subscription
        from models.plan import Plan
        from models.user import User
        
        affiliate = AffiliateService.get_affiliate_by_id(db, affiliate_id)
        if not affiliate:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        
        # Get all users who used this affiliate code
        referred_users = db.query(User).filter(User.affiliate_code == affiliate.code).all()
        
        # Get unique tenants from these users
        tenant_ids = list(set(u.tenant_id for u in referred_users if u.tenant_id))
        referred_tenants = db.query(Tenant).filter(Tenant.id.in_(tenant_ids)).all() if tenant_ids else []
        
        referrals = []
        total_revenue = 0.0
        
        for tenant in referred_tenants:
            # Get tenant's subscription
            subscription = db.query(Subscription).filter_by(tenant_id=tenant.id).first()
            
            subscription_info = None
            if subscription:
                plan = db.query(Plan).filter_by(id=subscription.plan_id).first()
                subscription_info = {
                    "plan_name": plan.name if plan else "Unknown",
                    "price": float(plan.price) if plan else 0,
                    "status": subscription.status,
                    "start_date": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
                    "end_date": subscription.current_period_end.isoformat() if subscription.current_period_end else None
                }
                if plan:
                    total_revenue += float(plan.price)
            
            referrals.append({
                "access.tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
                "subscription": subscription_info
            })
        
        # Get commissions
        commissions = AffiliateService.get_commissions(db, affiliate_id)
        total_commission = sum(float(c.amount) for c in commissions)
        
        return {
            "id": affiliate.id,
            "display_id": f"{affiliate.created_at.strftime('%y%m%d')}{affiliate.id}",
            "email": affiliate.email,
            "code": affiliate.code,
            "iban": affiliate.iban,
            "account_holder_name": affiliate.account_holder_name,
            "phone_number": affiliate.phone_number,
            "is_active": affiliate.is_active,
            "created_at": affiliate.created_at.isoformat() if affiliate.created_at else None,
            "stats": {
                "total_referrals": len(referrals),
                "total_revenue": total_revenue,
                "total_commission": total_commission,
                "active_subscriptions": sum(1 for r in referrals if r["subscription"] and r["subscription"]["status"] == "active")
            },
            "referrals": referrals,
            "recent_commissions": [{
                "id": c.id,
                "event": c.event,
                "amount": float(c.amount),
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None
            } for c in commissions[:10]]  # Last 10 commissions
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{affiliate_id}/toggle-status", response_model=ResponseEnvelope[AffiliateRead])
async def toggle_affiliate_status(affiliate_id: int, db: Session = Depends(get_db)):
    """Toggle affiliate active/inactive status"""
    try:
        affiliate = AffiliateService.get_affiliate_by_id(db, affiliate_id)
        if not affiliate:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        
        affiliate.is_active = not affiliate.is_active
        db.commit()
        db.refresh(affiliate)
        
        return {
            "id": affiliate.id,
            "is_active": affiliate.is_active,
            "message": f"Affiliate {'activated' if affiliate.is_active else 'deactivated'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=ResponseEnvelope[List[AffiliateRead]])
async def list_affiliates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all affiliates"""
    try:
        users = AffiliateService.list_affiliates(db, skip, limit)
        return [{
            "id": u.id, "display_id": f"{u.created_at.strftime('%y%m%d')}{u.id}",
            "email": u.email, "iban": u.iban, "account_holder_name": u.account_holder_name,
            "phone_number": u.phone_number, "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/lookup")
async def lookup_affiliate(
    code: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lookup affiliate by code or email"""
    try:
        if not code and not email:
            raise HTTPException(status_code=400, detail="code or email required")
        
        affiliate = None
        if code:
            affiliate = db.query(AffiliateUser).filter(AffiliateUser.code == code).first()
        elif email:
            affiliate = db.query(AffiliateUser).filter(AffiliateUser.email == email).first()
        
        if not affiliate:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        
        return {
            "success": True,
            "data": {
                "id": affiliate.id,
                "email": affiliate.email,
                "code": affiliate.code,
                "is_active": affiliate.is_active
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
