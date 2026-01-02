from app import app, db
from models.plan import Plan
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_plans():
    with app.app_context():
        plans = Plan.query.all()
        logger.info(f"Total plans in database: {len(plans)}")
        
        if plans:
            for p in plans:
                logger.info(f"  - {p.name} ({p.plan_type.value}): {p.price} TL, Active: {p.is_active}")
        else:
            logger.warning("No plans found in database!")
            logger.info("Creating sample plans...")
            
            # Create basic sample plans
            from models.plan import PlanType, BillingInterval
            import uuid
            
            basic = Plan(
                id=str(uuid.uuid4()),
                name='Temel Plan',
                slug='temel',
                description='Küçük işletmeler için ideal başlangıç paketi',
                plan_type=PlanType.BASIC,
                price=299.00,
                billing_interval=BillingInterval.MONTHLY,
                features={'max_devices': 50, 'max_patients': 100, 'support': 'email'},
                max_users=3,
                max_storage_gb=5,
                is_active=True,
                is_public=True
            )
            
            professional = Plan(
                id=str(uuid.uuid4()),
                name='Profesyonel Plan',
                slug='profesyonel',
                description='Orta ölçekli klinikler için',
                plan_type=PlanType.PRO,
                price=599.00,
                billing_interval=BillingInterval.MONTHLY,
                features={'max_devices': 200, 'max_patients': 500, 'support': 'priority'},
                max_users=10,
                max_storage_gb=20,
                is_active=True,
                is_public=True
            )
            
            db.session.add(basic)
            db.session.add(professional)
            db.session.commit()
            
            logger.info(f"Created 2 sample plans successfully")

if __name__ == "__main__":
    check_plans()
