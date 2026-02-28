import os
import re

file_path = "apps/api/ai/tools/__init__.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_categories = """class ToolCategory(str, Enum):
    \"\"\"Categories of tools.\"\"\"
    READ = "read"           # Read-only operations
    CONFIG = "config"       # Configuration changes
    REPORT = "report"       # Report generation
    NOTIFICATION = "notification"  # Notifications
    ADMIN = "admin"         # Administrative operations
    USER_DATA = "user_data" # User data management
    ACTION = "action"       # General actions
    INTEGRATION = "integration"  # External integrations"""

content = re.sub(
    r'class ToolCategory\(str, Enum\):\s+"""Categories of tools."""\s+READ = "read"\s+# Read-only operations\s+CONFIG = "config"\s+# Configuration changes\s+REPORT = "report"\s+# Report generation\s+NOTIFICATION = "notification"\s+# Notifications\s+ADMIN = "admin"\s+# Administrative operations',
    new_categories,
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected ToolCategory to __init__.py")
