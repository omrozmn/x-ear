
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

try:
    from dependencies import get_current_user, get_db
    print("✅ Dependencies shim import successful")
except ImportError as e:
    print(f"❌ Dependencies shim failed: {e}")
    sys.exit(1)
