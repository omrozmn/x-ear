from app import app, db
from models.plan import Plan, PlanType, BillingInterval

def seed_plans():
    with app.app_context():
        plans = [
            {
                "id": "basic",
                "name": "Temel Paket",
                "slug": "basic",
                "description": "Yeni başlayanlar için",
                "price": 299.00,
                "plan_type": PlanType.BASIC,
                "max_users": 1,
                "features": {"list": ["100 Hasta", "Temel Randevu"]}
            },
            {
                "id": "professional",
                "name": "Profesyonel Paket",
                "slug": "professional",
                "description": "Büyüyen klinikler için",
                "price": 599.00,
                "plan_type": PlanType.PRO,
                "max_users": 5,
                "features": {"list": ["500 Hasta", "Cihaz Takibi", "Envanter"]}
            },
            {
                "id": "business",
                "name": "Business Paket",
                "slug": "business",
                "description": "Kapsamlı özellikler",
                "price": 999.00,
                "plan_type": PlanType.ENTERPRISE,
                "max_users": 10,
                "features": {"list": ["2000 Hasta", "SGK Entegrasyonu", "OCR"]}
            }
        ]

        for p_data in plans:
            # Check by slug first to avoid unique constraint error
            existing_slug = Plan.query.filter_by(slug=p_data['slug']).first()
            if existing_slug and existing_slug.id != p_data['id']:
                print(f"Deleting existing plan with slug {p_data['slug']} but different ID")
                db.session.delete(existing_slug)
                db.session.commit() # Commit deletion immediately

            existing = db.session.get(Plan, p_data['id'])
            if not existing:
                plan = Plan(
                    id=p_data['id'],
                    name=p_data['name'],
                    slug=p_data['slug'],
                    description=p_data['description'],
                    price=p_data['price'],
                    plan_type=p_data['plan_type'],
                    billing_interval=BillingInterval.MONTHLY,
                    max_users=p_data['max_users'],
                    features=p_data['features'],
                    is_active=True
                )
                db.session.add(plan)
                print(f"Created plan: {p_data['slug']}")
            else:
                print(f"Plan already exists: {p_data['slug']}")
        
        db.session.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    seed_plans()
