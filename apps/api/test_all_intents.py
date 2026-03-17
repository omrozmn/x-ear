import requests
from jose import jwt

SECRET_KEY = "super-secret-jwt-key-for-development"
TENANT_ID = "8d9d943f-c774-4ee5-90b1-eed8800deb8d"
USER_ID = "usr_dd3907b0"
# All necessary permissions to not get PERMISSION_DENIED
PERMISSIONS = "parties.create,parties.view,parties.edit,sales.view,sales.create,invoices.write,invoices.view,inventory.view,inventory.edit,appointments.create,appointments.edit,device.assignment,cash.view,cash.create"

token = jwt.encode({"tenant_id": TENANT_ID, "sub": USER_ID}, SECRET_KEY, algorithm="HS256")
headers = {
    "Authorization": f"Bearer {token}",
    "x-user-permissions": PERMISSIONS,
    "Content-Type": "application/json"
}

prompts = [
    "cihaz ata",
    "envanter düzenle",
    "düşük stok",
    "randevu iptal et",
    "satış yap",
    "yeni hasta oluştur",
    "hasta güncelle",
    "kasa durumu",
    "tahsilat yap",
    "fatura kes"
]

print(f"{'Prompt':<25} | {'Intent Type':<15} | {'Action Type':<25} | {'Matched Cap Name'}")
print("-" * 100)

for p in prompts:
    headers["Idempotency-Key"] = f"test-{hash(p)}"
    resp = requests.post("http://localhost:8000/api/ai/chat", json={"prompt": p}, headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        intent = data.get("intent", {})
        itype = intent.get("intent_type", "") if intent else ""
        atype = intent.get("entities", {}).get("action_type", "") if intent and intent.get("entities") else ""
        cap = data.get("matched_capability", {})
        cname = cap.get("name", "") if cap else ""
        print(f"{p:<25} | {itype:<15} | {atype:<25} | {cname}")
    else:
        print(f"{p:<25} | ERROR: {resp.status_code} - {resp.text}")
