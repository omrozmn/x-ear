import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
"""Super quick seeder - use existing seed_faker_data.py for most data"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app
from utils.tenant_security import _skip_filter

def run():
    with app.app_context():
        _skip_filter.set(True)
        
        print("\n🎯 COMPREHENSIVE DATA SEEDING")
        print("="*60)
        
        # Check existing data
        from models.patient import Patient
        from models.suppliers import Supplier
        from models.inventory import InventoryItem
        from models.appointment import Appointment
        from models.campaign import Campaign
        from models.tenant import Tenant
        from models.role import Role
        
        patient_count = Patient.query.count()
        supplier_count = Supplier.query.count()
        inventory_count = InventoryItem.query.count()
        appointment_count = Appointment.query.count()
        campaign_count = Campaign.query.count()
        tenant_count = Tenant.query.count()
        role_count = Role.query.count()
        
        print("\n📊 Current Data:")
        print(f"   - Tenants: {tenant_count}")
        print(f"   - Patients: {patient_count}")
        print(f"   - Suppliers: {supplier_count}")
        print(f"   - Inventory: {inventory_count}")
        print(f"   - Appointments: {appointment_count}")
        print(f"   - Campaigns: {campaign_count}")
        print(f"   - Roles: {role_count}")
        
        if patient_count == 0:
            print("\n⚠️  No base data found!")
            print("📝 Run: python3 seed_faker_data.py first")
        else:
            print("\n✅ Base data exists!")
            
        if campaign_count == 0:
            print("📝 Run: echo 'yes' | python3 seed_admin_panel_data.py")
        else:
            print(f"✅ Campaign data exists ({campaign_count} campaigns)")
            
        print("\n" + "="*60)
        print("💡 TIP: Mevcut seed_faker_data.py zaten var.")
        print("   Çalıştırmak için: python3 seed_faker_data.py")
        print("="*60)

if __name__ == "__main__":
    run()
