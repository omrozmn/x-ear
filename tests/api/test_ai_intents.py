import pytest
import sys
import os

# Ensure apps/api is in the module search path
api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api'))
if api_path not in sys.path:
    sys.path.append(api_path)

from ai.agents.intent_refiner import IntentRefiner
from ai.schemas.llm_outputs import IntentType

def test_new_crm_intents():
    refiner = IntentRefiner()
    
    # 1. SGK E-Receipt
    res = refiner.classify_without_llm("Bu hastanın e-reçetesi var mı?")
    assert res.intent_type == IntentType.QUERY
    assert res.entities.get("query_type") == "query_sgk_e_receipt"
    
    # 2. SGK Rights
    res = refiner.classify_without_llm("hasta sgk müstahaklık sorgula")
    assert res.intent_type == IntentType.QUERY
    assert res.entities.get("query_type") == "query_sgk_patient_rights"
    
    # 3. Cancel Appointment
    res = refiner.classify_without_llm("randevuyu iptal et")
    assert res.intent_type == IntentType.ACTION
    assert res.entities.get("action_type") == "cancel_appointment"
    
    # 4. Low Stock
    res = refiner.classify_without_llm("kritik stok uyarısı")
    assert res.intent_type == IntentType.QUERY
    assert res.entities.get("query_type") == "get_low_stock_alerts"
    
    # 5. E-Invoice
    res = refiner.classify_without_llm("faturayı gib'e yolla")
    assert res.intent_type == IntentType.ACTION
    assert res.entities.get("action_type") == "generate_and_send_e_invoice"

if __name__ == '__main__':
    pytest.main(["-v", __file__])
