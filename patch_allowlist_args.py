import os
import re

file_path = "apps/api/ai/tools/allowlist.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# For tools added:
tool_names = [
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

for name in tool_names:
    content = content.replace(
        f"return ToolExecutionResult(success=False, result=None, error=",
        f"return ToolExecutionResult(tool_id='{name}', mode=mode, success=False, result=None, error="
    )
    content = content.replace(
        f"return ToolExecutionResult(\n            success=True,\n            result=",
        f"return ToolExecutionResult(\n            tool_id='{name}',\n            mode=mode,\n            success=True,\n            result="
    )
    content = content.replace(
        f"return ToolExecutionResult(\n        success=True,\n        result=",
        f"return ToolExecutionResult(\n        tool_id='{name}',\n        mode=mode,\n        success=True,\n        result="
    )

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed missing tool_id and mode in allowlist.py ToolExecutionResult")
