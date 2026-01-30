import sys
import os

# Add apps/api to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from main import app
    print("App imported successfully")
    
    print("--- Middleware Stack ---")
    for m in app.user_middleware:
        print(f"Middleware: {m}")
        print(f"  Type: {type(m)}")
        try:
            m_tuple = tuple(m)
            print(f"  Tuple length: {len(m_tuple)}")
            print(f"  Tuple content: {m_tuple}")
            cls, options = m
            print(f"  OK: {cls}")
        except ValueError as e:
            print(f"  ERROR: {e}")
    print("-------------------------")

    # This triggers the middleware stack building
    from fastapi.testclient import TestClient
    client = TestClient(app)
    print("TestClient created successfully")
    response = client.get("/health")
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    import traceback
    traceback.print_exc()
