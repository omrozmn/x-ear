"""
Codemod to insert @idempotent decorators for write endpoints in backend/routes/*.py

This script will:
 - Scan each Python file under backend/routes
 - Find decorator lines with .route(...) that specify methods containing POST/PUT/PATCH/DELETE
 - If the function does not already include @idempotent, insert @idempotent(methods=[...]) after the route decorator
 - Ensure the file imports `idempotent` from `utils.idempotency` if not already imported

Run from repository root with:
  python backend/scripts/add_idempotent_to_routes.py

The script edits files in place and creates a .bak backup for safety.
"""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTES_DIR = ROOT / 'backend' / 'routes'
WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

route_call_re = re.compile(r"\.route\s*\(", flags=re.IGNORECASE)
methods_kw_re = re.compile(r"methods\s*=\s*\[([^\]]*)\]", flags=re.IGNORECASE | re.DOTALL)
string_re = re.compile(r"['\"]([A-Za-z]+)['\"]")

# Tokens indicating authentication decorators — try to insert the idempotency decorator
# after these so user scoping is preserved when possible.
AUTH_DECORATORS = ['jwt_required', 'permission_required', 'login_required', 'permission']
# Tokens indicating transactional/locking decorators — idempotency should be applied
# outside (above) these so it wraps the whole operation.
LOCK_DECORATORS = ['with_transaction', 'optimistic_lock', 'transactional']

modified_files = []

for py in sorted(ROUTES_DIR.glob('*.py')):
    with py.open('r', encoding='utf-8') as f:
        src = f.read()

    lines = src.splitlines(keepends=True)
    changed = False
    inserts = []

    i = 0
    while i < len(lines):
        line = lines[i]
        if '.route(' in line:
            # Collect decorator block up to the next non-decorator non-empty line
            j = i
            block_lines = []
            while j < len(lines) and lines[j].lstrip().startswith('@'):
                block_lines.append(lines[j])
                j += 1

            block_text = ''.join(block_lines)
            # Find methods= [...] in block_text
            m = methods_kw_re.search(block_text)
            if not m:
                # No methods specified -> default GET; skip
                i = j
                continue

            methods_text = m.group(1)
            found_methods = [s.group(1).upper() for s in string_re.finditer(methods_text)]
            write_methods = [m for m in found_methods if m in WRITE_METHODS]
            if not write_methods:
                i = j
                continue

            # Check whether '@idempotent' exists in block_lines
            has_idempotent = any('@idempotent' in bl for bl in block_lines)
            if has_idempotent:
                i = j
                continue

            # Determine insertion index: prefer to insert after route decorator and after
            # any authentication decorators (so idempotency is scoped to the user). But
            # idempotency must be placed before transaction/locking decorators so it
            # wraps the full DB operation. We compute a target index inside the
            # decorator block accordingly.
            # Find indices within block_lines
            route_idx = None
            auth_idx = None
            lock_idx = None
            for k, bl in enumerate(block_lines):
                if '.route(' in bl:
                    route_idx = k
                for t in AUTH_DECORATORS:
                    if t in bl:
                        auth_idx = k
                for t in LOCK_DECORATORS:
                    if t in bl:
                        # choose the earliest locking decorator to insert before
                        if lock_idx is None:
                            lock_idx = k

            # Base target: just after the route decorator if present, else at block start
            if route_idx is not None:
                target_local_idx = route_idx + 1
            else:
                target_local_idx = 0

            # If there is an authentication decorator, prefer to insert after it
            if auth_idx is not None:
                target_local_idx = max(target_local_idx, auth_idx + 1)

            # If there is a locking decorator that appears before the target, move
            # the insertion point to be before the lock decorator so idempotency
            # wraps the transactional/locking decorators.
            if lock_idx is not None and lock_idx < target_local_idx:
                target_local_idx = lock_idx

            insert_idx = i + target_local_idx
            # Build decorator text
            methods_list_repr = ', '.join([f"'{m}'" for m in write_methods])
            decorator_line = f"@idempotent(methods=[{methods_list_repr}])\n"

            inserts.append((insert_idx, decorator_line))
            # Advance pointer
            i = j
        else:
            i += 1

    # Apply inserts in reverse order so indices remain valid
    if inserts:
        # Ensure import is present
        import_present = 'from utils.idempotency import idempotent' in src
        if not import_present:
            # Find first block of imports to insert after
            insert_import_at = 0
            for idx, l in enumerate(lines[:40]):
                if l.startswith('from') or l.startswith('import'):
                    insert_import_at = idx + 1
            lines.insert(insert_import_at, "from utils.idempotency import idempotent\n")
            changed = True

        for idx, deco in reversed(inserts):
            lines.insert(idx, deco)
            changed = True

    if changed:
        # Backup original
        backup_path = py.with_suffix(py.suffix + '.bak')
        if not backup_path.exists():
            py.rename(backup_path)
            new_src = ''.join(lines)
            with py.open('w', encoding='utf-8') as f:
                f.write(new_src)
            modified_files.append(str(py))
        else:
            # If backup exists, just write over
            new_src = ''.join(lines)
            with py.open('w', encoding='utf-8') as f:
                f.write(new_src)
            modified_files.append(str(py))

print(f"Modified {len(modified_files)} files")
for p in modified_files:
    print(f"  - {p}")
