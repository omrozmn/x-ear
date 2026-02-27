#!/usr/bin/env python3
"""Fix imports in test files to use relative imports."""

import re
from pathlib import Path

# Files to fix
test_dir = Path("tests/api_testing")

# Modules that need relative imports
modules = [
    "openapi_parser",
    "endpoint_categorizer",
    "auth_manager",
    "resource_manager",
    "data_generator",
    "path_substitution",
    "test_executor",
    "failure_analyzer",
    "report_generator",
    "cleanup_manager",
    "logging_config",
    "config",
    "schema_data_generator",
]

def fix_imports(file_path: Path):
    """Fix imports in a single file."""
    content = file_path.read_text()
    original = content
    
    for module in modules:
        # Replace "from module import" with "from .module import"
        content = re.sub(
            rf'^from {module} import',
            f'from .{module} import',
            content,
            flags=re.MULTILINE
        )
        
        # Replace "import module" with "from . import module"
        content = re.sub(
            rf'^import {module}$',
            f'from . import {module}',
            content,
            flags=re.MULTILINE
        )
    
    if content != original:
        file_path.write_text(content)
        print(f"✓ Fixed {file_path.name}")
        return True
    return False

# Fix all Python files in test directory
fixed_count = 0
for py_file in test_dir.glob("*.py"):
    if py_file.name.startswith("test_") or py_file.name in [
        "openapi_parser.py",
        "auth_manager.py",
        "data_generator.py",
        "failure_analyzer.py",
        "cleanup_manager.py",
        "path_substitution.py",
        "report_generator.py",
        "test_executor.py",
        "resource_manager.py",
        "cli.py",
        "quick_test.py",
    ]:
        if fix_imports(py_file):
            fixed_count += 1

print(f"\n✓ Fixed {fixed_count} files")
