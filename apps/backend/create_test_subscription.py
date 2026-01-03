#!/usr/bin/env python3
"""Create a test subscription for viewing"""
import sys
sys.path.insert(0, '.')
from app import app, db
from models.tenant import Tenant
from models.subscription import Subscription
from models.plan import Plan
from datetime import datetime, timedelta

with app.app_context():
    # Check if we have any plans
    plans = Plan.query.all()
    if not plans:
        print("No plans found. Creating a test plan...")
        plan = Plan(
            name="Premium Plan",
            description="Full featured plan for testing",
            price=999.99,
            billing_cycle="monthly",
            features={
                "max_users": 10,
                "max_patients": 1000,
                "sms_credits": 500,
                "storage_gb": 50
            },
            is_active=True
        )
        db.session.add(plan)
        db.session.commit()
        print(f"✅ Created plan: {plan.name} (ID: {plan.id})")
    else:
        plan = plans[0]
        print(f"✅ Using existing plan: {plan.name} (ID: {plan.id})")
    
    # Check if we have any tenants
    tenants = Tenant.query.all()
    if not tenants:
        print("No tenants found. Creating a test tenant...")
        tenant = Tenant(
            name="Test Company",
            subdomain="test-company",
            is_active=True
        )
        db.session.add(tenant)
        db.session.commit()
        print(f"✅ Created tenant: {tenant.name} (ID: {tenant.id})")
    else:
        tenant = tenants[0]
        print(f"✅ Using existing tenant: {tenant.name} (ID: {tenant.id})")
    
    # Check if tenant already has a subscription
    existing_sub = Subscription.query.filter_by(tenant_id=tenant.id).first()
    if existing_sub:
        print(f"Tenant already has a subscription. Updating it...")
        existing_sub.plan_id = plan.id
        existing_sub.status = 'active'
        existing_sub.current_period_start = datetime.utcnow()
        existing_sub.current_period_end = datetime.utcnow() + timedelta(days=30)
        db.session.commit()
        print(f"✅ Updated subscription for tenant: {tenant.name}")
        print(f"   Plan: {plan.name}")
        print(f"   Status: {existing_sub.status}")
        print(f"   End Date: {existing_sub.current_period_end}")
    else:
        print("Creating new subscription...")
        subscription = Subscription(
            tenant_id=tenant.id,
            plan_id=plan.id,
            status='active',
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30)
        )
        db.session.add(subscription)
        db.session.commit()
        print(f"✅ Created subscription for tenant: {tenant.name}")
        print(f"   Plan: {plan.name}")
        print(f"   Status: {subscription.status}")
        print(f"   End Date: {subscription.current_period_end}")
    
    print("\n📝 Note: Super admin users don't have tenant_id, so they won't see subscription info.")
    print("   To test subscription page, you need to login as a tenant user.")
    print("   Or we can modify the subscription service to show all subscriptions for super admin.")
