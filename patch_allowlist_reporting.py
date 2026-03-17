
file_path = "apps/api/ai/tools/allowlist.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("category=ToolCategory.REPORTING,", "category=ToolCategory.REPORT,")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed REPORTING -> REPORT in allowlist.py")
