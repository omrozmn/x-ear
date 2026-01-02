"""
Affiliate routes for admin panel (Flask version)
This wraps the FastAPI endpoints for compatibility with the existing Flask app
"""
from flask import Blueprint, request, jsonify
from models.base import db
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService
from models.tenant import Tenant
from models.subscription import Subscription
from models.plan import Plan
from models.user import User
from utils.tenant_security import UnboundSession

affiliate_admin_bp = Blueprint('affiliate_admin', __name__, url_prefix='/api/affiliate')

@affiliate_admin_bp.route('/<int:affiliate_id>/details', methods=['GET'])
def get_affiliate_details(affiliate_id: int):
    """Get detailed affiliate information with referrals"""
    try:
        with UnboundSession():
            affiliate = AffiliateService.get_affiliate_by_id(db.session, affiliate_id)
            if not affiliate:
                return jsonify({"success": False, "error": "Affiliate not found"}), 404
            
            # Get all users who used this affiliate code
            referred_users = db.session.query(User).filter(User.affiliate_code == affiliate.code).all()
            
            # Get unique tenants from these users
            tenant_ids = list(set(u.tenant_id for u in referred_users if u.tenant_id))
            referred_tenants = db.session.query(Tenant).filter(Tenant.id.in_(tenant_ids)).all() if tenant_ids else []
            
            referrals = []
            total_revenue = 0.0
            
            for tenant in referred_tenants:
                # Get tenant's subscription
                subscription = db.session.query(Subscription).filter_by(tenant_id=tenant.id).first()
                
                subscription_info = None
                if subscription:
                    plan = db.session.query(Plan).filter_by(id=subscription.plan_id).first()
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
            commissions = AffiliateService.get_commissions(db.session, affiliate_id)
            total_commission = sum(float(c.amount) for c in commissions)
            
            return jsonify({
                "success": True,
                "data": {
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
            })
    except Exception as e:
        print(f"Get Affiliate Details Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@affiliate_admin_bp.route('/<int:affiliate_id>/toggle-status', methods=['PATCH'])
def toggle_affiliate_status(affiliate_id: int):
    """Toggle affiliate active/inactive status"""
    try:
        affiliate = AffiliateService.get_affiliate_by_id(db.session, affiliate_id)
        if not affiliate:
            return jsonify({"success": False, "error": "Affiliate not found"}), 404
        
        affiliate.is_active = not affiliate.is_active
        db.session.commit()
        
        return jsonify({
            "success": True,
            "data": {
                "id": affiliate.id,
                "is_active": affiliate.is_active,
                "message": f"Affiliate {'activated' if affiliate.is_active else 'deactivated'} successfully"
            }
        })
    except Exception as e:
        print(f"Toggle Status Error: {e}")
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
