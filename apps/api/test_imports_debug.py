
import sys
import os

# Add backend directory to path
sys.path.append(os.getcwd())

try:
    print("Importing base...")
    print("Importing Tenant...")
    print("Importing User, ActivityLog...")
    print("Importing Plan...")
    print("Importing Invoice...")
    print("Importing Medical...")
    print("Importing Appointment...")
    print("Importing Patient...")
    print("Importing AdminPermissions...")
    
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
