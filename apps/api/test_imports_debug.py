
import sys
import os

# Add backend directory to path
sys.path.append(os.getcwd())

try:
    print("Importing base...")
    from models.base import db
    print("Importing Tenant...")
    from models.tenant import Tenant
    print("Importing User, ActivityLog...")
    from models.user import User, ActivityLog
    print("Importing Plan...")
    from models.plan import Plan
    print("Importing Invoice...")
    from models.invoice import Invoice
    print("Importing Medical...")
    from models.medical import EReceipt, HearingTest
    print("Importing Appointment...")
    from models.appointment import Appointment
    print("Importing Patient...")
    from models.patient import Patient
    print("Importing AdminPermissions...")
    from utils.admin_permissions import require_admin_permission, AdminPermissions
    
    print("Importing Sales (DeviceAssignment)...")
    try:
        from models.sales import DeviceAssignment
        print("Success: models.sales.DeviceAssignment")
    except ImportError as e:
        print(f"Failed: models.sales.DeviceAssignment - {e}")

    print("All imports successful.")
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
    import traceback
    traceback.print_exc()
