
import requests
import json
import time

BASE_URL = "http://localhost:5003/api"
HEADERS = {"Content-Type": "application/json"}

def login():
    response = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "admin123"}, headers=HEADERS)
    if response.status_code == 200:
        token = response.json()['access_token']
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    raise Exception("Login failed")

def create_patient(headers):
    data = {
        "firstName": "Loaner", "lastName": "Test", "phone": "5551112233",
        "gender": "male", "birthDate": "1990-01-01"
    }
    resp = requests.post(f"{BASE_URL}/patients", json=data, headers=headers)
    if resp.status_code in [201, 409]:
        if resp.status_code == 409:
            # If exists, search for it
            search = requests.get(f"{BASE_URL}/patients/search?q=Loaner", headers=headers)
            return search.json()['data'][0]['id']
        return resp.json()['data']['id']
    raise Exception(f"Create patient failed: {resp.text}")

def create_loaner_inventory(headers):
    # Unique stock code to avoid conflict
    stock_code = f"LOAN-{int(time.time())}"
    data = {
        "name": "Test Loaner", "brand": "Phonak", "model": "Audeo",
        "category": "hearing_aid", "stockCode": stock_code,
        "availableInventory": 0, "availableSerials": [], # Initially empty
        "price": 1000.0,
        "cost": 500.0
    }

    resp = requests.post(f"{BASE_URL}/inventory", json=data, headers=headers)
    if resp.status_code == 201:
        return resp.json()['data']['id']
    raise Exception(f"Create inventory failed: {resp.text}")

def assign_loaner(headers, patient_id, inventory_id):
    # Assign bilateral loaner with manual serials
    assignment_data = {
        "inventoryId": inventory_id, # Can be inventory ID for loaner
        "ear": "bilateral",
        "isLoaner": True,
        "loanerInventoryId": inventory_id,
        "loanerBrand": "Phonak",
        "loanerModel": "Audeo",
        "loanerSerialNumberLeft": "L-MANUAL-1",
        "loanerSerialNumberRight": "R-MANUAL-1",
        "notes": "Testing manual serial addition"
    }
    payload = {
        "device_assignments": [assignment_data],
        "payment_plan": "cash"
    }
    # Using the extended assignment endpoint
    resp = requests.post(f"{BASE_URL}/patients/{patient_id}/assign-devices-extended", json=payload, headers=headers)

    if resp.status_code in [200, 201]:
        return resp.json()
    raise Exception(f"Assign loaner failed: {resp.text}")

def check_inventory_serials(headers, inventory_id):
    resp = requests.get(f"{BASE_URL}/inventory/{inventory_id}", headers=headers)
    if resp.status_code == 200:
        item = resp.json()['data']
        serials = item.get('availableSerials', [])
        print(f"Inventory Serials: {serials}")
        return serials
    raise Exception("Get inventory failed")

def check_assignment_details(headers, patient_id, target_id=None):
    resp = requests.get(f"{BASE_URL}/patients/{patient_id}/devices", headers=headers)
    if resp.status_code == 200:
        devices = resp.json()['data']
        # Find our loaner assignment
        for d in devices:
            # If target_id provided, match it
            if target_id and d.get('id') == target_id:
                print(f"Assignment Details (ID={target_id}): Left={d.get('loanerSerialNumberLeft')}, Right={d.get('loanerSerialNumberRight')}")
                return d
            # Fallback (legacy check)
            if not target_id and d.get('isLoaner'):
                print(f"Assignment Details: Left={d.get('loanerSerialNumberLeft')}, Right={d.get('loanerSerialNumberRight')}")
                return d
    return None

def update_loaner_serials(headers, assignment_id, inv_id):
    print(f"Updating assignment {assignment_id} with NEW manual serials...")
    data = {
        "isLoaner": True,
        "loanerInventoryId": inv_id,
        "loanerSerialNumberLeft": "L-UPDATED-1",
        "loanerSerialNumberRight": "R-UPDATED-1"
    }
    resp = requests.patch(f"{BASE_URL}/device-assignments/{assignment_id}", json=data, headers=headers)
    if resp.status_code == 200:
        print("Update successful")
        return resp.json()['data']
    raise Exception(f"Update failed: {resp.text}")

def main():
    try:
        headers = login()
        print("Logged in")
        
        pat_id = create_patient(headers)
        print(f"Patient ID: {pat_id}")
        
        inv_id = create_loaner_inventory(headers)
        print(f"Inventory ID: {inv_id}")
        
        print("Assigning loaner...")
        assign_resp = assign_loaner(headers, pat_id, inv_id)
        print(f"Assignment Response: {json.dumps(assign_resp, indent=2)}")
        
        print("Checking inventory for new serials...")
        serials = check_inventory_serials(headers, inv_id)
        
        # The manual serials SHOULD be consumed (removed) from inventory now.
        if "L-MANUAL-1" not in serials and "R-MANUAL-1" not in serials:
            print("SUCCESS: Manual serials consumed from inventory (as expected).")
        else:
            print("FAILURE: Manual serials still found in inventory (should be consumed).")
            
        print("Checking assignment details...")
        # Get the assignment ID from the creation response
        created_assign_id = assign_resp['device_assignments'][0]['id']
        assignment = check_assignment_details(headers, pat_id, target_id=created_assign_id)
        
        if assignment and assignment.get('loanerSerialNumberLeft') == "L-MANUAL-1" and assignment.get('loanerSerialNumberRight') == "R-MANUAL-1":
            print("SUCCESS: Assignment has correct bilateral serials!")
        else:
            print("FAILURE: Assignment missing bilateral serials or not found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
