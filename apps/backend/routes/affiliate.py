from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService
from db import get_db
from typing import List

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

def get_affiliate_service():
    return AffiliateService


class AffiliateRegisterRequest(BaseModel):
    email: str
    password: str
    iban: str | None = None


class AffiliateLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register", response_model=None)
def register_affiliate(payload: AffiliateRegisterRequest, db: Session = Depends(get_db)):
    try:
        affiliate = AffiliateService.create_affiliate(db, payload.email, payload.password, payload.iban)
        return {"id": affiliate.id, "email": affiliate.email, "code": affiliate.code}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=None)
def login_affiliate(payload: AffiliateLoginRequest, db: Session = Depends(get_db)):
    try:
        user = AffiliateService.authenticate(db, payload.email, payload.password)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        display_id = f"{user.created_at.strftime('%y%m%d')}{user.id}"
        return {"id": user.id, "display_id": display_id, "email": user.email, "is_active": user.is_active}
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=None)
def get_me(affiliate_id: int, db: Session = Depends(get_db)):
    try:
        print(f"Fetching affiliate with ID: {affiliate_id}")
        user = AffiliateService.get_affiliate_by_id(db, affiliate_id)
        if not user:
            raise HTTPException(status_code=404, detail="Affiliate not found")
        display_id = f"{user.created_at.strftime('%y%m%d')}{user.id}"
        return {
            "id": user.id, 
            "display_id": display_id, 
            "email": user.email, 
            "iban": user.iban, 
            "account_holder_name": user.account_holder_name,
            "phone_number": user.phone_number,
            "is_active": user.is_active, 
            "code": user.code
        }
    except Exception as e:
        print(f"Get Me Error: {e}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")


class UpdatePaymentInfoRequest(BaseModel):
    iban: str
    account_holder_name: str | None = None
    phone_number: str | None = None

@router.patch("/{affiliate_id}", response_model=None)
def update_affiliate_payment(affiliate_id: int, payload: UpdatePaymentInfoRequest, db: Session = Depends(get_db)):
    try:
        user = AffiliateService.update_payment_info(db, affiliate_id, payload.iban, payload.account_holder_name, payload.phone_number)
        return {"id": user.id, "iban": user.iban, "account_holder_name": user.account_holder_name, "phone_number": user.phone_number}
    except Exception as e:
        print(f"Update IBAN Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{affiliate_id}/commissions", response_model=None)
def get_affiliate_commissions(affiliate_id: int, db: Session = Depends(get_db)):
    try:
        commissions = AffiliateService.get_commissions(db, affiliate_id)
        return [
            {
                "id": c.id,
                "event": c.event,
                "amount": float(c.amount), # specific conversion for Decimal
                "status": c.status,
                "created_at": c.created_at
            }
            for c in commissions
        ]
    except Exception as e:
        print(f"Get Commissions Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[dict])
def list_affiliates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        users = AffiliateService.list_affiliates(db, skip, limit)
        return [{
            "id": u.id, 
            "display_id": f"{u.created_at.strftime('%y%m%d')}{u.id}", 
            "email": u.email, 
            "iban": u.iban,
            "account_holder_name": u.account_holder_name,
            "phone_number": u.phone_number,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users]
    except Exception as e:
         print(f"List Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/{affiliate_id}/details", response_model=None)
def get_affiliate_details(affiliate_id: int, db: Session = Depends(get_db)):
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
                "tenant_id": tenant.id,
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
        print(f"Get Affiliate Details Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{affiliate_id}/toggle-status", response_model=None)
def toggle_affiliate_status(affiliate_id: int, db: Session = Depends(get_db)):
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
        print(f"Toggle Status Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
