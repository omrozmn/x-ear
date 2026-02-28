import os
import re

file_path = "apps/api/ai/tools/allowlist.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The incorrect keyword argument was `data=...` instead of `result=...` for ToolExecutionResult
content = content.replace("data={", "result={")
content = content.replace("data=None", "result=None")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed data= -> result= in allowlist.py")
