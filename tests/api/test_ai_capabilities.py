import pytest
import sys
import os

# Ensure apps/api is in the module search path
api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api'))
if api_path not in sys.path:
    sys.path.append(api_path)

from ai.tools import get_tool_registry, ToolExecutionMode

def test_mobile_first_capabilities_registered():
    registry = get_tool_registry()
    tools = {t['toolId']: t for t in registry.list_tools(allowed_only=False)}
    
    expected_tools = [
        "get_party_comprehensive_summary",
        "check_appointment_availability",
        "reschedule_appointment",
        "cancel_appointment",
        "get_low_stock_alerts",
        "get_daily_cash_summary",
        "generate_and_send_e_invoice",
        "query_sgk_e_receipt",
        "query_sgk_patient_rights"
    ]
    
    for tool_id in expected_tools:
        assert tool_id in tools, f"Tool {tool_id} not registered in registry"
        
def test_tool_simulate_mode():
    registry = get_tool_registry()
    
    # Test Get Party Summary
    result = registry.execute_tool(
        "get_party_comprehensive_summary", 
        {"party_id": "123"},
        mode=ToolExecutionMode.SIMULATE
    )
    assert result.success is True, f"Operation failed: {result.error}"
    assert "Ahmet Yılmaz" in str(result.result)
    
    # Test Daily Cash Summary
    result = registry.execute_tool(
        "get_daily_cash_summary", 
        {"period": "today"},
        mode=ToolExecutionMode.SIMULATE
    )
    assert result.success is True
    assert result.result["cash_in"] == 15000

if __name__ == '__main__':
    pytest.main(["-v", __file__])
